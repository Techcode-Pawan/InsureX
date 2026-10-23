// Agent workspace API (/api/agent). An agent sees only customers assigned to them (Customer.assignedAgentId)
// plus policies/applications/claims explicitly linked to them. Scope comes from req.user.agentId, which is
// resolved from the database at authentication, never from the request.
import fs from 'fs'
import { Router } from 'express'
import prisma from '../config/db.js'
import { authenticate, authorize, requireAgentProfile } from '../middleware/auth.js'
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
import {
  uuidParam,
  agentCustomerCreateSchema,
  customerContactSchema,
  agentApplicationSchema,
  renewalRequestSchema,
  documentUploadMetaSchema,
  agentDocumentReviewSchema,
} from '../validators/schemas.js'

const router = Router()
router.use(authenticate, authorize('AGENT'), requireAgentProfile)

const idParam = validate({ params: uuidParam })

// ── Scope builders ────────────────────────────────────────────
const customersOf = (req) => ({ assignedAgentId: req.user.agentId })
const viaCustomer = (req) => ({ customer: { assignedAgentId: req.user.agentId } })
const policyScope = (req) => ({ OR: [viaCustomer(req), { agentId: req.user.agentId }] })
const applicationScope = (req) => ({ OR: [viaCustomer(req), { assistedByAgentId: req.user.agentId }] })
const claimScope = (req) => ({ OR: [viaCustomer(req), { assignedAgentId: req.user.agentId }] })

async function assertAssignedCustomer(req, customerId) {
  const c = await prisma.customer.findFirst({ where: { id: customerId, ...customersOf(req) }, select: { id: true } })
  if (!c) throw new AppError('Customer not found.', 404)
}

// Customer fields an agent needs to service the account (no internal ids of other agents, no user account data)
const CUSTOMER_SUMMARY = {
  id: true, customerNumber: true, firstName: true, lastName: true, email: true, phone: true,
  city: true, state: true, status: true, registrationDate: true,
}

// ── Overview ──────────────────────────────────────────────────
router.get('/overview', asyncHandler(async (req, res) => {
  await premiumService.refreshOverduePremiums()
  const agentId = req.user.agentId
  const soon = daysFromNow(30)
  const assignedIds = (await prisma.customer.findMany({ where: customersOf(req), select: { id: true } })).map((c) => c.id)

  const [
    profile, assignedCustomers, applicationsInProgress, approvedApplications, policiesManaged,
    upcomingRenewals, pendingDocuments, followUpPremiums, recentApplications, expiringPolicies, recentActivity,
  ] = await Promise.all([
    prisma.insuranceAgent.findUnique({
      where: { id: agentId },
      select: { firstName: true, lastName: true, agentNumber: true, region: true, specialization: true, company: { select: { name: true } } },
    }),
    prisma.customer.count({ where: customersOf(req) }),
    prisma.insuranceApplication.count({ where: { AND: [applicationScope(req), { status: 'PENDING' }] } }),
    prisma.insuranceApplication.count({ where: { AND: [applicationScope(req), { status: 'APPROVED' }] } }),
    prisma.insurancePolicy.count({ where: { AND: [policyScope(req), { status: 'ACTIVE' }] } }),
    prisma.insurancePolicy.count({ where: { AND: [policyScope(req), renewalService.upcomingExpiryWhere(60)] } }),
    prisma.document.count({ where: { ...viaCustomer(req), verificationStatus: { in: ['PENDING', 'NEEDS_INFO'] } } }),
    prisma.premium.findMany({
      where: { policy: policyScope(req), status: { in: ['OVERDUE', 'DUE', 'PARTIALLY_PAID', 'GRACE_PERIOD'] }, dueDate: { lte: soon } },
      orderBy: { dueDate: 'asc' },
      take: 8,
      select: {
        id: true, premiumNumber: true, amount: true, paidAmount: true, dueDate: true, status: true,
        policy: { select: { id: true, policyNumber: true, customer: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      },
    }),
    prisma.insuranceApplication.findMany({
      where: applicationScope(req),
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true, applicationNumber: true, status: true, applicationDate: true, requestedCoverage: true,
        policyType: { select: { name: true } }, customer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.insurancePolicy.findMany({
      where: { AND: [policyScope(req), renewalService.upcomingExpiryWhere(60)] },
      orderBy: { expiryDate: 'asc' },
      take: 6,
      select: {
        id: true, policyNumber: true, expiryDate: true, premiumAmount: true,
        policyType: { select: { name: true } }, customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        renewals: { where: { status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD', 'RENEWED'] }, newStartDate: { gte: new Date(Date.now() - 86400000 * 31) } }, select: { status: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { OR: [{ agentId }, { customerId: { in: assignedIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, action: true, summary: true, createdAt: true },
    }),
  ])

  res.json({
    success: true,
    data: {
      profile,
      metrics: { assignedCustomers, applicationsInProgress, approvedApplications, policiesManaged, upcomingRenewals, pendingDocuments },
      followUpPremiums: followUpPremiums.map((p) => ({ ...p, remainingBalance: Number(p.amount) - Number(p.paidAmount) })),
      recentApplications,
      expiringPolicies: expiringPolicies.map(({ renewals, ...p }) => ({ ...p, renewalStatus: renewals[0]?.status || null })),
      recentActivity,
    },
  })
}))

// ── Customers ─────────────────────────────────────────────────
router.get('/customers', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 15 })
  const where = { ...customersOf(req) }
  if (req.query.status) where.status = req.query.status
  if (req.query.search) {
    const s = String(req.query.search)
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { customerNumber: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
    ]
  }
  const [total, data] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where, skip: pg.skip, take: pg.take, orderBy: { lastName: 'asc' },
      select: {
        ...CUSTOMER_SUMMARY,
        _count: { select: { policies: { where: { status: 'ACTIVE' } }, applications: { where: { status: 'PENDING' } }, claims: true } },
      },
    }),
  ])
  res.json({ success: true, ...pageResult(pg, total, data) })
}))

