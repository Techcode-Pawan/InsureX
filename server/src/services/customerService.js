import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateCustomerNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `CUST-${n}`
}

export async function getCustomers({ search, status, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { customerNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { policies: true, claims: true, applications: true },
        },
      },
    }),
  ])

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: customers,
  }
}

export async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      policies: {
        include: { policyType: true, premiums: true },
      },
      applications: {
        include: { policyType: true },
      },
      claims: true,
      documents: true,
    },
  })
  if (!customer) throw new AppError('Customer not found.', 404)
  return customer
}

export async function createCustomer(data) {
  let customerNumber = generateCustomerNumber()
  let exists = await prisma.customer.findUnique({ where: { customerNumber } })
  while (exists) {
    customerNumber = generateCustomerNumber()
    exists = await prisma.customer.findUnique({ where: { customerNumber } })
  }

  return prisma.customer.create({
    data: {
      ...data,
      customerNumber,
      dateOfBirth: new Date(data.dateOfBirth),
    },
  })
}

export async function updateCustomer(id, data) {
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth)
  return prisma.customer.update({
    where: { id },
    data,
  })
}

export async function deleteCustomer(id) {
  const activePolicies = await prisma.insurancePolicy.count({
    where: { customerId: id, status: 'ACTIVE' },
  })
  if (activePolicies > 0) {
    throw new AppError('Cannot delete customer with active insurance policies.', 400)
  }
  return prisma.customer.delete({ where: { id } })
}
