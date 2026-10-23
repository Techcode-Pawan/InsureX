import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber, paginate, pageResult } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

const OPEN_CLAIM_STATUSES = ['PENDING', 'UNDER_REVIEW']

export async function getClaims({ search, status, claimType, customerId, ...query }, scope = {}) {
  const pg = paginate(query)

  const where = { AND: [scope] }
  if (status) where.status = status
  if (claimType) where.claimType = claimType
  if (customerId) where.customerId = customerId
  if (search) {
    where.OR = [
      { claimNumber: { contains: search, mode: 'insensitive' } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [total, claims] = await Promise.all([
    prisma.claim.count({ where }),
    prisma.claim.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { claimDate: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, email: true } },
        policy: { select: { id: true, policyNumber: true, sumAssured: true, policyType: { select: { name: true } } } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } },
        processing: true,
      },
    }),
  ])

  return pageResult(pg, total, claims)
}

export async function getClaimById(id, scope = {}) {
  const claim = await prisma.claim.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      customer: true,
      policy: { include: { policyType: true } },
      assignedAgent: true,
      processing: true,
      documents: true,
    },
  })
  if (!claim) throw new AppError('Claim record not found.', 404)
  return claim
}

export async function createClaim(data, actor = null) {
  // 1. Validate customer & policy
  const [customer, policy] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.insurancePolicy.findUnique({ where: { id: data.policyId } }),
  ])
  if (!customer) throw new AppError('Customer not found.', 400)
  if (!policy) throw new AppError('Policy not found.', 400)

  // 2. Validate that the policy belongs to the claim's customer
  if (policy.customerId !== data.customerId) {
    throw new AppError('The referenced policy does not belong to the claiming customer.', 400)
  }

  // 3. Validate policy is active
  if (policy.status !== 'ACTIVE') {
    throw new AppError(`Cannot file claim against policy with status '${policy.status}'. Only active policies are eligible.`, 400)
  }

  // 4. Incident must fall within the policy period and not be in the future
  const claimDate = new Date(data.claimDate)
  if (claimDate > new Date()) throw new AppError('Claim date cannot be in the future.', 400)
  if (claimDate < policy.startDate || claimDate > policy.expiryDate) {
    throw new AppError('The incident date must fall within the policy period.', 400)
  }

  // 5. Validate claim amount does not exceed sum assured
  if (Number(data.claimedAmount) > Number(policy.sumAssured)) {
    throw new AppError(`Claimed amount (₹${data.claimedAmount}) exceeds the policy sum assured (₹${policy.sumAssured}).`, 400)
  }

  const claimNumber = await uniqueNumber('CLM', 'claim', 'claimNumber')
  const assignedAgentId = data.assignedAgentId || null

  return prisma.$transaction(async (tx) => {
    const claim = await tx.claim.create({
      data: {
        claimNumber,
        customerId: data.customerId,
        policyId: data.policyId,
        assignedAgentId,
        claimType: data.claimType,
        claimDate,
        claimedAmount: data.claimedAmount,
        incidentDescription: data.incidentDescription,
        status: 'PENDING',
      },
    })

    // Automatically initialise the ClaimProcessing workflow record
    await tx.claimProcessing.create({
      data: {
        claimId: claim.id,
        assignedAgentId,
        processingStatus: 'AWAITING_REVIEW',
        verificationStatus: 'PENDING',
      },
    })

    await recordEvent({
      actor,
      action: 'CLAIM_SUBMITTED',
      entityType: 'Claim',
      entityId: claim.id,
      customerId: claim.customerId,
      agentId: customer.assignedAgentId,
      summary: `Claim ${claimNumber} submitted against policy ${policy.policyNumber}.`,
      notifyCustomer: { title: 'Claim received', message: `Claim ${claimNumber} has been registered and is awaiting review.`, link: `/user/claims/${claim.id}` },
      notifyAgent: { title: 'Customer filed a claim', message: `${customer.firstName} ${customer.lastName} filed claim ${claimNumber}.`, link: '/agent/claims' },
    }, tx)

    return tx.claim.findUnique({
      where: { id: claim.id },
      include: { customer: true, policy: true, assignedAgent: true, processing: true },
    })
  })
}

async function loadClaimForTransition(claimId) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId }, include: { customer: true } })
  if (!claim) throw new AppError('Claim not found.', 404)
  return claim
}

// Moves a claim between statuses only if it is still in one of the expected states (prevents double processing).
async function transition(tx, claim, fromStatuses, data) {
  const res = await tx.claim.updateMany({ where: { id: claim.id, status: { in: fromStatuses } }, data })
  if (res.count !== 1) throw new AppError('This claim was updated by someone else. Refresh and try again.', 409)
}

// Assign Agent
export async function assignClaimAgent(claimId, agentId, actor = null) {
  const agent = await prisma.insuranceAgent.findUnique({ where: { id: agentId } })
  if (!agent) throw new AppError('Agent not found.', 404)
  const claim = await loadClaimForTransition(claimId)
  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(`Only open claims can be assigned (current status: ${claim.status}).`, 400)
  }

  return prisma.$transaction(async (tx) => {
    await transition(tx, claim, OPEN_CLAIM_STATUSES, { assignedAgentId: agentId, status: 'UNDER_REVIEW' })
    await tx.claimProcessing.update({
      where: { claimId },
      data: { assignedAgentId: agentId, processingStatus: 'UNDER_VERIFICATION' },
    })
    await recordEvent({
      actor,
      action: 'CLAIM_UNDER_REVIEW',
      entityType: 'Claim',
      entityId: claimId,
      customerId: claim.customerId,
      agentId,
      summary: `Claim ${claim.claimNumber} assigned to ${agent.firstName} ${agent.lastName} for review.`,
      notifyCustomer: { title: 'Claim under review', message: `Claim ${claim.claimNumber} is now being reviewed.`, link: `/user/claims/${claimId}` },
      notifyAgent: { title: 'Claim assigned to you', message: `Claim ${claim.claimNumber} has been assigned to you for verification.`, link: '/agent/claims' },
    }, tx)
    return tx.claim.findUnique({ where: { id: claimId } })
  })
}

