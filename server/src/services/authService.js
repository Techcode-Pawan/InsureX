import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { signToken } from '../middleware/auth.js'

const BCRYPT_ROUNDS = 12
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  customer: { select: { id: true, customerNumber: true, firstName: true, lastName: true, status: true } },
  agent: { select: { id: true, agentNumber: true, firstName: true, lastName: true, status: true } },
}

// Pre-computed hash so failed lookups take as long as a real password check (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('insurex-timing-equaliser', BCRYPT_ROUNDS)

function shapeUser(u) {
  const { customer, agent, ...rest } = u
  return {
    ...rest,
    customerProfile: customer || null,
    agentProfile: agent || null,
    profileComplete: rest.role === 'CUSTOMER' ? Boolean(customer) : rest.role === 'AGENT' ? Boolean(agent) : true,
  }
}

// Public self-registration always creates a CUSTOMER login. Agents and admins are provisioned by administrators.
export async function registerUser({ email, password, name, phone }) {
  const normalisedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } })
  if (existing) {
    throw new AppError('An account with this email already exists. Try signing in instead.', 409)
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: { email: normalisedEmail, passwordHash, name: name.trim(), role: 'CUSTOMER', phone, lastLoginAt: new Date() },
    select: { ...SAFE_USER_SELECT, tokenVersion: true },
  })

  const token = signToken(user)
  const { tokenVersion: _tv, ...safe } = user
  return { user: shapeUser(safe), token }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

  const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH)
  if (!user || !isMatch || !user.isActive) {
    throw new AppError('Invalid email or password.', 401)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: { ...SAFE_USER_SELECT, tokenVersion: true },
  })

  const token = signToken(updated)
  const { tokenVersion: _tv, ...safe } = updated
  return { user: shapeUser(safe), token }
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT })
  if (!user) throw new AppError('User not found.', 404)
  return shapeUser(user)
}

// Revokes every token issued to this user so far.
export async function revokeSessions(userId) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('User not found.', 404)
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw new AppError('Current password is incorrect.', 400)

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { id: true, tokenVersion: true },
  })
  return { token: signToken(updated) }
}
