import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { paginate, pageResult } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

function generatePolicyNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `POL-2025-${n}`
}

export async function getPolicies({ search, status, policyTypeId, customerId, agentId, expiringWithinDays, ...query }) {
  const pg = paginate(query)
  const { skip, take } = pg

  const where = {}
  if (status) where.status = status
  if (policyTypeId) where.policyTypeId = policyTypeId
  if (customerId) where.customerId = customerId
  if (agentId) where.agentId = agentId
  if (expiringWithinDays) {
    const days = Math.min(365, Math.max(1, Number.parseInt(expiringWithinDays, 10) || 60))
    where.expiryDate = { gte: new Date(), lte: new Date(Date.now() + days * 86400000) }
  }
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

  return pageResult(pg, total, policies)
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

// Oversight edits only. Ownership, cover and pricing come from underwriting and are never edited here.
const EDITABLE = ['status', 'companyId', 'agentId']

export async function updatePolicy(id, data, actor = null) {
  const policy = await prisma.insurancePolicy.findUnique({ where: { id } })
  if (!policy) throw new AppError('Policy not found.', 404)
  const safe = Object.fromEntries(Object.entries(data).filter(([k]) => EDITABLE.includes(k)))
  if (Object.keys(safe).length === 0) {
    throw new AppError('Only status, insurer and servicing agent can be changed on an issued policy.', 400)
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.insurancePolicy.update({ where: { id }, data: safe })
    await recordEvent({
      actor,
      action: 'POLICY_UPDATED',
      entityType: 'InsurancePolicy',
      entityId: id,
      customerId: policy.customerId,
      agentId: updated.agentId,
      summary: `Policy ${policy.policyNumber} updated (${Object.keys(safe).join(', ')}).`,
      notifyCustomer: safe.status && safe.status !== policy.status
        ? { title: 'Policy status changed', message: `Policy ${policy.policyNumber} is now ${safe.status.toLowerCase()}.`, link: `/user/policies/${id}` }
        : undefined,
    }, tx)
    return updated
  })
}

export async function deletePolicy(id) {
  const policy = await prisma.insurancePolicy.findUnique({ where: { id } })
  if (!policy) throw new AppError('Policy not found.', 404)
  if (policy.status === 'ACTIVE') {
    throw new AppError('Active policies cannot be deleted. Cancel the policy instead.', 400)
  }
  const [claimCount, paymentCount] = await Promise.all([
    prisma.claim.count({ where: { policyId: id } }),
    prisma.premiumPayment.count({ where: { policyId: id } }),
  ])
  if (claimCount > 0 || paymentCount > 0) {
    throw new AppError('Cannot delete policy with existing financial payments or claim records.', 400)
  }
  return prisma.insurancePolicy.delete({ where: { id } })
}
