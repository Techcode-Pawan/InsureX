import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'
import { issueSetupLink, unusablePasswordHash } from '../lib/passwordSetup.js'

// Login state shown to admins: no login, pending activation (invite not yet used), active, or disabled.
const LOGIN_SELECT = { id: true, email: true, isActive: true, lastLoginAt: true, passwordSetupPurpose: true, passwordSetupExpiresAt: true }

export function loginStatus(user) {
  if (!user) return 'NONE'
  if (!user.isActive) return 'DISABLED'
  if (user.passwordSetupPurpose === 'INVITE') return 'PENDING_ACTIVATION'
  return 'ACTIVE'
}

function withLoginStatus(agent) {
  const { user, ...rest } = agent
  return {
    ...rest,
    login: user ? { email: user.email, isActive: user.isActive, lastLoginAt: user.lastLoginAt, status: loginStatus(user), inviteExpiresAt: user.passwordSetupPurpose === 'INVITE' ? user.passwordSetupExpiresAt : null } : null,
    loginStatus: loginStatus(user),
  }
}

export async function getAgents({ search, status, region }) {
  const where = {}
  if (status) where.status = status
  if (region) where.region = region
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { agentNumber: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { branch: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ]
  }

  const agents = await prisma.insuranceAgent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true } },
      user: { select: LOGIN_SELECT },
      _count: {
        select: { policies: true, claims: true, assignedCustomers: true },
      },
    },
  })
  return agents.map(withLoginStatus)
}

export async function getAgentById(id) {
  const agent = await prisma.insuranceAgent.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      user: { select: LOGIN_SELECT },
      assignedCustomers: {
        orderBy: { lastName: 'asc' },
        select: { id: true, customerNumber: true, firstName: true, lastName: true, city: true, status: true, phone: true },
      },
      policies: {
        orderBy: { expiryDate: 'asc' },
        select: {
          id: true, policyNumber: true, status: true, sumAssured: true, premiumAmount: true, expiryDate: true,
          customer: { select: { id: true, firstName: true, lastName: true } }, policyType: { select: { name: true } },
        },
      },
      claims: {
        orderBy: { claimDate: 'desc' },
        select: { id: true, claimNumber: true, status: true, claimedAmount: true, claimDate: true, customer: { select: { id: true, firstName: true, lastName: true } } },
      },
      assistedApplications: {
        orderBy: { applicationDate: 'desc' },
        select: { id: true, applicationNumber: true, status: true, applicationDate: true, requestedCoverage: true, customer: { select: { firstName: true, lastName: true } }, policyType: { select: { name: true } } },
      },
    },
  })
  if (!agent) throw new AppError('Agent not found.', 404)
  // Keep the historic `user` shape used by the admin page alongside the computed login status
  return { ...withLoginStatus(agent), user: agent.user ? { id: agent.user.id, email: agent.user.email, isActive: agent.user.isActive, lastLoginAt: agent.user.lastLoginAt } : null }
}

async function assertEmailFree(tx, email, { exceptAgentId, exceptUserId } = {}) {
  const [user, agent] = await Promise.all([
    tx.user.findUnique({ where: { email }, select: { id: true } }),
    tx.insuranceAgent.findUnique({ where: { email }, select: { id: true } }),
  ])
  if ((user && user.id !== exceptUserId) || (agent && agent.id !== exceptAgentId)) {
    throw new AppError('An account with this email address already exists.', 409)
  }
}

/**
 * Admin "Add New Agent". Creates the agent profile and its login (role AGENT, fixed server-side)
 * atomically. Credentials: a one-time invitation link (default) or a temporary password set by the admin.
 * Returns the agent plus, for invitations, the setup link to share (shown once; only its hash is stored).
 */
