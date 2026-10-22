import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

function generatePaymentNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `PPAY-${n}`
}

export async function getPremiums({ policyId, status, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (policyId) where.policyId = policyId
  if (status) where.status = status

  const [total, premiums] = await Promise.all([
    prisma.premium.count({ where }),
    prisma.premium.findMany({
      where,
      skip,
      take,
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

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: premiums.map(p => {
      const balance = Number(p.amount) - Number(p.paidAmount)
      return {
        ...p,
        remainingBalance: Math.max(0, balance),
      }
    }),
  }
}

export async function getPremiumById(id) {
  const premium = await prisma.premium.findUnique({
    where: { id },
    include: {
      policy: { include: { customer: true, policyType: true } },
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  })
  if (!premium) throw new AppError('Premium record not found.', 404)
  const balance = Number(premium.amount) - Number(premium.paidAmount)
  return {
    ...premium,
    remainingBalance: Math.max(0, balance),
  }
}

export async function getPayments({ policyId, premiumId, page = 1, limit = 10 }) {
  const skip = (Number(page) - 1) * Number(limit)
  const take = Number(limit)

  const where = {}
  if (policyId) where.policyId = policyId
  if (premiumId) where.premiumId = premiumId

  const [total, payments] = await Promise.all([
    prisma.premiumPayment.count({ where }),
    prisma.premiumPayment.findMany({
      where,
      skip,
      take,
      orderBy: { paymentDate: 'desc' },
      include: {
        premium: true,
        policy: {
          select: {
            policyNumber: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take),
    data: payments,
  }
}

// Atomic payment execution & remaining balance recalculation
export async function createPayment({ premiumId, amount, paymentMethod, transactionReference, notes }) {
  return prisma.$transaction(async (tx) => {
    const premium = await tx.premium.findUnique({
      where: { id: premiumId },
      include: { policy: true },
    })

    if (!premium) throw new AppError('Referenced premium installment does not exist.', 404)

    const paymentAmount = Number(amount)
    const currentPaid = Number(premium.paidAmount || 0)
    const totalDue = Number(premium.amount)
    const currentBalance = totalDue - currentPaid

    if (currentBalance <= 0) {
      throw new AppError('This premium has already been paid in full.', 400)
    }

    if (paymentAmount > currentBalance) {
      throw new AppError(`Payment amount (₹${paymentAmount}) exceeds the remaining balance (₹${currentBalance}).`, 400)
    }

    // Check duplicate transaction reference
    const dupTxn = await tx.premiumPayment.findUnique({ where: { transactionReference } })
    if (dupTxn) {
      throw new AppError(`Transaction reference '${transactionReference}' has already been processed.`, 409)
    }

    let paymentNumber = generatePaymentNumber()
    let pExists = await tx.premiumPayment.findUnique({ where: { paymentNumber } })
    while (pExists) {
      paymentNumber = generatePaymentNumber()
      pExists = await tx.premiumPayment.findUnique({ where: { paymentNumber } })
    }

    // 1. Record payment
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

    // 2. Recalculate remaining balance & update premium status
    const newPaidAmount = currentPaid + paymentAmount
    const newRemaining = totalDue - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID'
    const paidDate = newRemaining <= 0 ? new Date() : null

    const updatedPremium = await tx.premium.update({
      where: { id: premiumId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        ...(paidDate && { paidDate }),
      },
    })

    return {
      payment,
      premium: {
        ...updatedPremium,
        remainingBalance: Math.max(0, newRemaining),
      },
    }
  })
}
