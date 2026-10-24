import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { signToken } from '../middleware/auth.js'
import { hashToken } from '../lib/passwordSetup.js'

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

const ROLE_LABEL = { ADMIN: 'Admin', AGENT: 'Agent / Staff', CUSTOMER: 'Customer' }

// `role` is the portal the person chose on the login page. It never grants anything: the role stored
// in the database decides access. It is only compared, after the password is verified, so someone
// who picked the wrong portal gets a helpful message instead of landing in an unexpected dashboard.
export async function loginUser({ email, password, role }) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

  const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH)
  if (!user || !isMatch) {
    throw new AppError('Invalid email or password.', 401)
  }
  // Only revealed to someone who already proved they know the password.
  if (!user.isActive) {
    throw new AppError('This account has been deactivated. Contact an InsureX administrator to restore access.', 403)
  }
  if (role && role !== user.role) {
    throw new AppError(
      `This account is not registered for ${ROLE_LABEL[role]} sign-in. Select "${ROLE_LABEL[user.role]}" and try again.`,
      403
    )
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

async function findValidSetupToken(token) {
  const user = await prisma.user.findUnique({
    where: { passwordSetupTokenHash: hashToken(token) },
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordSetupExpiresAt: true, passwordSetupPurpose: true },
  })
  if (!user || !user.passwordSetupExpiresAt || user.passwordSetupExpiresAt < new Date()) {
    throw new AppError('This link is invalid or has expired. Ask an administrator for a new one.', 400)
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated. Contact an InsureX administrator.', 403)
  }
  return user
}

// Lets the setup page greet the person without revealing anything for invalid tokens.
export async function inspectSetupToken(token) {
  const u = await findValidSetupToken(token)
  return { email: u.email, name: u.name, role: u.role, purpose: u.passwordSetupPurpose, expiresAt: u.passwordSetupExpiresAt }
}

// Consumes a one-time link: sets the password, clears the token and ends any existing sessions.
export async function completePasswordSetup({ token, password }) {
  const u = await findValidSetupToken(token)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  // Matching on the token hash makes the link single-use even if submitted twice concurrently.
  const res = await prisma.user.updateMany({
    where: { id: u.id, passwordSetupTokenHash: hashToken(token) },
    data: {
      passwordHash,
      passwordSetupTokenHash: null,
      passwordSetupExpiresAt: null,
      passwordSetupPurpose: null,
      tokenVersion: { increment: 1 },
    },
  })
  if (res.count !== 1) throw new AppError('This link has already been used.', 400)
  return { email: u.email, role: u.role }
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