router.get('/customers/:id', idParam, asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, ...customersOf(req) },
    select: {
      ...CUSTOMER_SUMMARY,
      dateOfBirth: true, gender: true, address: true, postalCode: true, idProofType: true, maskedIdProofNumber: true,
      policies: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, policyNumber: true, status: true, sumAssured: true, premiumAmount: true, premiumFrequency: true, expiryDate: true, policyType: { select: { name: true } } },
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, applicationNumber: true, status: true, applicationDate: true, requestedCoverage: true, policyType: { select: { name: true } } },
      },
      claims: { orderBy: { claimDate: 'desc' }, select: { id: true, claimNumber: true, status: true, claimedAmount: true, claimDate: true } },
      documents: { orderBy: { submissionDate: 'desc' }, select: { id: true, documentNumber: true, name: true, documentType: true, verificationStatus: true, submissionDate: true, fileUrl: true } },
    },
  })
  if (!customer) throw new AppError('Customer not found.', 404)
  customer.documents = customer.documents.map(({ fileUrl, ...d }) => ({ ...d, hasFile: Boolean(fileUrl) }))
  res.json({ success: true, data: customer })
}))

// Agents may register customers; the new customer is assigned to the registering agent.
router.post('/customers', validate({ body: agentCustomerCreateSchema }), asyncHandler(async (req, res) => {
  const { idProofLast4, dateOfBirth, email, ...rest } = req.body
  const normalisedEmail = email.toLowerCase()
  const exists = await prisma.customer.findUnique({ where: { email: normalisedEmail }, select: { id: true } })
  if (exists) throw new AppError('A customer with this email is already registered. Ask an administrator to reassign them if needed.', 409)

  const customerNumber = await uniqueNumber('CUST', 'customer', 'customerNumber')
  const customer = await prisma.customer.create({
    data: {
      ...rest,
      email: normalisedEmail,
      dateOfBirth: new Date(dateOfBirth),
      customerNumber,
      maskedIdProofNumber: `XXXX-XXXX-${idProofLast4.toUpperCase()}`,
      assignedAgentId: req.user.agentId,
      status: 'ACTIVE',
    },
    select: CUSTOMER_SUMMARY,
  })
  await recordEvent({
    actor: req.user, action: 'CUSTOMER_REGISTERED', entityType: 'Customer', entityId: customer.id,
    customerId: customer.id, agentId: req.user.agentId, summary: `Customer ${customerNumber} registered by agent.`,
  })
  res.status(201).json({ success: true, message: 'Customer registered and assigned to you.', data: customer })
}))

router.patch('/customers/:id', idParam, validate({ body: customerContactSchema }), asyncHandler(async (req, res) => {
  await assertAssignedCustomer(req, req.params.id)
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body, select: CUSTOMER_SUMMARY })
  await recordEvent({
    actor: req.user, action: 'CUSTOMER_CONTACT_UPDATED', entityType: 'Customer', entityId: customer.id,
    customerId: customer.id, agentId: req.user.agentId, summary: `Contact details updated for ${customer.customerNumber}.`,
  })
  res.json({ success: true, message: 'Customer contact details updated.', data: customer })
}))

// ── Applications ──────────────────────────────────────────────
router.get('/applications', asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await applicationService.getApplications(req.query, applicationScope(req))) })
}))

router.get('/applications/:id', idParam, asyncHandler(async (req, res) => {
  const app = await applicationService.getApplicationById(req.params.id, applicationScope(req))
  const { customer, ...rest } = app
  res.json({ success: true, data: { ...rest, customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, customerNumber: customer.customerNumber } } })
}))

