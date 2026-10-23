import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber, addMonths, daysFromNow, money, INSTALLMENTS_PER_YEAR } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

const OPEN_RENEWAL_STATUSES = ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD']
// Customers may request renewal from 60 days before expiry until 30 days after it (grace window).
export const RENEWAL_WINDOW_DAYS_BEFORE = 60
export const RENEWAL_GRACE_DAYS_AFTER = 30

export async function getRenewals({ status, policyId, search }, scope = {}) {
  const where = { AND: [scope] }
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
    take: 200,
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

async function assertNoOpenRenewal(client, policyId) {
  const open = await client.policyRenewal.findFirst({
    where: { policyId, status: { in: OPEN_RENEWAL_STATUSES } },
    select: { renewalNumber: true },
  })
  if (open) throw new AppError(`A renewal (${open.renewalNumber}) is already open for this policy.`, 409)
}

export async function createRenewal(data, actor = null) {
  const policy = await prisma.insurancePolicy.findUnique({ where: { id: data.policyId } })
  if (!policy) throw new AppError('Referenced policy does not exist.', 404)

  let newStart = new Date(data.newStartDate)
  const newExpiry = new Date(data.newExpiryDate)

  if (newExpiry <= newStart) {
    throw new AppError('New expiry date must be strictly after the new start date.', 400)
  }
  // Dates arrive as calendar days; a renewal starting on the expiry day starts at the exact expiry instant.
  const expiryDay = new Date(policy.expiryDate)
  expiryDay.setUTCHours(0, 0, 0, 0)
  if (newStart < expiryDay) {
    throw new AppError('The renewed term cannot start before the current policy expires.', 400)
  }
  if (newStart < policy.expiryDate) newStart = new Date(policy.expiryDate)
  await assertNoOpenRenewal(prisma, policy.id)

  const renewalNumber = await uniqueNumber('REN', 'policyRenewal', 'renewalNumber')

  return prisma.$transaction(async (tx) => {
    const renewal = await tx.policyRenewal.create({
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
    await recordEvent({
      actor,
      action: 'RENEWAL_CREATED',
      entityType: 'PolicyRenewal',
      entityId: renewal.id,
      customerId: policy.customerId,
      agentId: policy.agentId,
      summary: `Renewal ${renewalNumber} opened for policy ${policy.policyNumber}.`,
      notifyCustomer: { title: 'Renewal prepared', message: `Renewal ${renewalNumber} for policy ${policy.policyNumber} is ready. Renewal premium: ₹${Number(data.renewalPremium).toLocaleString('en-IN')}.`, link: '/user/renewals' },
    }, tx)
    return renewal
  })
}

// Customer (or their agent) asks for a policy to be renewed on the same terms.
export async function requestRenewal({ policyId, notes }, actor) {
  const policy = await prisma.insurancePolicy.findUnique({ where: { id: policyId } })
  if (!policy) throw new AppError('Policy not found.', 404)
  if (!['ACTIVE', 'EXPIRED'].includes(policy.status)) {
    throw new AppError(`A ${policy.status.toLowerCase()} policy cannot be renewed.`, 400)
  }

  const now = new Date()
  const windowOpens = new Date(policy.expiryDate.getTime() - RENEWAL_WINDOW_DAYS_BEFORE * 86400000)
  const windowCloses = new Date(policy.expiryDate.getTime() + RENEWAL_GRACE_DAYS_AFTER * 86400000)
  if (now < windowOpens) {
    throw new AppError(`Renewal opens ${RENEWAL_WINDOW_DAYS_BEFORE} days before expiry (from ${windowOpens.toISOString().slice(0, 10)}).`, 400)
  }
  if (now > windowCloses) {
    throw new AppError('The renewal grace period for this policy has ended. Please submit a new application.', 400)
  }

  // Same terms: renewal premium is one year of installments at the current installment amount.
  const renewalPremium = money(Number(policy.premiumAmount) * INSTALLMENTS_PER_YEAR[policy.premiumFrequency])
  const newStartDate = new Date(policy.expiryDate)
  const newExpiryDate = addMonths(newStartDate, 12)

  return createRenewal({
    policyId,
    newStartDate: newStartDate.toISOString(),
    newExpiryDate: newExpiryDate.toISOString(),
    renewalPremium,
    notes: `Requested by ${actor.role === 'CUSTOMER' ? 'policyholder' : 'servicing agent'}${notes ? `: ${notes}` : '.'}`,
  }, actor)
}

export async function updateRenewal(id, data, actor = null) {
  return prisma.$transaction(async (tx) => {
    const renewal = await tx.policyRenewal.findUnique({ where: { id }, include: { policy: true } })
    if (!renewal) throw new AppError('Renewal not found.', 404)
    if (['RENEWED', 'LAPSED'].includes(renewal.status)) {
      throw new AppError(`This renewal is already ${renewal.status.toLowerCase()} and can no longer be changed.`, 409)
    }

    const isRenewing = data.status === 'RENEWED'
    const res = await tx.policyRenewal.updateMany({
      where: { id, status: renewal.status },
      data: { ...data, ...(isRenewing && { renewalDate: new Date() }) },
    })
    if (res.count !== 1) throw new AppError('Renewal was updated by someone else. Refresh and try again.', 409)

    if (isRenewing) {
      // Extend the policy and bill the renewal premium as one installment due at the new term start.
      await tx.insurancePolicy.update({
        where: { id: renewal.policyId },
        data: { expiryDate: renewal.newExpiryDate, status: 'ACTIVE' },
      })
      const premiumNumber = await uniqueNumber(`PRM-${renewal.renewalNumber}`, 'premium', 'premiumNumber', tx)
      await tx.premium.create({
        data: {
          premiumNumber,
          policyId: renewal.policyId,
          amount: renewal.renewalPremium,
          dueDate: renewal.newStartDate,
          billingPeriodStart: renewal.newStartDate,
          billingPeriodEnd: renewal.newExpiryDate,
          status: 'DUE',
        },
      })
    }
    if (data.status === 'LAPSED') {
      await tx.insurancePolicy.update({ where: { id: renewal.policyId }, data: { status: 'EXPIRED' } })
    }

    if (data.status && data.status !== renewal.status) {
      await recordEvent({
        actor,
        action: `RENEWAL_${data.status}`,
        entityType: 'PolicyRenewal',
        entityId: id,
        customerId: renewal.policy.customerId,
        agentId: renewal.policy.agentId,
        summary: `Renewal ${renewal.renewalNumber} marked ${data.status.toLowerCase().replace('_', ' ')}.`,
        notifyCustomer: isRenewing
          ? { title: 'Policy renewed', message: `Policy ${renewal.policy.policyNumber} has been renewed until ${renewal.newExpiryDate.toISOString().slice(0, 10)}.`, link: `/user/policies/${renewal.policyId}` }
          : { title: 'Renewal status updated', message: `Renewal ${renewal.renewalNumber} is now ${data.status.toLowerCase().replace('_', ' ')}.`, link: '/user/renewals' },
        notifyAgent: { title: 'Renewal status updated', message: `Renewal ${renewal.renewalNumber} (${renewal.policy.policyNumber}) is now ${data.status.toLowerCase().replace('_', ' ')}.`, link: '/agent/renewals' },
      }, tx)
    }

    return tx.policyRenewal.findUnique({ where: { id } })
  })
}

// Policies expiring within `days` that have no open or completed renewal for the upcoming term.
export function upcomingExpiryWhere(days = 60) {
  return {
    status: 'ACTIVE',
    expiryDate: { gte: new Date(), lte: daysFromNow(days) },
  }
}
