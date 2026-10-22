import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

export async function getBeneficiaries({ policyId, search }) {
  const where = {}
  if (policyId) where.policyId = policyId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.beneficiary.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      policy: {
        select: {
          id: true,
          policyNumber: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
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

export async function createBeneficiary(data) {
  const policy = await prisma.insurancePolicy.findUnique({
    where: { id: data.policyId },
    include: { beneficiaries: true },
  })
  if (!policy) throw new AppError('Policy not found.', 404)

  // BUSINESS RULE: Beneficiary allocations for a policy must not exceed 100% collectively!
  const currentTotal = policy.beneficiaries.reduce((sum, b) => sum + Number(b.allocationPercentage), 0)
  const newAllocation = Number(data.allocationPercentage)

  if (currentTotal + newAllocation > 100) {
    const remaining = Math.max(0, 100 - currentTotal)
    throw new AppError(
      `Total beneficiary allocation for policy ${policy.policyNumber} cannot exceed 100%. Currently allocated: ${currentTotal}%. Maximum allowable for this beneficiary: ${remaining}%.`,
      400
    )
  }

  return prisma.beneficiary.create({
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    },
    include: { policy: true },
  })
}

export async function updateBeneficiary(id, data) {
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id },
    include: { policy: { include: { beneficiaries: true } } },
  })
  if (!beneficiary) throw new AppError('Beneficiary not found.', 404)

  if (data.allocationPercentage !== undefined) {
    const currentOthersTotal = beneficiary.policy.beneficiaries
      .filter(b => b.id !== id)
      .reduce((sum, b) => sum + Number(b.allocationPercentage), 0)

    const newAllocation = Number(data.allocationPercentage)
    if (currentOthersTotal + newAllocation > 100) {
      const remaining = Math.max(0, 100 - currentOthersTotal)
      throw new AppError(
        `Total allocation cannot exceed 100%. Other beneficiaries have ${currentOthersTotal}%. Maximum allowable: ${remaining}%.`,
        400
      )
    }
  }

  return prisma.beneficiary.update({
    where: { id },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  })
}

export async function deleteBeneficiary(id) {
  return prisma.beneficiary.delete({ where: { id } })
}
