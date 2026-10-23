// Customer self-service API (/api/me). Every query is pinned to req.user.customerId, which is
// resolved server-side from the authenticated login. IDs in the URL or body can never widen it.
import { Router } from 'express'
import prisma from '../config/db.js'
import { authenticate, authorize, requireCustomerProfile } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { uniqueNumber, paginate, pageResult, daysFromNow } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'
import * as applicationService from '../services/applicationService.js'
import * as claimService from '../services/claimService.js'
import * as premiumService from '../services/premiumService.js'
import * as renewalService from '../services/renewalService.js'
import * as documentService from '../services/documentService.js'
import * as beneficiaryService from '../services/beneficiaryService.js'
import {
  uuidParam,
  customerProfileSchema,
  customerContactSchema,
  selfApplicationSchema,
  selfClaimSchema,
  selfBeneficiaryCreateSchema,
  selfBeneficiaryUpdateSchema,
  paymentSubmissionSchema,
  renewalRequestSchema,
  documentUploadMetaSchema,
} from '../validators/schemas.js'

const router = Router()
router.use(authenticate, authorize('CUSTOMER'))

const own = (req) => ({ customerId: req.user.customerId })
const ownViaPolicy = (req) => ({ policy: { customerId: req.user.customerId } })
const idParam = validate({ params: uuidParam })

// Agent details a customer may see about their servicing agent (no commission, rating, licence, etc.)
const PUBLIC_AGENT = { select: { firstName: true, lastName: true, agentNumber: true, email: true, phone: true } }

// ── Profile ───────────────────────────────────────────────────
router.get('/profile', asyncHandler(async (req, res) => {
  if (!req.user.customerId) return res.json({ success: true, data: null })
  const profile = await prisma.customer.findUnique({
    where: { id: req.user.customerId },
    include: { assignedAgent: PUBLIC_AGENT },
  })
  res.json({ success: true, data: profile })
}))

router.post('/profile', validate({ body: customerProfileSchema }), asyncHandler(async (req, res) => {
  if (req.user.customerId) throw new AppError('Your customer profile already exists.', 409)

  // A record with this email may have been created by staff. Matching email alone does not prove
  // the person signing in owns it, so we never auto-link; staff link it after verifying identity.
  const existing = await prisma.customer.findUnique({ where: { email: req.user.email }, select: { userId: true } })
  if (existing) {
    throw new AppError('A customer record with your email already exists. For your security, please ask your agent or InsureX support to verify your identity and link it to this login.', 409)
  }

  const { idProofLast4, dateOfBirth, ...rest } = req.body
  const dob = new Date(dateOfBirth)
  const age = (Date.now() - dob.getTime()) / (365.25 * 86400000)
  if (age < 18 || age > 100) throw new AppError('Policyholders must be between 18 and 100 years old.', 400)

  const customerNumber = await uniqueNumber('CUST', 'customer', 'customerNumber')
  const profile = await prisma.customer.create({
    data: {
      ...rest,
      dateOfBirth: dob,
      email: req.user.email,
      customerNumber,
      userId: req.user.id,
      maskedIdProofNumber: `XXXX-XXXX-${idProofLast4.toUpperCase()}`,
      status: 'ACTIVE',
    },
  })
  await recordEvent({
    actor: req.user, action: 'CUSTOMER_REGISTERED', entityType: 'Customer', entityId: profile.id,
    customerId: profile.id, summary: `Customer ${customerNumber} completed self-registration.`,
  })
  res.status(201).json({ success: true, message: 'Profile created.', data: profile })
}))

router.patch('/profile', requireCustomerProfile, validate({ body: customerContactSchema }), asyncHandler(async (req, res) => {
  const profile = await prisma.customer.update({ where: { id: req.user.customerId }, data: req.body })
  res.json({ success: true, message: 'Contact details updated.', data: profile })
}))

// Everything below requires a linked customer profile
router.use(requireCustomerProfile)

