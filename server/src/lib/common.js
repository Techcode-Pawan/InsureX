import crypto from 'crypto'
import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'

export function paginate(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit, take: limit }
}

export function pageResult({ page, limit }, total, data) {
  return { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), data }
}

// Generates a human-readable reference (e.g. APP-48213) that is unique for the given model field.
export async function uniqueNumber(prefix, model, field, client = prisma) {
  for (let i = 0; i < 20; i++) {
    const candidate = `${prefix}-${crypto.randomInt(10000, 99999)}`
    const exists = await client[model].findUnique({ where: { [field]: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  throw new AppError('Could not allocate a reference number. Please retry.', 503)
}

export function money(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

export function assertUuid(id, label = 'Record') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))) {
    throw new AppError(`${label} not found.`, 404)
  }
}

export const INSTALLMENTS_PER_YEAR = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, ANNUALLY: 1 }

export function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
