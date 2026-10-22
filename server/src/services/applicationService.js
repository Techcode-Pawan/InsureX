import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generateApplicationNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `APP-${n}`
}

function generatePolicyNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `POL-2025-${n}`
}

export async function getApplications({ search, status, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { applicationNumber: { contains: search, mode: 'insensitive' } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      { policyType: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [total, applications] = await Promise.all([
    prisma.insuranceApplication.count({ where }),
    prisma.insuranceApplication.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, email: true } },
        policyType: { select: { id: true, name: true, typeCode: true } },
        policy: { select: { id: true, policyNumber: true, status: true } },
      },
    }),
  ])

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: applications,
  }
}

export async function getApplicationById(id) {
  const app = await prisma.insuranceApplication.findUnique({
    where: { id },
    include: {
      customer: true,
      policyType: true,
      policy: true,
    },
  })
  if (!app) throw new AppError('Application not found.', 404)
  return app
}

export async function createApplication(data) {
  // Validate customer and policyType exist
  const [customer, policyType] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.policyType.findUnique({ where: { id: data.policyTypeId } }),
  ])
  if (!customer) throw new AppError('Referenced customer does not exist.', 400)
  if (!policyType) throw new AppError('Referenced policy type does not exist.', 400)

  let applicationNumber = generateApplicationNumber()
  let exists = await prisma.insuranceApplication.findUnique({ where: { applicationNumber } })
  while (exists) {
    applicationNumber = generateApplicationNumber()
    exists = await prisma.insuranceApplication.findUnique({ where: { applicationNumber } })
  }

  return prisma.insuranceApplication.create({
    data: {
      ...data,
      applicationNumber,
      status: 'PENDING',
    },
    include: {
      customer: true,
      policyType: true,
    },
  })
}

export async function updateApplication(id, data) {
  return prisma.insuranceApplication.update({ where: { id }, data })
}

// Approve Application and issue InsurancePolicy atomically in a transaction
export async function approveApplication(id, approvalData = {}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.insuranceApplication.findUnique({
      where: { id },
      include: { policy: true },
    })

    if (!app) throw new AppError('Application not found.', 404)
    if (app.status === 'APPROVED' || app.policy) {
      throw new AppError('Policy already generated for this application. Duplicate policy creation prohibited.', 400)
    }

    const startDate = approvalData.startDate ? new Date(approvalData.startDate) : new Date()
    const expiryDate = approvalData.expiryDate ? new Date(approvalData.expiryDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    const premiumAmount = approvalData.premiumAmount || (Number(app.requestedCoverage) * 0.015)

    // Generate unique policy number
    let policyNumber = generatePolicyNumber()
    let polExists = await tx.insurancePolicy.findUnique({ where: { policyNumber } })
    while (polExists) {
      policyNumber = generatePolicyNumber()
      polExists = await tx.insurancePolicy.findUnique({ where: { policyNumber } })
    }

    // 1. Create Policy
    const policy = await tx.insurancePolicy.create({
      data: {
        policyNumber,
        applicationId: app.id,
        customerId: app.customerId,
        policyTypeId: app.policyTypeId,
        companyId: approvalData.companyId || null,
        agentId: approvalData.agentId || null,
        sumAssured: app.requestedCoverage,
        premiumAmount,
        premiumFrequency: approvalData.premiumFrequency || 'ANNUALLY',
        startDate,
        expiryDate,
        status: 'ACTIVE',
      },
    })

    // 2. Create Initial Premium Installment
    await tx.premium.create({
      data: {
        premiumNumber: `PRM-${policyNumber.replace('POL-', '')}-01`,
        policyId: policy.id,
        amount: premiumAmount,
        dueDate: startDate,
        status: 'DUE',
      },
    })

    // 3. Update Application Status
    const updatedApp = await tx.insuranceApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewDate: new Date(),
        notes: approvalData.notes || 'Application approved and policy issued.',
      },
      include: {
        policy: true,
        customer: true,
        policyType: true,
      },
    })

    return { application: updatedApp, policy }
  })
}

// Reject Application
export async function rejectApplication(id, { rejectionReason }) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('Rejection reason is required.', 400)
  }

  const app = await prisma.insuranceApplication.findUnique({ where: { id } })
  if (!app) throw new AppError('Application not found.', 404)
  if (app.status === 'APPROVED') {
    throw new AppError('Cannot reject an already approved application.', 400)
  }

  return prisma.insuranceApplication.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewDate: new Date(),
      rejectionReason: rejectionReason.trim(),
    },
  })
}
