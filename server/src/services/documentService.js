import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateDocumentNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `DOC-${n}`
}

export async function getDocuments({ search, status, type, customerId }) {
  const where = {}
  if (status) where.verificationStatus = status
  if (type) where.documentType = type
  if (customerId) where.customerId = customerId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { documentNumber: { contains: search, mode: 'insensitive' } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.document.findMany({
    where,
    orderBy: { submissionDate: 'desc' },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true } },
      policy: { select: { id: true, policyNumber: true } },
      claim: { select: { id: true, claimNumber: true } },
    },
  })
}

export async function createDocument(data) {
  let documentNumber = generateDocumentNumber()
  let exists = await prisma.document.findUnique({ where: { documentNumber } })
  while (exists) {
    documentNumber = generateDocumentNumber()
    exists = await prisma.document.findUnique({ where: { documentNumber } })
  }

  return prisma.document.create({
    data: {
      ...data,
      documentNumber,
    },
  })
}

export async function updateDocument(id, data) {
  return prisma.document.update({ where: { id }, data })
}