// Approve Claim
export async function approveClaim(claimId, { approvedAmount, notes }, actor = null) {
  const claim = await loadClaimForTransition(claimId)
  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(`Only open claims can be approved (current status: ${claim.status}).`, 400)
  }

  const approved = Number(approvedAmount)
  if (approved > Number(claim.claimedAmount)) {
    throw new AppError('Approved amount cannot exceed the claimed amount.', 400)
  }

  return prisma.$transaction(async (tx) => {
    await transition(tx, claim, OPEN_CLAIM_STATUSES, { status: 'APPROVED', approvedAmount: approved })
    await tx.claimProcessing.update({
      where: { claimId },
      data: {
        processingStatus: 'APPROVED',
        approvedAmount: approved,
        verificationStatus: 'VERIFIED',
        verificationNotes: notes || 'Claim approved by assessor.',
      },
    })
    await recordEvent({
      actor,
      action: 'CLAIM_APPROVED',
      entityType: 'Claim',
      entityId: claimId,
      customerId: claim.customerId,
      agentId: claim.assignedAgentId || claim.customer.assignedAgentId,
      summary: `Claim ${claim.claimNumber} approved for ₹${approved.toLocaleString('en-IN')}.`,
      notifyCustomer: { title: 'Claim approved', message: `Claim ${claim.claimNumber} was approved for ₹${approved.toLocaleString('en-IN')}. Settlement will follow.`, link: `/user/claims/${claimId}` },
      notifyAgent: { title: 'Claim approved', message: `Claim ${claim.claimNumber} was approved.`, link: '/agent/claims' },
    }, tx)
    return tx.claim.findUnique({ where: { id: claimId } })
  })
}

// Reject Claim
export async function rejectClaim(claimId, { rejectionReason }, actor = null) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('A valid rejection reason is mandatory.', 400)
  }

  const claim = await loadClaimForTransition(claimId)
  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    throw new AppError(`Only open claims can be rejected (current status: ${claim.status}).`, 400)
  }

  return prisma.$transaction(async (tx) => {
    await transition(tx, claim, OPEN_CLAIM_STATUSES, {
      status: 'REJECTED',
      rejectionReason: rejectionReason.trim(),
      approvedAmount: 0,
    })
    await tx.claimProcessing.update({
      where: { claimId },
      data: { processingStatus: 'REJECTED', verificationStatus: 'FAILED', rejectionReason: rejectionReason.trim() },
    })
    await recordEvent({
      actor,
      action: 'CLAIM_REJECTED',
      entityType: 'Claim',
      entityId: claimId,
      customerId: claim.customerId,
      agentId: claim.assignedAgentId || claim.customer.assignedAgentId,
      summary: `Claim ${claim.claimNumber} rejected.`,
      notifyCustomer: { title: 'Claim decision', message: `Claim ${claim.claimNumber} was not approved. Reason: ${rejectionReason.trim()}`, link: `/user/claims/${claimId}` },
      notifyAgent: { title: 'Claim rejected', message: `Claim ${claim.claimNumber} was rejected.`, link: '/agent/claims' },
    }, tx)
    return tx.claim.findUnique({ where: { id: claimId } })
  })
}

// Settle Claim (a claim must be approved before settlement)
export async function settleClaim(claimId, { settlementMethod, transactionRef, settlementDate }, actor = null) {
  const claim = await loadClaimForTransition(claimId)

  if (claim.status !== 'APPROVED') {
    throw new AppError(`Cannot settle claim. Current status is '${claim.status}'. A claim must be approved prior to disbursement settlement.`, 400)
  }

  return prisma.$transaction(async (tx) => {
    await transition(tx, claim, ['APPROVED'], {
      status: 'SETTLED',
      settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
      settlementMethod,
      settlementTransactionRef: transactionRef,
    })
    await tx.claimProcessing.update({ where: { claimId }, data: { processingStatus: 'SETTLED' } })
    await recordEvent({
      actor,
      action: 'CLAIM_SETTLED',
      entityType: 'Claim',
      entityId: claimId,
      customerId: claim.customerId,
      agentId: claim.assignedAgentId || claim.customer.assignedAgentId,
      summary: `Claim ${claim.claimNumber} settled via ${settlementMethod}.`,
      notifyCustomer: { title: 'Claim settled', message: `Claim ${claim.claimNumber} has been settled via ${settlementMethod}.`, link: `/user/claims/${claimId}` },
      notifyAgent: { title: 'Claim settled', message: `Claim ${claim.claimNumber} has been settled.`, link: '/agent/claims' },
    }, tx)
    return tx.claim.findUnique({ where: { id: claimId } })
  })
}

// Claim Processing Queue
export async function getClaimProcessingQueue({ status, ...query }) {
  const pg = paginate(query)

  const where = {}
  if (status) where.processingStatus = status

  const [total, queue] = await Promise.all([
    prisma.claimProcessing.count({ where }),
    prisma.claimProcessing.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { processingDate: 'desc' },
      include: {
        claim: {
          include: {
            customer: true,
            policy: { include: { policyType: true } },
          },
        },
        assignedAgent: true,
      },
    }),
  ])

  return pageResult(pg, total, queue)
}
