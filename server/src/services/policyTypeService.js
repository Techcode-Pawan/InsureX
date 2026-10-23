import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

export async function getPolicyTypes({ search, status }) {
  const where = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { typeCode: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.policyType.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { policies: true, applications: true },
      },
    },
  })
}

export async function getPolicyTypeById(id) {
  const type = await prisma.policyType.findUnique({
    where: { id },
    include: {
      policies: {
        take: 10,
        include: { customer: true },
      },
    },
  })
  if (!type) throw new AppError('Policy type not found.', 404)
  return type
}

export async function createPolicyType(data) {
  return prisma.policyType.create({ data })
}

export async function updatePolicyType(id, data) {
  return prisma.policyType.update({ where: { id }, data })
}

export async function deletePolicyType(id) {
  const [linkedPolicies, linkedApplications] = await Promise.all([
    prisma.insurancePolicy.count({ where: { policyTypeId: id } }),
    prisma.insuranceApplication.count({ where: { policyTypeId: id } }),
  ])
  if (linkedPolicies > 0 || linkedApplications > 0) {
    throw new AppError(`Cannot delete this policy type: ${linkedPolicies} policies and ${linkedApplications} applications reference it. Set it to Inactive to stop new applications.`, 400)
  }
  return prisma.policyType.delete({ where: { id } })
}
