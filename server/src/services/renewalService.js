import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateRenewalNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `REN-${n}`
}

export async function getRenewals({ status, policyId, search }) {
  const where = {}
  if (status) where.status = status
  if (policyId) where.policyId = policyId
  if (search) {
    where.OR = [
      { renewalNumber: { contains: search, mode: 'insensitive' } },
      { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
      { policy: { customer: { firstName: { contains: search, mode: 'insensitive' } } } },
      { policy: { customer: { lastName: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  return prisma.policyRenewal.findMany({
    where,
    orderBy: { previousExpiryDate: 'asc' },
    include: {
      policy: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true } },
          policyType: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function createRenewal(data) {
  const policy = await prisma.insurancePolicy.findUnique({ where: { id: data.policyId } })
  if (!policy) throw new AppError('Referenced policy does not exist.', 404)

  const newStart = new Date(data.newStartDate)
  const newExpiry = new Date(data.newExpiryDate)

  // BUSINESS RULE: Validate policy and renewal dates
  if (newExpiry <= newStart) {
    throw new AppError('New expiry date must be strictly after the new start date.', 400)
  }

  let renewalNumber = generateRenewalNumber()
  let exists = await prisma.policyRenewal.findUnique({ where: { renewalNumber } })
  while (exists) {
    renewalNumber = generateRenewalNumber()
    exists = await prisma.policyRenewal.findUnique({ where: { renewalNumber } })
  }

  return prisma.policyRenewal.create({
    data: {
      ...data,
      renewalNumber,
      previousExpiryDate: policy.expiryDate,
      newStartDate: newStart,
      newExpiryDate: newExpiry,
      status: 'UPCOMING',
    },
    include: { policy: true },
  })
}

export async function updateRenewal(id, data) {
  return prisma.$transaction(async (tx) => {
    const renewal = await tx.policyRenewal.findUnique({ where: { id } })
    if (!renewal) throw new AppError('Renewal not found.', 404)

    const updated = await tx.policyRenewal.update({
      where: { id },
      data,
    })

    // If marked as renewed, extend the policy expiryDate!
    if (data.status === 'RENEWED') {
      await tx.insurancePolicy.update({
        where: { id: renewal.policyId },
        data: {
          expiryDate: renewal.newExpiryDate,
          status: 'ACTIVE',
        },
      })
    }

    return updated
  })
}
