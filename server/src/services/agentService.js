import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateAgentNumber() {
  const n = Math.floor(100 + Math.random() * 900)
  return `AGT-${n}`
}

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
        select: { policies: true, claims: true },
      },
    },
  })
}

export async function getAgentById(id) {
  const agent = await prisma.insuranceAgent.findUnique({
    where: { id },
    include: {
      company: true,
      policies: {
        include: { customer: true, policyType: true },
      },
      claims: {
        include: { customer: true },
      },
      claimProcessings: true,
    },
  })
  if (!agent) throw new AppError('Agent not found.', 404)
  return agent
}

export async function createAgent(data) {
  let agentNumber = generateAgentNumber()
  let exists = await prisma.insuranceAgent.findUnique({ where: { agentNumber } })
  while (exists) {
    agentNumber = generateAgentNumber()
    exists = await prisma.insuranceAgent.findUnique({ where: { agentNumber } })
  }

  return prisma.insuranceAgent.create({
    data: {
      ...data,
      agentNumber,
    },
  })
}

export async function updateAgent(id, data) {
  return prisma.insuranceAgent.update({ where: { id }, data })
}
