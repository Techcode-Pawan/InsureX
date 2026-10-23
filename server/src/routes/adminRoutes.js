// Admin-only operations that did not exist before the multi-role split (/api/admin).
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../middleware/errorHandler.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paginate, pageResult } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'
import * as dashboardService from '../services/dashboardService.js'
import * as premiumService from '../services/premiumService.js'
import {
  uuidParam,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
  assignAgentSchema,
  paymentVerifySchema,
} from '../validators/schemas.js'

const router = Router()
const idParam = validate({ params: uuidParam })

router.get('/overview', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dashboardService.getAdminOverview() })
}))

router.get('/activity', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 25 })
  const where = {}
  if (req.query.entityType) where.entityType = String(req.query.entityType)
  const [total, data] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where, skip: pg.skip, take: pg.take, orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, email: true } } },
    }),
  ])
  res.json({ success: true, ...pageResult(pg, total, data) })
}))

// ── User accounts & access ────────────────────────────────────
const USER_SELECT = {
  id: true, email: true, name: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true,
  customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true } },
  agent: { select: { id: true, agentNumber: true, firstName: true, lastName: true } },
}

router.get('/users', asyncHandler(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20 })
  const where = {}
  if (req.query.role) where.role = String(req.query.role)
  if (req.query.search) {
    const s = String(req.query.search)
    where.OR = [{ email: { contains: s, mode: 'insensitive' } }, { name: { contains: s, mode: 'insensitive' } }]
  }
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip: pg.skip, take: pg.take, orderBy: { createdAt: 'desc' }, select: USER_SELECT }),
  ])
  res.json({ success: true, ...pageResult(pg, total, data) })
}))

// Provision staff logins. Agent logins must be linked to an existing agent profile.
router.post('/users', validate({ body: adminCreateUserSchema }), asyncHandler(async (req, res) => {
  const { email, name, password, role, agentId } = req.body
  const normalisedEmail = email.toLowerCase()
  if (await prisma.user.findUnique({ where: { email: normalisedEmail } })) {
    throw new AppError('A login with this email already exists.', 409)
  }
  if (agentId) {
    const agent = await prisma.insuranceAgent.findUnique({ where: { id: agentId } })
    if (!agent) throw new AppError('Agent profile not found.', 404)
    if (agent.userId) throw new AppError('This agent profile already has a login.', 409)
  }
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: normalisedEmail, name, role, passwordHash: await bcrypt.hash(password, 12) },
    })
    if (role === 'AGENT') await tx.insuranceAgent.update({ where: { id: agentId }, data: { userId: created.id } })
    await recordEvent({
      actor: req.user, action: 'USER_CREATED', entityType: 'User', entityId: created.id,
      agentId: role === 'AGENT' ? agentId : null, summary: `${role.toLowerCase()} login created for ${normalisedEmail}.`,
    }, tx)
    return tx.user.findUnique({ where: { id: created.id }, select: USER_SELECT })
  })
  res.status(201).json({ success: true, message: 'Login created. Share the temporary password through a secure channel.', data: user })
}))

