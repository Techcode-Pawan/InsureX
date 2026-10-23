// Per-user notifications (/api/notifications). Always filtered by the authenticated user's id.
import { Router } from 'express'
import prisma from '../config/db.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginate, pageResult } from '../lib/common.js'
import { uuidParam } from '../validators/schemas.js'

const router = Router()
router.use(authenticate)

router.get('/', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20, maxLimit: 50 })
  const where = { userId: req.user.id, ...(req.query.unread === 'true' && { readAt: null }) }
  const [total, unread, data] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    prisma.notification.findMany({ where, skip: pg.skip, take: pg.take, orderBy: { createdAt: 'desc' } }),
  ])
  res.json({ success: true, unread, ...pageResult(pg, total, data) })
}))

router.post('/:id/read', validate({ params: uuidParam }), asyncHandler(async (req, res) => {
  // updateMany with userId in the filter: another user's notification id simply matches nothing
  const r = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id, readAt: null }, data: { readAt: new Date() } })
  res.json({ success: true, updated: r.count })
}))

router.post('/read-all', asyncHandler(async (req, res) => {
  const r = await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } })
  res.json({ success: true, updated: r.count })
}))

export default router
