import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber, paginate, pageResult } from '../lib/common.js'

const AGENT_SUMMARY = { select: { id: true, firstName: true, lastName: true, agentNumber: true, status: true } }

export async function getCustomers({ search, status, assignedAgentId, unassigned, ...query }) {
  const pg = paginate(query)

  const where = {}
  if (status) where.status = status
  if (assignedAgentId) where.assignedAgentId = assignedAgentId
  if (unassigned === 'true') where.assignedAgentId = null
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { customerNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedAgent: AGENT_SUMMARY,
        _count: {
          select: { policies: true, claims: true, applications: true },
        },
      },
    }),
  ])

  return pageResult(pg, total, customers)
}

export async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedAgent: AGENT_SUMMARY,
      user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
      policies: {
        orderBy: { createdAt: 'desc' },
        include: { policyType: { select: { id: true, name: true } }, premiums: { select: { amount: true, paidAmount: true, status: true, dueDate: true } } },
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        include: { policyType: { select: { id: true, name: true } } },
      },
      claims: { orderBy: { claimDate: 'desc' } },
      documents: { orderBy: { submissionDate: 'desc' } },
    },
  })
  if (!customer) throw new AppError('Customer not found.', 404)
  const { documents, ...rest } = customer
  return { ...rest, documents: documents.map(({ fileUrl, ...d }) => ({ ...d, hasFile: Boolean(fileUrl) })) }
}

export async function createCustomer(data) {
  const customerNumber = await uniqueNumber('CUST', 'customer', 'customerNumber')

  return prisma.customer.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      customerNumber,
      dateOfBirth: new Date(data.dateOfBirth),
    },
  })
}

export async function updateCustomer(id, data) {
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth)
  if (data.email) data.email = data.email.toLowerCase()
  return prisma.customer.update({
    where: { id },
    data,
  })
}

// Only records with no business history can be deleted; otherwise deactivate the customer instead.
export async function deleteCustomer(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { policies: true, applications: true, claims: true, documents: true } } },
  })
  if (!customer) throw new AppError('Customer not found.', 404)
  const c = customer._count
  if (c.policies || c.applications || c.claims || c.documents) {
    throw new AppError(
      `Cannot delete ${customer.customerNumber}: it has ${c.policies} policies, ${c.applications} applications, ${c.claims} claims and ${c.documents} documents on record. Set the customer to Inactive instead.`,
      400
    )
  }
  return prisma.customer.delete({ where: { id } })
}
