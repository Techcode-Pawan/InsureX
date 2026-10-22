import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generatePolicyNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `POL-2025-${n}`
}

export async function getPolicies({ search, status, policyTypeId, customerId, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (status) where.status = status
  if (policyTypeId) where.policyTypeId = policyTypeId
  if (customerId) where.customerId = customerId
  if (search) {
    where.OR = [
      { policyNumber: { contains: search, mode: 'insensitive' } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      { policyType: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [total, policies] = await Promise.all([
    prisma.insurancePolicy.count({ where }),
    prisma.insurancePolicy.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, email: true } },
        policyType: { select: { id: true, name: true, typeCode: true } },
        company: { select: { id: true, name: true } },
        agent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } },
      },
    }),
  ])

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: policies,
  }
}

export async function getPolicyById(id) {
  const policy = await prisma.insurancePolicy.findUnique({
    where: { id },
    include: {
      customer: true,
      policyType: true,
      company: true,
      agent: true,
      premiums: { orderBy: { dueDate: 'asc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      beneficiaries: true,
      claims: true,
      renewals: true,
      documents: true,
    },
  })
  if (!policy) throw new AppError('Policy not found.', 404)
  return policy
}

export async function createPolicy(data) {
  // Validate customer & policyType
  const [customer, policyType] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.policyType.findUnique({ where: { id: data.policyTypeId } }),
  ])
  if (!customer) throw new AppError('Customer not found.', 400)
  if (!policyType) throw new AppError('Policy type not found.', 400)

  let policyNumber = generatePolicyNumber()
  let exists = await prisma.insurancePolicy.findUnique({ where: { policyNumber } })
  while (exists) {
    policyNumber = generatePolicyNumber()
    exists = await prisma.insurancePolicy.findUnique({ where: { policyNumber } })
  }

  return prisma.insurancePolicy.create({
    data: {
      ...data,
      policyNumber,
      startDate: new Date(data.startDate),
      expiryDate: new Date(data.expiryDate),
    },
    include: {
      customer: true,
      policyType: true,
    },
  })
}

export async function updatePolicy(id, data) {
  if (data.startDate) data.startDate = new Date(data.startDate)
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate)
  return prisma.insurancePolicy.update({ where: { id }, data })
}

export async function deletePolicy(id) {
  const [claimCount, paymentCount] = await Promise.all([
    prisma.claim.count({ where: { policyId: id } }),
    prisma.premiumPayment.count({ where: { policyId: id } }),
  ])
  if (claimCount > 0 || paymentCount > 0) {
    throw new AppError('Cannot delete policy with existing financial payments or claim records.', 400)
  }
  return prisma.insurancePolicy.delete({ where: { id } })
}
