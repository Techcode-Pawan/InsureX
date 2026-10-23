import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber } from '../lib/common.js'

export async function getAgents({ search, status, region }) {
  const where = {}
  if (status) where.status = status
  if (region) where.region = region
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { agentNumber: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.insuranceAgent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true } },
      _count: {
        select: { policies: true, claims: true, assignedCustomers: true },
      },
    },
  })
}

export async function getAgentById(id) {
  const agent = await prisma.insuranceAgent.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
      assignedCustomers: {
        orderBy: { lastName: 'asc' },
        select: { id: true, customerNumber: true, firstName: true, lastName: true, city: true, status: true, phone: true },
      },
      policies: {
        orderBy: { expiryDate: 'asc' },
        select: {
          id: true, policyNumber: true, status: true, sumAssured: true, premiumAmount: true, expiryDate: true,
          customer: { select: { id: true, firstName: true, lastName: true } }, policyType: { select: { name: true } },
        },
      },
      claims: {
        orderBy: { claimDate: 'desc' },
        select: { id: true, claimNumber: true, status: true, claimedAmount: true, claimDate: true, customer: { select: { id: true, firstName: true, lastName: true } } },
      },
      assistedApplications: {
        orderBy: { applicationDate: 'desc' },
        select: { id: true, applicationNumber: true, status: true, applicationDate: true, requestedCoverage: true, customer: { select: { firstName: true, lastName: true } }, policyType: { select: { name: true } } },
      },
    },
  })
  if (!agent) throw new AppError('Agent not found.', 404)
  return agent
}

export async function createAgent(data) {
  const agentNumber = await uniqueNumber('AGT', 'insuranceAgent', 'agentNumber')
  return prisma.insuranceAgent.create({
    data: { ...data, email: data.email.toLowerCase(), agentNumber },
  })
}

// Deactivating an agent also disables their login and ends their sessions; customers stay assigned
// until an administrator reassigns them.
export async function updateAgent(id, data) {
  if (data.email) data.email = data.email.toLowerCase()
  return prisma.$transaction(async (tx) => {
    const agent = await tx.insuranceAgent.update({ where: { id }, data })
    if (data.status === 'INACTIVE' && agent.userId) {
      await tx.user.update({ where: { id: agent.userId }, data: { isActive: false, tokenVersion: { increment: 1 } } })
    }
    return agent
  })
}