router.patch('/users/:id', idParam, validate({ body: adminUpdateUserSchema }), asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { customer: true, agent: true } })
  if (!target) throw new AppError('User not found.', 404)
  if (target.id === req.user.id && req.body.isActive === false) {
    throw new AppError('You cannot deactivate your own account.', 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = {}
    if (req.body.isActive !== undefined) {
      data.isActive = req.body.isActive
      if (!req.body.isActive) data.tokenVersion = { increment: 1 } // deactivation ends active sessions
    }
    if (Object.keys(data).length) await tx.user.update({ where: { id: target.id }, data })

    // Linking a login to an existing customer record is done only after staff have verified identity.
    if (req.body.linkCustomerId !== undefined) {
      if (target.role !== 'CUSTOMER') throw new AppError('Only customer logins can be linked to a customer record.', 400)
      if (target.customer) await tx.customer.update({ where: { id: target.customer.id }, data: { userId: null } })
      if (req.body.linkCustomerId) {
        const c = await tx.customer.findUnique({ where: { id: req.body.linkCustomerId } })
        if (!c) throw new AppError('Customer record not found.', 404)
        if (c.userId && c.userId !== target.id) throw new AppError('That customer record is already linked to another login.', 409)
        await tx.customer.update({ where: { id: c.id }, data: { userId: target.id } })
      }
    }
    if (req.body.linkAgentId !== undefined) {
      if (target.role !== 'AGENT') throw new AppError('Only agent logins can be linked to an agent profile.', 400)
      if (target.agent) await tx.insuranceAgent.update({ where: { id: target.agent.id }, data: { userId: null } })
      if (req.body.linkAgentId) {
        const a = await tx.insuranceAgent.findUnique({ where: { id: req.body.linkAgentId } })
        if (!a) throw new AppError('Agent profile not found.', 404)
        if (a.userId && a.userId !== target.id) throw new AppError('That agent profile is already linked to another login.', 409)
        await tx.insuranceAgent.update({ where: { id: a.id }, data: { userId: target.id } })
      }
    }
    await recordEvent({
      actor: req.user, action: 'USER_ACCESS_UPDATED', entityType: 'User', entityId: target.id,
      summary: `Access updated for ${target.email}.`,
    }, tx)
    return tx.user.findUnique({ where: { id: target.id }, select: USER_SELECT })
  })
  res.json({ success: true, message: 'Account updated.', data: updated })
}))

// Staff-assisted password reset (no email service is configured): sets a temporary password
// chosen by the admin and signs the user out everywhere. The admin shares it out of band.
router.post('/users/:id/reset-password', idParam, validate({ body: adminResetPasswordSchema }), asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, email: true } })
  if (!target) throw new AppError('User not found.', 404)
  if (target.id === req.user.id) throw new AppError('Use Settings → Change password for your own account.', 400)
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(req.body.temporaryPassword, 12), tokenVersion: { increment: 1 } },
  })
  await recordEvent({ actor: req.user, action: 'PASSWORD_RESET', entityType: 'User', entityId: target.id, summary: `Password reset by an administrator for ${target.email}.` })
  res.json({ success: true, message: 'Temporary password set. All existing sessions for this user were signed out.' })
}))

router.post('/users/:id/revoke-sessions', idParam, asyncHandler(async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { tokenVersion: { increment: 1 } } })
  await recordEvent({ actor: req.user, action: 'SESSIONS_REVOKED', entityType: 'User', entityId: req.params.id, summary: 'All sessions revoked for a user.' })
  res.json({ success: true, message: 'All sessions for this user have been signed out.' })
}))

// ── Customer ↔ agent assignment ───────────────────────────────
router.put('/customers/:id/agent', idParam, validate({ body: assignAgentSchema }), asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } })
  if (!customer) throw new AppError('Customer not found.', 404)
  if (req.body.agentId) {
    const agent = await prisma.insuranceAgent.findUnique({ where: { id: req.body.agentId } })
    if (!agent) throw new AppError('Agent not found.', 404)
    if (agent.status !== 'ACTIVE') throw new AppError('Customers can only be assigned to active agents.', 400)
  }
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { assignedAgentId: req.body.agentId },
    include: { assignedAgent: { select: { id: true, firstName: true, lastName: true, agentNumber: true } } },
  })
  await recordEvent({
    actor: req.user, action: 'CUSTOMER_ASSIGNED', entityType: 'Customer', entityId: customer.id,
    customerId: customer.id, agentId: req.body.agentId,
    summary: req.body.agentId ? `${customer.customerNumber} assigned to agent ${updated.assignedAgent.agentNumber}.` : `${customer.customerNumber} unassigned from agent.`,
    notifyAgent: req.body.agentId ? { title: 'New customer assigned', message: `${customer.firstName} ${customer.lastName} (${customer.customerNumber}) is now in your book.`, link: `/agent/customers/${customer.id}` } : undefined,
  })
  res.json({ success: true, message: 'Servicing agent updated.', data: updated })
}))

// ── Payment verification ──────────────────────────────────────
router.post('/payments/:id/verify', idParam, validate({ body: paymentVerifySchema }), asyncHandler(async (req, res) => {
  const result = await premiumService.verifyPayment(req.params.id, req.body, req.user)
  res.json({ success: true, message: req.body.decision === 'SUCCESS' ? 'Payment confirmed and applied.' : 'Payment marked as failed.', data: result })
}))

export default router
