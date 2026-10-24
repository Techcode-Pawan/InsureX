// One-time password setup / reset links.
// The raw token is shown once (to the admin who generated it) and only its SHA-256 hash is stored,
// so a database leak cannot be used to take over accounts. Tokens expire and are single-use.
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

export const INVITE_TTL_HOURS = 72
export const RESET_TTL_HOURS = 24

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function setupUrl(token) {
  return `${env.CLIENT_URL.replace(/\/$/, '')}/setup-password?token=${encodeURIComponent(token)}`
}

/**
 * Issues a fresh link for `userId` (replacing any previous one) inside the caller's transaction.
 * @param {'INVITE'|'RESET'} purpose
 */
export async function issueSetupLink(tx, userId, purpose) {
  const token = crypto.randomBytes(32).toString('base64url')
  const hours = purpose === 'INVITE' ? INVITE_TTL_HOURS : RESET_TTL_HOURS
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000)
  await tx.user.update({
    where: { id: userId },
    data: { passwordSetupTokenHash: hashToken(token), passwordSetupExpiresAt: expiresAt, passwordSetupPurpose: purpose },
  })
  return { url: setupUrl(token), expiresAt, purpose }
}

// A random password nobody knows, used for invited accounts until they set their own.
export async function unusablePasswordHash() {
  return bcrypt.hash(crypto.randomBytes(48).toString('base64url'), 12)
}
