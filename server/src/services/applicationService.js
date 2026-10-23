import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber, money, addMonths, INSTALLMENTS_PER_YEAR, paginate, pageResult } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

// `scope` is an extra Prisma where-clause injected by role-scoped routes (agent/customer).
export async function getApplications({ search, status, ...query }, scope = {}) {
  const pg = paginate(query)

  const where = { AND: [scope] }
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
      skip: pg.skip,
      take: pg.take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true, email: true } },
        policyType: { select: { id: true, name: true, typeCode: true } },
        policy: { select: { id: true, policyNumber: true, status: true } },
        assistedByAgent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } },
      },
    }),
  ])

  return pageResult(pg, total, applications)
}

export async function getApplicationById(id, scope = {}) {
  const app = await prisma.insuranceApplication.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      customer: true,
      policyType: true,
      policy: true,
      assistedByAgent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } },
    },
  })
  if (!app) throw new AppError('Application not found.', 404)
  return app
}

export async function createApplication(data, actor = null) {
  const [customer, policyType] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.policyType.findUnique({ where: { id: data.policyTypeId } }),
  ])
  if (!customer) throw new AppError('Referenced customer does not exist.', 400)
  if (!policyType) throw new AppError('Referenced policy type does not exist.', 400)
  if (policyType.status !== 'ACTIVE') throw new AppError('This policy type is not currently accepting applications.', 400)
  if (customer.status !== 'ACTIVE') throw new AppError('Applications can only be submitted for active customers.', 400)

  // Duplicate protection: one open application per customer per policy type
  const openApp = await prisma.insuranceApplication.findFirst({
    where: { customerId: data.customerId, policyTypeId: data.policyTypeId, status: 'PENDING' },
    select: { applicationNumber: true },
  })
  if (openApp) {
    throw new AppError(`An application for this plan is already under review (${openApp.applicationNumber}).`, 409)
  }

  const applicationNumber = await uniqueNumber('APP', 'insuranceApplication', 'applicationNumber')

  return prisma.$transaction(async (tx) => {
    const app = await tx.insuranceApplication.create({
      data: { ...data, applicationNumber, status: 'PENDING' },
      include: { customer: true, policyType: true },
    })
    await recordEvent({
      actor,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'InsuranceApplication',
      entityId: app.id,
      customerId: app.customerId,
      agentId: app.assistedByAgentId || customer.assignedAgentId,
      summary: `Application ${app.applicationNumber} submitted for ${policyType.name}.`,
      notifyCustomer: {
        title: 'Application received',
        message: `Application ${app.applicationNumber} for ${policyType.name} is awaiting review.`,
        link: '/user/applications',
      },
      notifyAgent: {
        title: 'New application from your customer',
        message: `${customer.firstName} ${customer.lastName} applied for ${policyType.name} (${app.applicationNumber}).`,
        link: '/agent/applications',
      },
    }, tx)
    return app
  })
}

export async function updateApplication(id, data) {
  const app = await prisma.insuranceApplication.findUnique({ where: { id } })
  if (!app) throw new AppError('Application not found.', 404)
  if (app.status !== 'PENDING') throw new AppError('Only pending applications can be edited.', 400)
  // Ownership and status are never editable through this route
  const { customerId: _c, status: _s, ...safe } = data
  return prisma.insuranceApplication.update({ where: { id }, data: safe })
}

