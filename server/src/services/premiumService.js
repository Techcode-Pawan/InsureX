import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { env } from '../config/env.js'
import { uniqueNumber, paginate, pageResult, money } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

function withBalance(p) {
  return { ...p, remainingBalance: Math.max(0, money(Number(p.amount) - Number(p.paidAmount))) }
}

export async function getPremiums({ policyId, status, ...query }, scope = {}) {
  const pg = paginate(query)

  const where = { AND: [scope] }
  if (policyId) where.policyId = policyId
  if (status) where.status = status

  const [total, premiums] = await Promise.all([
    prisma.premium.count({ where }),
    prisma.premium.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { dueDate: 'asc' },
      include: {
        policy: {
          select: {
            id: true,
            policyNumber: true,
            customer: { select: { id: true, firstName: true, lastName: true } },
            policyType: { select: { id: true, name: true } },
          },
        },
        payments: true,
      },
    }),
  ])

  return pageResult(pg, total, premiums.map(withBalance))
}

export async function getPremiumById(id, scope = {}) {
  const premium = await prisma.premium.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      policy: { include: { customer: true, policyType: true } },
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  })
  if (!premium) throw new AppError('Premium record not found.', 404)
  return withBalance(premium)
}

export async function getPayments({ policyId, premiumId, status, ...query }, scope = {}) {
  const pg = paginate(query)

  const where = { AND: [scope] }
  if (policyId) where.policyId = policyId
  if (premiumId) where.premiumId = premiumId
  if (status) where.status = status

  const [total, payments] = await Promise.all([
    prisma.premiumPayment.count({ where }),
    prisma.premiumPayment.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { paymentDate: 'desc' },
      include: {
        premium: true,
        policy: {
          select: {
            id: true,
            policyNumber: true,
            customer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  return pageResult(pg, total, payments)
}

// Applies a confirmed amount to a premium inside an open transaction and returns the updated premium.
async function applyToPremium(tx, premium, amount) {
  const totalDue = Number(premium.amount)
  const newPaidAmount = money(Number(premium.paidAmount || 0) + amount)
  const newRemaining = money(totalDue - newPaidAmount)
  if (newRemaining < 0) {
    throw new AppError(`Payment amount exceeds the remaining balance (₹${money(totalDue - Number(premium.paidAmount))}).`, 400)
  }
  // Optimistic concurrency: only apply if paidAmount has not changed since we read it.
  const res = await tx.premium.updateMany({
    where: { id: premium.id, paidAmount: premium.paidAmount },
    data: {
      paidAmount: newPaidAmount,
      status: newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID',
      ...(newRemaining <= 0 && { paidDate: new Date() }),
    },
  })
  if (res.count !== 1) throw new AppError('This premium was updated concurrently. Please retry.', 409)
  return withBalance(await tx.premium.findUnique({ where: { id: premium.id } }))
}

async function loadPremium(client, premiumId) {
  const premium = await client.premium.findUnique({
    where: { id: premiumId },
    include: { policy: { include: { customer: true } } },
  })
  if (!premium) throw new AppError('Referenced premium installment does not exist.', 404)
  return premium
}

// Staff-recorded payment that has already been confirmed (cash desk, cheque cleared, bank statement).
export async function createPayment({ premiumId, amount, paymentMethod, transactionReference, notes }, actor = null) {
  return prisma.$transaction(async (tx) => {
    const premium = await loadPremium(tx, premiumId)
    const paymentAmount = money(amount)
    const currentBalance = money(Number(premium.amount) - Number(premium.paidAmount || 0))

    if (currentBalance <= 0) throw new AppError('This premium has already been paid in full.', 400)
    if (paymentAmount > currentBalance) {
      throw new AppError(`Payment amount (₹${paymentAmount}) exceeds the remaining balance (₹${currentBalance}).`, 400)
    }

    const dupTxn = await tx.premiumPayment.findUnique({ where: { transactionReference } })
    if (dupTxn) throw new AppError(`Transaction reference '${transactionReference}' has already been processed.`, 409)

    const paymentNumber = await uniqueNumber('PPAY', 'premiumPayment', 'paymentNumber', tx)
    const payment = await tx.premiumPayment.create({
      data: {
        paymentNumber,
        premiumId,
        policyId: premium.policyId,
        amount: paymentAmount,
        paymentMethod,
        transactionReference,
        status: 'SUCCESS',
        notes,
      },
    })

    const updatedPremium = await applyToPremium(tx, premium, paymentAmount)

    await recordEvent({
      actor,
      action: 'PAYMENT_CONFIRMED',
      entityType: 'PremiumPayment',
      entityId: payment.id,
      customerId: premium.policy.customerId,
      agentId: premium.policy.agentId,
      summary: `Payment ${paymentNumber} of ₹${paymentAmount.toLocaleString('en-IN')} recorded for ${premium.premiumNumber}.`,
      notifyCustomer: { title: 'Payment received', message: `We received ₹${paymentAmount.toLocaleString('en-IN')} for premium ${premium.premiumNumber} (policy ${premium.policy.policyNumber}).`, link: '/user/payments' },
    }, tx)

    return { payment, premium: updatedPremium }
  })
}

export function getGatewayStatus() {
  return {
    configured: Boolean(env.PAYMENT_GATEWAY_PROVIDER),
    provider: env.PAYMENT_GATEWAY_PROVIDER || null,
    mode: env.PAYMENT_GATEWAY_PROVIDER ? 'ONLINE' : 'MANUAL_VERIFICATION',
  }
}

/**
 * Customer-initiated payment.
 * Payment-gateway integration boundary: no gateway is integrated in this codebase, so the
 * customer submits the reference of a payment they made through their bank/UPI app and the
 * record stays PENDING until staff verify it against the bank statement. No balance changes
 * until verification. To integrate a gateway, create the order here, keep the record PENDING,
 * and call verifyPayment() from the provider's signed webhook.
 */
export async function submitPayment({ premiumId, amount, paymentMethod, transactionReference }, actor) {
  return prisma.$transaction(async (tx) => {
    const premium = await loadPremium(tx, premiumId)
    const pendingAgg = await tx.premiumPayment.aggregate({
      where: { premiumId, status: 'PENDING' },
      _sum: { amount: true },
    })
    const paymentAmount = money(amount)
    const available = money(Number(premium.amount) - Number(premium.paidAmount) - Number(pendingAgg._sum.amount || 0))

    if (available <= 0) {
      throw new AppError('This premium is fully paid or already has payments awaiting verification.', 400)
    }
    if (paymentAmount > available) {
      throw new AppError(`Amount exceeds the outstanding balance not yet submitted (₹${available}).`, 400)
    }

    const dupTxn = await tx.premiumPayment.findUnique({ where: { transactionReference } })
    if (dupTxn) throw new AppError('This transaction reference has already been submitted.', 409)

    const paymentNumber = await uniqueNumber('PPAY', 'premiumPayment', 'paymentNumber', tx)
    const payment = await tx.premiumPayment.create({
      data: {
        paymentNumber,
        premiumId,
        policyId: premium.policyId,
        amount: paymentAmount,
        paymentMethod,
        transactionReference,
        status: 'PENDING',
        notes: 'Submitted by customer; awaiting verification against bank records.',
      },
    })

    await recordEvent({
      actor,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'PremiumPayment',
      entityId: payment.id,
      customerId: premium.policy.customerId,
      agentId: premium.policy.agentId,
      summary: `Payment ${paymentNumber} of ₹${paymentAmount.toLocaleString('en-IN')} submitted for verification.`,
    }, tx)

    return { payment, gateway: getGatewayStatus() }
  })
}

// Staff verification of a PENDING payment. SUCCESS applies it to the premium balance; FAILED leaves balance untouched.
export async function verifyPayment(paymentId, { decision, notes }, actor = null) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.premiumPayment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new AppError('Payment not found.', 404)
    if (payment.status !== 'PENDING') {
      throw new AppError(`Payment has already been ${payment.status === 'SUCCESS' ? 'confirmed' : 'marked failed'}.`, 409)
    }

    const res = await tx.premiumPayment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: decision, notes: notes || payment.notes },
    })
    if (res.count !== 1) throw new AppError('Payment was verified by someone else.', 409)

    const premium = await loadPremium(tx, payment.premiumId)
    let updatedPremium = withBalance(premium)
    if (decision === 'SUCCESS') {
      updatedPremium = await applyToPremium(tx, premium, Number(payment.amount))
    }

    const amountText = `₹${Number(payment.amount).toLocaleString('en-IN')}`
    await recordEvent({
      actor,
      action: decision === 'SUCCESS' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED',
      entityType: 'PremiumPayment',
      entityId: paymentId,
      customerId: premium.policy.customerId,
      agentId: premium.policy.agentId,
      summary: `Payment ${payment.paymentNumber} ${decision === 'SUCCESS' ? 'confirmed' : 'could not be verified'}.`,
      notifyCustomer: decision === 'SUCCESS'
        ? { title: 'Payment confirmed', message: `Your payment of ${amountText} for premium ${premium.premiumNumber} has been confirmed.`, link: '/user/payments' }
        : { title: 'Payment could not be verified', message: `We could not verify payment ${payment.paymentNumber} (${amountText}).${notes ? ` ${notes}` : ''}`, link: '/user/payments' },
    }, tx)

    return { payment: await tx.premiumPayment.findUnique({ where: { id: paymentId } }), premium: updatedPremium }
  })
}

// Marks unpaid installments whose due date has passed as OVERDUE (date-driven, idempotent).
export async function refreshOverduePremiums() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const res = await prisma.premium.updateMany({
    where: { status: 'DUE', dueDate: { lt: startOfToday } },
    data: { status: 'OVERDUE' },
  })
  return res.count
}