export async function createAgent(data, actor = null) {
  const { credentialMode = 'INVITE', temporaryPassword, ...profile } = data
  const email = profile.email.toLowerCase()

  return prisma.$transaction(async (tx) => {
    await assertEmailFree(tx, email)
    const licence = await tx.insuranceAgent.findUnique({ where: { licenseNumber: profile.licenseNumber }, select: { id: true } })
    if (licence) throw new AppError('Another agent already has this licence number.', 409)

    const agentNumber = await uniqueNumber('AGT', 'insuranceAgent', 'agentNumber', tx)
    const user = await tx.user.create({
      data: {
        email,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        phone: profile.phone,
        role: 'AGENT',
        passwordHash: credentialMode === 'PASSWORD' ? await bcrypt.hash(temporaryPassword, 12) : await unusablePasswordHash(),
        isActive: profile.status !== 'INACTIVE',
      },
    })
    const agent = await tx.insuranceAgent.create({
      data: { ...profile, email, agentNumber, userId: user.id },
    })
    const invitation = credentialMode === 'INVITE' ? await issueSetupLink(tx, user.id, 'INVITE') : null

    await recordEvent({
      actor,
      action: 'AGENT_CREATED',
      entityType: 'InsuranceAgent',
      entityId: agent.id,
      agentId: agent.id,
      summary: `Agent ${agentNumber} (${agent.firstName} ${agent.lastName}) created with ${credentialMode === 'INVITE' ? 'an invitation link' : 'a temporary password'}.`,
    }, tx)

    const full = await tx.insuranceAgent.findUnique({ where: { id: agent.id }, include: { user: { select: LOGIN_SELECT }, company: { select: { id: true, name: true } } } })
    return { agent: withLoginStatus(full), invitation }
  })
}

// Deactivating an agent disables their login and ends their sessions; reactivating restores the login.
// Customers stay assigned until an administrator reassigns them. Records are never deleted.
export async function updateAgent(id, data, actor = null) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.insuranceAgent.findUnique({ where: { id } })
    if (!current) throw new AppError('Agent not found.', 404)
    if (data.email) {
      data.email = data.email.toLowerCase()
      if (data.email !== current.email) await assertEmailFree(tx, data.email, { exceptAgentId: id, exceptUserId: current.userId })
    }

    const agent = await tx.insuranceAgent.update({ where: { id }, data })

    if (agent.userId) {
      const userData = {}
      if (data.status === 'INACTIVE' && current.status !== 'INACTIVE') {
        Object.assign(userData, { isActive: false, tokenVersion: { increment: 1 } })
      } else if (data.status && data.status !== 'INACTIVE' && current.status === 'INACTIVE') {
        userData.isActive = true
      }
      if (data.email && data.email !== current.email) userData.email = data.email
      if (data.firstName || data.lastName) userData.name = `${agent.firstName} ${agent.lastName}`
      if (data.phone) userData.phone = data.phone
      if (Object.keys(userData).length) await tx.user.update({ where: { id: agent.userId }, data: userData })
    }

    if (data.status && data.status !== current.status) {
      await recordEvent({
        actor,
        action: data.status === 'INACTIVE' ? 'AGENT_DEACTIVATED' : current.status === 'INACTIVE' ? 'AGENT_REACTIVATED' : 'AGENT_STATUS_CHANGED',
        entityType: 'InsuranceAgent',
        entityId: id,
        agentId: id,
        summary: `Agent ${agent.agentNumber} status changed from ${current.status} to ${data.status}.`,
      }, tx)
    }
    const full = await tx.insuranceAgent.findUnique({ where: { id }, include: { user: { select: LOGIN_SELECT } } })
    return withLoginStatus(full)
  })
}

/**
 * Issues a one-time link for an agent: creates their login first if they never had one (legacy
 * profiles), otherwise re-issues an invitation (not yet activated) or a password reset link.
 */
export async function issueAgentAccessLink(id, actor = null) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.insuranceAgent.findUnique({ where: { id }, include: { user: true } })
    if (!agent) throw new AppError('Agent not found.', 404)
    if (agent.status === 'INACTIVE') throw new AppError('Reactivate this agent before issuing access.', 400)

    let user = agent.user
    if (!user) {
      await assertEmailFree(tx, agent.email, { exceptAgentId: agent.id })
      user = await tx.user.create({
        data: { email: agent.email, name: `${agent.firstName} ${agent.lastName}`, phone: agent.phone, role: 'AGENT', passwordHash: await unusablePasswordHash() },
      })
      await tx.insuranceAgent.update({ where: { id }, data: { userId: user.id } })
    }
    if (user.role !== 'AGENT') throw new AppError('This profile is linked to a non-agent login. Fix it under Users & Access.', 409)

    const purpose = !agent.user || user.passwordSetupPurpose === 'INVITE' ? 'INVITE' : 'RESET'
    const link = await issueSetupLink(tx, user.id, purpose)
    await recordEvent({
      actor, action: purpose === 'INVITE' ? 'AGENT_INVITED' : 'PASSWORD_RESET_LINK', entityType: 'User', entityId: user.id, agentId: id,
      summary: `${purpose === 'INVITE' ? 'Invitation' : 'Password reset'} link issued for agent ${agent.agentNumber}.`,
    }, tx)
    return link
  })
}