// ── Overview (dashboard) ──────────────────────────────────────
router.get('/overview', asyncHandler(async (req, res) => {
  const customerId = req.user.customerId
  await premiumService.refreshOverduePremiums()
  const [profile, activePolicies, nextPremiums, pendingApplications, openClaims, renewalsDue, expiringPolicies, recentActivity] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, customerNumber: true, status: true, assignedAgent: PUBLIC_AGENT },
    }),
    prisma.insurancePolicy.findMany({
      where: { customerId, status: 'ACTIVE' },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, policyNumber: true, sumAssured: true, premiumAmount: true, premiumFrequency: true,
        startDate: true, expiryDate: true, status: true, policyType: { select: { name: true, typeCode: true } },
      },
    }),
    prisma.premium.findMany({
      where: { policy: { customerId }, status: { in: ['DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD'] } },
      orderBy: { dueDate: 'asc' },
      take: 4,
      include: { policy: { select: { id: true, policyNumber: true, policyType: { select: { name: true } } } } },
    }),
    prisma.insuranceApplication.findMany({
      where: { customerId, status: 'PENDING' },
      orderBy: { applicationDate: 'desc' },
      select: { id: true, applicationNumber: true, applicationDate: true, requestedCoverage: true, status: true, policyType: { select: { name: true } } },
    }),
    prisma.claim.findMany({
      where: { customerId, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] } },
      orderBy: { claimDate: 'desc' },
      select: { id: true, claimNumber: true, claimType: true, claimedAmount: true, approvedAmount: true, status: true, claimDate: true, processing: { select: { processingStatus: true } } },
    }),
    prisma.policyRenewal.findMany({
      where: { policy: { customerId }, status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'] } },
      orderBy: { newStartDate: 'asc' },
      select: { id: true, renewalNumber: true, newStartDate: true, renewalPremium: true, status: true, policy: { select: { policyNumber: true } } },
    }),
    prisma.insurancePolicy.findMany({
      where: { customerId, status: 'ACTIVE', expiryDate: { lte: daysFromNow(renewalService.RENEWAL_WINDOW_DAYS_BEFORE) } },
      select: { id: true, policyNumber: true, expiryDate: true, policyType: { select: { name: true } }, renewals: { where: { status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'] } }, select: { id: true } } },
    }),
    prisma.activityLog.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, action: true, summary: true, createdAt: true },
    }),
  ])
  const [beneficiaryCount, documentsNeedingAction, pendingPayments] = await Promise.all([
    prisma.beneficiary.count({ where: { policy: { customerId } } }),
    prisma.document.findMany({
      where: { customerId, verificationStatus: { in: ['NEEDS_INFO', 'REJECTED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, documentNumber: true, verificationStatus: true, verificationNotes: true },
    }),
    prisma.premiumPayment.aggregate({ where: { policy: { customerId }, status: 'PENDING' }, _count: { id: true }, _sum: { amount: true } }),
  ])

  res.json({
    success: true,
    data: {
      profile,
      activePolicies,
      totalCover: activePolicies.reduce((s, p) => s + Number(p.sumAssured), 0),
      upcomingPremiums: nextPremiums.map((p) => ({ ...p, remainingBalance: Number(p.amount) - Number(p.paidAmount) })),
      pendingApplications,
      openClaims,
      renewalsDue,
      renewalOpportunities: expiringPolicies.filter((p) => p.renewals.length === 0).map(({ renewals: _r, ...p }) => p),
      recentActivity,
      beneficiaryCount,
      documentsNeedingAction,
      pendingPayments: { count: pendingPayments._count.id, amount: Number(pendingPayments._sum.amount || 0) },
    },
  })
}))

// ── Applications ──────────────────────────────────────────────
router.get('/applications', asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await applicationService.getApplications(req.query, own(req))) })
}))

router.get('/applications/:id', idParam, asyncHandler(async (req, res) => {
  const app = await applicationService.getApplicationById(req.params.id, own(req))
  const { notes: _internal, customer: _c, ...safe } = app
  res.json({ success: true, data: safe })
}))

router.post('/applications', validate({ body: selfApplicationSchema }), asyncHandler(async (req, res) => {
  const app = await applicationService.createApplication({ ...req.body, customerId: req.user.customerId }, req.user)
  res.status(201).json({ success: true, message: 'Application submitted.', data: app })
}))

router.post('/applications/:id/cancel', idParam, asyncHandler(async (req, res) => {
  await applicationService.getApplicationById(req.params.id, own(req)) // ownership check (404 otherwise)
  const app = await applicationService.cancelApplication(req.params.id, req.user)
  res.json({ success: true, message: 'Application withdrawn.', data: app })
}))

// ── Policies ──────────────────────────────────────────────────
router.get('/policies', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 })
  const where = { customerId: req.user.customerId, ...(req.query.status && { status: req.query.status }) }
  const [total, data] = await Promise.all([
    prisma.insurancePolicy.count({ where }),
    prisma.insurancePolicy.findMany({
      where, skip: pg.skip, take: pg.take, orderBy: { createdAt: 'desc' },
      include: {
        policyType: { select: { id: true, name: true, typeCode: true } },
        company: { select: { name: true } },
      },
    }),
  ])
  res.json({ success: true, ...pageResult(pg, total, data) })
}))

