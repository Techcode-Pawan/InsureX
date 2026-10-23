// Public product catalogue: active policy types only, no internal fields.
import { Router } from 'express'
import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'

const router = Router()

const PUBLIC_FIELDS = {
  id: true, typeCode: true, name: true, description: true, coverageDetails: true, eligibility: true, terms: true, icon: true,
}

router.get('/policy-types', asyncHandler(async (req, res) => {
  const data = await prisma.policyType.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: PUBLIC_FIELDS })
  res.json({ success: true, data })
}))

router.get('/policy-types/:id', asyncHandler(async (req, res) => {
  const data = await prisma.policyType.findFirst({ where: { id: String(req.params.id), status: 'ACTIVE' }, select: PUBLIC_FIELDS })
  if (!data) throw new AppError('Plan not found.', 404)
  res.json({ success: true, data })
}))

export default router
