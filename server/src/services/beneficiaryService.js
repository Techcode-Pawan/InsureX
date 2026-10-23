import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

export async function getBeneficiaries({ policyId, search }) {
  const where = {}
  if (policyId) where.policyId = policyId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
      { policy: { customer: { firstName: { contains: search, mode: 'insensitive' } } } },
      { policy: { customer: { lastName: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  return prisma.beneficiary.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      policy: {
        select: {
          id: true,
          policyNumber: true,
          status: true,
          customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true } },
          policyType: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function getBeneficiaryById(id) {
  const ben = await prisma.beneficiary.findUnique({
    where: { id },
    include: { policy: true },
  })
  if (!ben) throw new AppError('Beneficiary not found.', 404)
  return ben
}

// Sum of allocations on a policy, excluding one beneficiary (when editing).
async function allocatedOnPolicy(tx, policyId, excludeId) {
  const agg = await tx.beneficiary.aggregate({
    where: { policyId, ...(excludeId && { id: { not: excludeId } }) },
    _sum: { allocationPercentage: true },
  })
  return Number(agg._sum.allocationPercentage || 0)
}

function assertWithinLimit(policyNumber, others, requested) {
  // BUSINESS RULE: Beneficiary allocations for a policy must not exceed 100% collectively.
  if (others + requested > 100) {
    const remaining = Math.max(0, 100 - others)
    throw new AppError(
      `Total beneficiary allocation for policy ${policyNumber} cannot exceed 100%. Currently allocated to others: ${others}%. Maximum allowable for this beneficiary: ${remaining}%.`,
      400
    )
  }
}

export async function createBeneficiary(data) {
  // Serializable so two concurrent additions cannot together exceed 100%.
  return prisma.$transaction(async (tx) => {
    const policy = await tx.insurancePolicy.findUnique({ where: { id: data.policyId } })
    if (!policy) throw new AppError('Policy not found.', 404)
    if (['CANCELLED', 'EXPIRED'].includes(policy.status)) {
      throw new AppError(`Beneficiaries cannot be added to a ${policy.status.toLowerCase()} policy.`, 400)
    }

    assertWithinLimit(policy.policyNumber, await allocatedOnPolicy(tx, policy.id), Number(data.allocationPercentage))

    return tx.beneficiary.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
      include: { policy: true },
    })
  }, { isolationLevel: 'Serializable' })
}

export async function updateBeneficiary(id, data) {
  return prisma.$transaction(async (tx) => {
    const beneficiary = await tx.beneficiary.findUnique({ where: { id }, include: { policy: true } })
    if (!beneficiary) throw new AppError('Beneficiary not found.', 404)

    // A beneficiary stays on its policy; moving between policies would bypass the allocation rule.
    const { policyId, ...rest } = data
    if (policyId && policyId !== beneficiary.policyId) {
      throw new AppError('A beneficiary cannot be moved to another policy. Remove it and add it to the other policy instead.', 400)
    }

    if (rest.allocationPercentage !== undefined) {
      assertWithinLimit(
        beneficiary.policy.policyNumber,
        await allocatedOnPolicy(tx, beneficiary.policyId, id),
        Number(rest.allocationPercentage)
      )
    }

    return tx.beneficiary.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
      },
    })
  }, { isolationLevel: 'Serializable' })
}

export async function deleteBeneficiary(id) {
  const existing = await prisma.beneficiary.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new AppError('Beneficiary not found.', 404)
  return prisma.beneficiary.delete({ where: { id } })
}