// Approve Application and issue InsurancePolicy atomically in a transaction
export async function approveApplication(id, approvalData = {}, actor = null) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.insuranceApplication.findUnique({
      where: { id },
      include: { policy: true, policyType: true, customer: true },
    })

    if (!app) throw new AppError('Application not found.', 404)
    if (app.status === 'APPROVED' || app.policy) {
      throw new AppError('Policy already generated for this application. Duplicate policy creation prohibited.', 409)
    }
    if (app.status !== 'PENDING') {
      throw new AppError(`Only pending applications can be approved (current status: ${app.status}).`, 400)
    }

    // Atomic state guard: if a concurrent request already moved the application out of PENDING, stop.
    const claimed = await tx.insuranceApplication.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', reviewDate: new Date(), notes: approvalData.notes || app.notes || 'Application approved and policy issued.' },
    })
    if (claimed.count !== 1) {
      throw new AppError('This application was processed by another reviewer. Refresh and try again.', 409)
    }

    const frequency = approvalData.premiumFrequency || 'ANNUALLY'
    const perYear = INSTALLMENTS_PER_YEAR[frequency]
    const startDate = approvalData.startDate ? new Date(approvalData.startDate) : new Date()
    const expiryDate = approvalData.expiryDate ? new Date(approvalData.expiryDate) : addMonths(startDate, 12)
    if (expiryDate <= startDate) throw new AppError('Policy expiry date must be after the start date.', 400)

    // premiumAmount is the amount billed per installment. Default: 1.5% of cover per year, split by frequency.
    const premiumAmount = approvalData.premiumAmount
      ? money(approvalData.premiumAmount)
      : money((Number(app.requestedCoverage) * 0.015) / perYear)

    const policyNumber = await uniqueNumber(`POL-${startDate.getFullYear()}`, 'insurancePolicy', 'policyNumber', tx)
    const agentId = approvalData.agentId || app.assistedByAgentId || app.customer.assignedAgentId || null

    // 1. Create Policy (applicationId is UNIQUE, so a second policy for this application is impossible at DB level)
    const policy = await tx.insurancePolicy.create({
      data: {
        policyNumber,
        applicationId: app.id,
        customerId: app.customerId,
        policyTypeId: app.policyTypeId,
        companyId: approvalData.companyId || null,
        agentId,
        sumAssured: app.requestedCoverage,
        premiumAmount,
        premiumFrequency: frequency,
        startDate,
        expiryDate,
        status: 'ACTIVE',
      },
    })

    // 2. Create the installment schedule for the whole policy term
    const monthsBetween = 12 / perYear
    const schedule = []
    for (let i = 0; ; i++) {
      const due = addMonths(startDate, monthsBetween * i)
      if (due >= expiryDate) break
      schedule.push({
        premiumNumber: `PRM-${policyNumber.replace('POL-', '')}-${String(i + 1).padStart(2, '0')}`,
        policyId: policy.id,
        amount: premiumAmount,
        dueDate: due,
        billingPeriodStart: due,
        billingPeriodEnd: addMonths(startDate, monthsBetween * (i + 1)),
        status: 'DUE',
      })
    }
    await tx.premium.createMany({ data: schedule })

    // 3. Establish the customer-agent servicing relationship if the customer had none
    if (agentId && !app.customer.assignedAgentId) {
      await tx.customer.update({ where: { id: app.customerId }, data: { assignedAgentId: agentId } })
    }

    await recordEvent({
      actor,
      action: 'POLICY_ISSUED',
      entityType: 'InsurancePolicy',
      entityId: policy.id,
      customerId: app.customerId,
      agentId,
      summary: `Application ${app.applicationNumber} approved; policy ${policyNumber} issued.`,
      notifyCustomer: {
        title: 'Your policy has been issued',
        message: `Application ${app.applicationNumber} was approved. Policy ${policyNumber} (${app.policyType.name}) is now active.`,
        link: `/user/policies/${policy.id}`,
      },
      notifyAgent: {
        title: 'Application approved',
        message: `${app.customer.firstName} ${app.customer.lastName}'s application ${app.applicationNumber} was approved. Policy ${policyNumber} issued.`,
        link: `/agent/policies/${policy.id}`,
      },
    }, tx)

    const updatedApp = await tx.insuranceApplication.findUnique({
      where: { id },
      include: { policy: true, customer: true, policyType: true },
    })
    return { application: updatedApp, policy, premiumsScheduled: schedule.length }
  })
}

// Reject Application
export async function rejectApplication(id, { rejectionReason }, actor = null) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError('Rejection reason is required.', 400)
  }

  const app = await prisma.insuranceApplication.findUnique({ where: { id }, include: { customer: true } })
  if (!app) throw new AppError('Application not found.', 404)
  if (app.status !== 'PENDING') {
    throw new AppError(`Only pending applications can be rejected (current status: ${app.status}).`, 400)
  }

  return prisma.$transaction(async (tx) => {
    const res = await tx.insuranceApplication.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewDate: new Date(), rejectionReason: rejectionReason.trim() },
    })
    if (res.count !== 1) throw new AppError('This application was processed by another reviewer.', 409)
    await recordEvent({
      actor,
      action: 'APPLICATION_REJECTED',
      entityType: 'InsuranceApplication',
      entityId: id,
      customerId: app.customerId,
      agentId: app.assistedByAgentId || app.customer.assignedAgentId,
      summary: `Application ${app.applicationNumber} rejected.`,
      notifyCustomer: {
        title: 'Application decision',
        message: `Application ${app.applicationNumber} was not approved. Reason: ${rejectionReason.trim()}`,
        link: '/user/applications',
      },
      notifyAgent: {
        title: 'Application rejected',
        message: `Application ${app.applicationNumber} for ${app.customer.firstName} ${app.customer.lastName} was rejected.`,
        link: '/agent/applications',
      },
    }, tx)
    return tx.insuranceApplication.findUnique({ where: { id } })
  })
}

// Withdrawal of a still-pending application by its customer (or their agent)
export async function cancelApplication(id, actor = null) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.insuranceApplication.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'CANCELLED', reviewDate: new Date() },
    })
    if (res.count !== 1) throw new AppError('Only pending applications can be withdrawn.', 400)
    const app = await tx.insuranceApplication.findUnique({ where: { id } })
    await recordEvent({
      actor,
      action: 'APPLICATION_CANCELLED',
      entityType: 'InsuranceApplication',
      entityId: id,
      customerId: app.customerId,
      agentId: app.assistedByAgentId,
      summary: `Application ${app.applicationNumber} withdrawn.`,
    }, tx)
    return app
  })
}
