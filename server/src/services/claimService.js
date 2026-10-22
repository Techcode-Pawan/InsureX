import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateClaimNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `CLM-${n}`
}

export async function getClaims({ search, status, claimType, customerId, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
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
      skip,
      take,
      orderBy: { claimDate: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, email: true } },
        policy: { select: { id: true, policyNumber: true, sumAssured: true, policyType: { select: { name: true } } } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } },
        processing: true,
      },
    }),
  ])

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: claims,
  }
}

export async function getClaimById(id) {
  const claim = await prisma.claim.findUnique({
    where: { id },
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

export async function createClaim(data) {
  // 1. Validate customer & policy
  const [customer, policy] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.insurancePolicy.findUnique({ where: { id: data.policyId } }),
  ])
  if (!customer) throw new AppError('Customer not found.', 400)
  if (!policy) throw new AppError('Policy not found.', 400)

  // 2. Validate that the policy belongs to the claim's customer!
  if (policy.customerId !== data.customerId) {
    throw new AppError('The referenced policy does not belong to the claiming customer.', 400)
  }

  // 3. Validate policy is active
  if (policy.status !== 'ACTIVE') {
    throw new AppError(`Cannot file claim against policy with status '${policy.status}'. Only active policies are eligible.`, 400)
  }

  // 4. Validate claim amount does not exceed sum assured
  if (Number(data.claimedAmount) > Number(policy.sumAssured)) {
    throw new AppError(`Claimed amount (₹${data.claimedAmount}) exceeds the policy sum assured (₹${policy.sumAssured}).`, 400)
  }

  let claimNumber = generateClaimNumber()
  let exists = await prisma.claim.findUnique({ where: { claimNumber } })
  while (exists) {
    claimNumber = generateClaimNumber()
    exists = await prisma.claim.findUnique({ where: { claimNumber } })
  }

  return prisma.$transaction(async (tx) => {
    const claim = await tx.claim.create({
      data: {
        claimNumber,
        customerId: data.customerId,
        policyId: data.policyId,
        assignedAgentId: data.assignedAgentId || null,
        claimType: data.claimType,
        claimDate: new Date(data.claimDate),
        claimedAmount: data.claimedAmount,
        incidentDescription: data.incidentDescription,
        status: 'PENDING',
      },
    })

    // Automatically initialize ClaimProcessing workflow record
    await tx.claimProcessing.create({
      data: {
        claimId: claim.id,
        assignedAgentId: data.assignedAgentId || null,
        processingStatus: 'AWAITING_REVIEW',
        verificationStatus: 'PENDING',
      },
    })

    return tx.claim.findUnique({
      where: { id: claim.id },
      include: {
        customer: true,
        policy: true,
        assignedAgent: true,
        processing: true,
      },
    })
  })
}

// Assign Agent
export async function assignClaimAgent(claimId, agentId) {
  const agent = await prisma.insuranceAgent.findUnique({ where: { id: agentId } })
  if (!agent) throw new AppError('Agent not found.', 404)

  return prisma.$transaction(async (tx) => {
    const claim = await tx.claim.update({
      where: { id: claimId },
      data: {
        assignedAgentId: agentId,
        status: 'UNDER_REVIEW',
      },
    })

    await tx.claimProcessing.update({
      where: { claimId },
      data: {
        assignedAgentId: agentId,
        processingStatus: 'UNDER_VERIFICATION',
      },
    })

    return claim
  })
}

// Approve Claim
export async function approveClaim(claimId, { approvedAmount, notes }) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } })
  if (!claim) throw new AppError('Claim not found.', 404)
  if (claim.status === 'SETTLED') throw new AppError('Claim has already been settled.', 400)

  const approved = Number(approvedAmount)
  if (approved > Number(claim.claimedAmount)) {
    throw new AppError('Approved amount cannot exceed the claimed amount.', 400)
  }

  return prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        approvedAmount: approved,
      },
    })

    await tx.claimProcessing.update({
      where: { claimId },
      data: {
        processingStatus: 'APPROVED',
        approvedAmount: approved,
        verificationStatus: 'VERIFIED',
        verificationNotes: notes || 'Claim approved by assessor.',
      },
    })

    return updatedClaim
  })
}

// Reject Claim
export async function rejectClaim(claimId, { rejectionReason }) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('A valid rejection reason is mandatory.', 400)
  }

  const claim = await prisma.claim.findUnique({ where: { id: claimId } })
  if (!claim) throw new AppError('Claim not found.', 404)
  if (claim.status === 'SETTLED') throw new AppError('Cannot reject an already settled claim.', 400)

  return prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        approvedAmount: 0,
      },
    })

    await tx.claimProcessing.update({
      where: { claimId },
      data: {
        processingStatus: 'REJECTED',
        verificationStatus: 'FAILED',
        rejectionReason: rejectionReason.trim(),
      },
    })

    return updatedClaim
  })
}

// Settle Claim (CRITICAL: Must not settle before approval!)
export async function settleClaim(claimId, { settlementMethod, transactionRef, settlementDate }) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } })
  if (!claim) throw new AppError('Claim not found.', 404)

  // BUSINESS RULE: A claim must not be settled before approval!
  if (claim.status !== 'APPROVED') {
    throw new AppError(`Cannot settle claim. Current status is '${claim.status}'. A claim must be approved prior to disbursement settlement.`, 400)
  }

  return prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data: {
        status: 'SETTLED',
        settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
        settlementMethod,
        settlementTransactionRef: transactionRef,
      },
    })

    await tx.claimProcessing.update({
      where: { claimId },
      data: {
        processingStatus: 'SETTLED',
      },
    })

    return updatedClaim
  })
}

// Claim Processing Queue
export async function getClaimProcessingQueue({ status, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (status) where.processingStatus = status

  const [total, queue] = await Promise.all([
    prisma.claimProcessing.count({ where }),
    prisma.claimProcessing.findMany({
      where,
      skip,
      take,
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

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: queue,
  }
}