router.get('/policies/:id', idParam, asyncHandler(async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id, customerId: req.user.customerId },
    include: {
      policyType: true,
      company: { select: { name: true, phone: true, email: true, website: true } },
      agent: PUBLIC_AGENT,
      premiums: { orderBy: { dueDate: 'asc' } },
      beneficiaries: { select: { id: true, name: true, relationship: true, allocationPercentage: true } },
      renewals: { orderBy: { newStartDate: 'desc' } },
      claims: { select: { id: true, claimNumber: true, status: true, claimedAmount: true, claimDate: true } },
      customer: { select: { firstName: true, lastName: true, customerNumber: true, address: true, city: true, state: true, postalCode: true } },
    },
  })
  if (!policy) throw new AppError('Policy not found.', 404)
  res.json({
    success: true,
    data: { ...policy, premiums: policy.premiums.map((p) => ({ ...p, remainingBalance: Number(p.amount) - Number(p.paidAmount) })) },
  })
}))

// ── Premiums & payments ───────────────────────────────────────
router.get('/premiums', asyncHandler(async (req, res) => {
  await premiumService.refreshOverduePremiums()
  res.json({ success: true, ...(await premiumService.getPremiums(req.query, ownViaPolicy(req))) })
}))

router.get('/payments', asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await premiumService.getPayments(req.query, ownViaPolicy(req))) })
}))

router.get('/payments/:id', idParam, asyncHandler(async (req, res) => {
  const payment = await prisma.premiumPayment.findFirst({
    where: { id: req.params.id, policy: { customerId: req.user.customerId } },
    include: {
      premium: { select: { premiumNumber: true, dueDate: true, amount: true, paidAmount: true, billingPeriodStart: true, billingPeriodEnd: true } },
      policy: { select: { policyNumber: true, policyType: { select: { name: true } }, customer: { select: { firstName: true, lastName: true, customerNumber: true } } } },
    },
  })
  if (!payment) throw new AppError('Payment not found.', 404)
  res.json({ success: true, data: payment })
}))

router.get('/payment-gateway', (req, res) => {
  res.json({ success: true, data: premiumService.getGatewayStatus() })
})

router.post('/payments', validate({ body: paymentSubmissionSchema }), asyncHandler(async (req, res) => {
  const owned = await prisma.premium.findFirst({ where: { id: req.body.premiumId, ...ownViaPolicy(req) }, select: { id: true } })
  if (!owned) throw new AppError('Premium not found.', 404)
  const result = await premiumService.submitPayment(req.body, req.user)
  res.status(201).json({
    success: true,
    message: 'Payment submitted. It will be applied to your balance once verified against bank records.',
    data: result,
  })
}))

// ── Claims ────────────────────────────────────────────────────
router.get('/claims', asyncHandler(async (req, res) => {
  const result = await claimService.getClaims(req.query, own(req))
  // Customers see processing stage, not internal verification notes or agent details
  result.data = result.data.map(({ processing, assignedAgent: _a, customer: _c, ...c }) => ({
    ...c, processingStatus: processing?.processingStatus || null,
  }))
  res.json({ success: true, ...result })
}))

router.get('/claims/:id', idParam, asyncHandler(async (req, res) => {
  const claim = await claimService.getClaimById(req.params.id, own(req))
  const { processing, assignedAgent: _a, customer: _c, documents, ...safe } = claim
  res.json({
    success: true,
    data: {
      ...safe,
      processing: processing && {
        processingStatus: processing.processingStatus,
        verificationStatus: processing.verificationStatus,
        documentsVerified: processing.documentsVerified,
        updatedAt: processing.updatedAt,
      },
      documents: documents.map(({ fileUrl, verifiedBy: _v, ...d }) => ({ ...d, hasFile: Boolean(fileUrl) })),
    },
  })
}))

router.post('/claims', validate({ body: selfClaimSchema }), asyncHandler(async (req, res) => {
  // Same 404 as a non-existent policy, so other customers' policy ids cannot be probed
  const owned = await prisma.insurancePolicy.findFirst({ where: { id: req.body.policyId, customerId: req.user.customerId }, select: { id: true } })
  if (!owned) throw new AppError('Policy not found.', 404)
  const claim = await claimService.createClaim({ ...req.body, customerId: req.user.customerId }, req.user)
  res.status(201).json({ success: true, message: 'Claim submitted.', data: { id: claim.id, claimNumber: claim.claimNumber, status: claim.status } })
}))