router.post('/applications', validate({ body: agentApplicationSchema }), asyncHandler(async (req, res) => {
  await assertAssignedCustomer(req, req.body.customerId)
  const app = await applicationService.createApplication({ ...req.body, assistedByAgentId: req.user.agentId }, req.user)
  res.status(201).json({ success: true, message: 'Application submitted for underwriting review.', data: app })
}))

// ── Policies ──────────────────────────────────────────────────
router.get('/policies', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 15 })
  const where = { AND: [policyScope(req)] }
  if (req.query.status) where.AND.push({ status: req.query.status })
  if (req.query.search) {
    const s = String(req.query.search)
    where.AND.push({ OR: [
      { policyNumber: { contains: s, mode: 'insensitive' } },
      { customer: { firstName: { contains: s, mode: 'insensitive' } } },
      { customer: { lastName: { contains: s, mode: 'insensitive' } } },
    ] })
  }
  const [total, data] = await Promise.all([
    prisma.insurancePolicy.count({ where }),
    prisma.insurancePolicy.findMany({
      where, skip: pg.skip, take: pg.take, orderBy: { expiryDate: 'asc' },
      select: {
        id: true, policyNumber: true, status: true, sumAssured: true, premiumAmount: true, premiumFrequency: true, startDate: true, expiryDate: true,
        policyType: { select: { name: true } }, customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true } },
      },
    }),
  ])
  res.json({ success: true, ...pageResult(pg, total, data) })
}))

router.get('/policies/:id', idParam, asyncHandler(async (req, res) => {
  const policy = await prisma.insurancePolicy.findFirst({
    where: { AND: [{ id: req.params.id }, policyScope(req)] },
    include: {
      policyType: { select: { name: true, typeCode: true, coverageDetails: true } },
      company: { select: { name: true } },
      customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, phone: true, email: true } },
      premiums: { orderBy: { dueDate: 'asc' }, select: { id: true, premiumNumber: true, amount: true, paidAmount: true, dueDate: true, status: true } },
      beneficiaries: { select: { id: true, name: true, relationship: true, allocationPercentage: true } },
      renewals: { orderBy: { newStartDate: 'desc' }, select: { id: true, renewalNumber: true, status: true, newStartDate: true, newExpiryDate: true, renewalPremium: true } },
      claims: { select: { id: true, claimNumber: true, status: true, claimedAmount: true, claimDate: true } },
    },
  })
  if (!policy) throw new AppError('Policy not found.', 404)
  res.json({ success: true, data: policy })
}))

// ── Premium due tracking & payment status (no transaction references or payment notes) ──
router.get('/premiums', asyncHandler(async (req, res) => {
  await premiumService.refreshOverduePremiums()
  const result = await premiumService.getPremiums(req.query, { policy: policyScope(req) })
  result.data = result.data.map(({ payments, ...p }) => ({
    ...p,
    payments: payments.map((pay) => ({ id: pay.id, paymentDate: pay.paymentDate, amount: pay.amount, status: pay.status })),
  }))
  res.json({ success: true, ...result })
}))

// ── Claims (read-only for agents) ─────────────────────────────
router.get('/claims', asyncHandler(async (req, res) => {
  const result = await claimService.getClaims(req.query, claimScope(req))
  result.data = result.data.map(({ processing, customer, settlementTransactionRef: _ref, ...c }) => ({
    ...c,
    customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, customerNumber: customer.customerNumber },
    processingStatus: processing?.processingStatus || null,
  }))
  res.json({ success: true, ...result })
}))

router.get('/claims/:id', idParam, asyncHandler(async (req, res) => {
  const claim = await claimService.getClaimById(req.params.id, claimScope(req))
  const isAssessor = claim.assignedAgentId === req.user.agentId
  const { processing, customer, documents, assignedAgent, settlementTransactionRef: _ref, ...safe } = claim
  res.json({
    success: true,
    data: {
      ...safe,
      // Another agent may be the assessor: expose only their name and agent number
      assignedAgent: assignedAgent && { id: assignedAgent.id, firstName: assignedAgent.firstName, lastName: assignedAgent.lastName, agentNumber: assignedAgent.agentNumber },
      customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, customerNumber: customer.customerNumber, phone: customer.phone },
      processing: processing && {
        processingStatus: processing.processingStatus,
        verificationStatus: processing.verificationStatus,
        documentsVerified: processing.documentsVerified,
        // Internal assessment notes are visible only to the agent assigned to assess this claim
        ...(isAssessor && { verificationNotes: processing.verificationNotes }),
      },
      documents: documents.map(({ fileUrl, ...d }) => ({ ...d, hasFile: Boolean(fileUrl) })),
    },
  })
}))

