import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

export async function getCompanies({ search, status }) {
  const where = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.insuranceCompany.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { policies: true, agents: true },
      },
    },
  })
}

export async function getCompanyById(id) {
  const company = await prisma.insuranceCompany.findUnique({
    where: { id },
    include: {
      policies: {
        take: 10,
        include: { customer: true, policyType: true },
      },
      agents: true,
    },
  })
  if (!company) throw new AppError('Insurance company not found.', 404)
  return company
}

export async function createCompany(data) {
  return prisma.insuranceCompany.create({ data })
}

export async function updateCompany(id, data) {
  return prisma.insuranceCompany.update({ where: { id }, data })
}