// ── Beneficiaries (customers manage nominees on their own active policies) ──
const BENEFICIARY_PUBLIC = {
  id: true, name: true, relationship: true, allocationPercentage: true, phone: true, email: true, dateOfBirth: true,
  policy: { select: { id: true, policyNumber: true, status: true, policyType: { select: { name: true } } } },
}

router.get('/beneficiaries', asyncHandler(async (req, res) => {
  const data = await prisma.beneficiary.findMany({ where: ownViaPolicy(req), orderBy: { createdAt: 'asc' }, select: BENEFICIARY_PUBLIC })
  res.json({ success: true, data })
}))

async function ownBeneficiary(req) {
  const b = await prisma.beneficiary.findFirst({ where: { id: req.params.id, ...ownViaPolicy(req) }, select: { id: true, name: true, policyId: true } })
  if (!b) throw new AppError('Beneficiary not found.', 404)
  return b
}

router.post('/beneficiaries', validate({ body: selfBeneficiaryCreateSchema }), asyncHandler(async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({ where: { id: req.body.policyId, customerId: req.user.customerId }, select: { id: true, policyNumber: true } })
  if (!policy) throw new AppError('Policy not found.', 404)
  const b = await beneficiaryService.createBeneficiary(req.body) // enforces active policy + 100% allocation rule
  await recordEvent({ actor: req.user, action: 'BENEFICIARY_ADDED', entityType: 'Beneficiary', entityId: b.id, customerId: req.user.customerId, summary: `Beneficiary added to policy ${policy.policyNumber}.` })
  res.status(201).json({ success: true, message: 'Beneficiary added.', data: await prisma.beneficiary.findUnique({ where: { id: b.id }, select: BENEFICIARY_PUBLIC }) })
}))

router.put('/beneficiaries/:id', idParam, validate({ body: selfBeneficiaryUpdateSchema }), asyncHandler(async (req, res) => {
  const b = await ownBeneficiary(req)
  await beneficiaryService.updateBeneficiary(b.id, req.body)
  await recordEvent({ actor: req.user, action: 'BENEFICIARY_UPDATED', entityType: 'Beneficiary', entityId: b.id, customerId: req.user.customerId, summary: `Beneficiary ${b.name} updated.` })
  res.json({ success: true, message: 'Beneficiary updated.', data: await prisma.beneficiary.findUnique({ where: { id: b.id }, select: BENEFICIARY_PUBLIC }) })
}))

router.delete('/beneficiaries/:id', idParam, asyncHandler(async (req, res) => {
  const b = await ownBeneficiary(req)
  await beneficiaryService.deleteBeneficiary(b.id)
  await recordEvent({ actor: req.user, action: 'BENEFICIARY_REMOVED', entityType: 'Beneficiary', entityId: b.id, customerId: req.user.customerId, summary: `Beneficiary ${b.name} removed.` })
  res.json({ success: true, message: 'Beneficiary removed.' })
}))

// ── Documents ─────────────────────────────────────────────────
router.get('/documents', asyncHandler(async (req, res) => {
  const result = await documentService.getDocuments(req.query, own(req))
  result.data = result.data.map(({ verifiedBy: _v, customer: _c, ...d }) => d)
  res.json({ success: true, ...result })
}))

router.post('/documents', (req, res, next) => documentService.uploadSingle(req, res, next), asyncHandler(async (req, res) => {
  const meta = documentUploadMetaSchema.parse(req.body)
  const doc = await documentService.createUploadedDocument({ file: req.file, meta, customerId: req.user.customerId }, req.user)
  res.status(201).json({ success: true, message: 'Document uploaded for verification.', data: doc })
}))

router.get('/documents/:id/download', idParam, asyncHandler(async (req, res) => {
  const { abs, downloadName } = await documentService.resolveDownload(req.params.id, own(req))
  res.download(abs, downloadName)
}))

// ── Renewals ──────────────────────────────────────────────────
router.get('/renewals', asyncHandler(async (req, res) => {
  const data = await renewalService.getRenewals({ status: req.query.status }, ownViaPolicy(req))
  res.json({ success: true, data: data.map(({ policy: { customer: _c, ...p }, ...r }) => ({ ...r, policy: p })) })
}))

router.post('/renewals', validate({ body: renewalRequestSchema }), asyncHandler(async (req, res) => {
  const owned = await prisma.insurancePolicy.findFirst({ where: { id: req.body.policyId, customerId: req.user.customerId }, select: { id: true } })
  if (!owned) throw new AppError('Policy not found.', 404)
  const renewal = await renewalService.requestRenewal(req.body, req.user)
  res.status(201).json({ success: true, message: 'Renewal requested.', data: renewal })
}))

export default router