// ── Renewals ──────────────────────────────────────────────────
router.get('/renewals', asyncHandler(async (req, res) => {
  const [renewals, expiring] = await Promise.all([
    renewalService.getRenewals({ status: req.query.status, search: req.query.search }, { policy: policyScope(req) }),
    prisma.insurancePolicy.findMany({
      where: { AND: [policyScope(req), renewalService.upcomingExpiryWhere(90)] },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, policyNumber: true, expiryDate: true, premiumAmount: true, premiumFrequency: true,
        policyType: { select: { name: true } }, customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        renewals: { where: { status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'] } }, select: { id: true } },
      },
    }),
  ])
  res.json({
    success: true,
    data: {
      renewals,
      opportunities: expiring.filter((p) => p.renewals.length === 0).map(({ renewals: _r, ...p }) => p),
    },
  })
}))

router.post('/renewals', validate({ body: renewalRequestSchema }), asyncHandler(async (req, res) => {
  const owned = await prisma.insurancePolicy.findFirst({ where: { AND: [{ id: req.body.policyId }, policyScope(req)] }, select: { id: true } })
  if (!owned) throw new AppError('Policy not found.', 404)
  const renewal = await renewalService.requestRenewal(req.body, req.user)
  res.status(201).json({ success: true, message: 'Renewal opened for administrator processing.', data: renewal })
}))

// ── Documents ─────────────────────────────────────────────────
router.get('/documents', asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await documentService.getDocuments(req.query, viaCustomer(req))) })
}))

router.post('/documents', (req, res, next) => documentService.uploadSingle(req, res, next), asyncHandler(async (req, res) => {
  const meta = documentUploadMetaSchema.parse(req.body)
  if (!meta.customerId) throw new AppError('Select the customer this document belongs to.', 400)
  try {
    await assertAssignedCustomer(req, meta.customerId)
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {})
    throw err
  }
  const doc = await documentService.createUploadedDocument({ file: req.file, meta, customerId: meta.customerId }, req.user)
  res.status(201).json({ success: true, message: 'Document uploaded for verification.', data: doc })
}))

// Agents can send a document back to the customer for more information; final verification is an admin decision.
router.patch('/documents/:id', idParam, validate({ body: agentDocumentReviewSchema }), asyncHandler(async (req, res) => {
  const doc = await documentService.reviewDocument(req.params.id, req.body, req.user, viaCustomer(req))
  res.json({ success: true, message: 'Customer has been asked for more information.', data: doc })
}))

router.get('/documents/:id/download', idParam, asyncHandler(async (req, res) => {
  const { abs, downloadName } = await documentService.resolveDownload(req.params.id, viaCustomer(req))
  res.download(abs, downloadName)
}))

// ── Performance (own book only) ───────────────────────────────
router.get('/performance', asyncHandler(async (req, res) => {
  const agentId = req.user.agentId
  const since = new Date()
  since.setMonth(since.getMonth() - 5, 1)
  since.setHours(0, 0, 0, 0)

  const [appsByStatus, policiesByType, premiumsCollected, monthly] = await Promise.all([
    prisma.insuranceApplication.groupBy({ by: ['status'], where: applicationScope(req), _count: { id: true } }),
    prisma.insurancePolicy.groupBy({ by: ['policyTypeId'], where: { agentId, status: 'ACTIVE' }, _count: { id: true }, _sum: { sumAssured: true } }),
    prisma.premiumPayment.aggregate({ where: { status: 'SUCCESS', policy: { agentId } }, _sum: { amount: true }, _count: { id: true } }),
    prisma.$queryRaw`
      SELECT to_char(date_trunc('month', p."createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS policies
      FROM "InsurancePolicy" p
      WHERE p."agentId" = ${agentId} AND p."createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
  ])
  const types = await prisma.policyType.findMany({ where: { id: { in: policiesByType.map((p) => p.policyTypeId) } }, select: { id: true, name: true } })
  const total = appsByStatus.reduce((s, a) => s + a._count.id, 0)
  const approved = appsByStatus.find((a) => a.status === 'APPROVED')?._count.id || 0
  const decided = appsByStatus.filter((a) => ['APPROVED', 'REJECTED'].includes(a.status)).reduce((s, a) => s + a._count.id, 0)

  res.json({
    success: true,
    data: {
      applications: { total, byStatus: appsByStatus.map((a) => ({ status: a.status, count: a._count.id })), approvalRate: decided ? Math.round((approved / decided) * 100) : null },
      policiesByType: policiesByType.map((p) => ({ name: types.find((t) => t.id === p.policyTypeId)?.name || 'Unknown', count: p._count.id, sumAssured: Number(p._sum.sumAssured || 0) })),
      premiumsCollected: { amount: Number(premiumsCollected._sum.amount || 0), payments: premiumsCollected._count.id },
      policiesIssuedByMonth: monthly,
    },
  })
}))

export default router
