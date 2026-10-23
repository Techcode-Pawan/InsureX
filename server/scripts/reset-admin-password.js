// Safely reset an administrator password from the command line without resetting the database.
//
// Usage:
//   1. Interactive prompt (password hidden from shell history):
//        node scripts/reset-admin-password.js
//
//   2. Environment variables:
//        ADMIN_EMAIL=admin@insurex.in ADMIN_PASSWORD='<strong secret>' node scripts/reset-admin-password.js
//
// Credentials are read securely and are never stored in source code.
import readline from 'readline'
import { Writable } from 'stream'
import bcrypt from 'bcryptjs'
import prisma from '../src/config/db.js'
import { loginUser } from '../src/services/authService.js'

function fail(msg) {
  console.error(`✖ ${msg}`)
  process.exit(1)
}

function promptHidden(questionText) {
  return new Promise((resolve) => {
    let muted = false
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding)
        }
        callback()
      },
    })

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    })

    process.stdout.write(questionText)
    muted = true

    rl.question('', (answer) => {
      muted = false
      process.stdout.write('\n')
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Same rule the API enforces (validators/schemas.js strongPassword), so CLI and app never disagree.
function validatePasswordPolicy(pwd) {
  if (pwd.length < 8 || pwd.length > 128 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
    fail('Password must be 8–128 characters and contain at least one letter and one number.')
  }
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@insurex.in').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('Set ADMIN_EMAIL to a valid email address.')
  }

  // 1. Verify that user exists in database and is an administrator
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    fail(`User account for ${email} does not exist in the database. Use scripts/create-admin.js instead.`)
  }
  if (user.role !== 'ADMIN') {
    fail(`Account for ${email} has role ${user.role}, not ADMIN. Aborting.`)
  }

  let password = process.env.ADMIN_PASSWORD || ''

  if (!password) {
    if (!process.stdin.isTTY) {
      fail('ADMIN_PASSWORD environment variable is required in non-interactive environments.')
    }
    console.log(`🔐 Administrator Password Reset for [${email}]`)
    password = await promptHidden('Enter new password (8+ chars, letter and number): ')
    validatePasswordPolicy(password)
    const confirmPassword = await promptHidden('Confirm new password: ')
    if (password !== confirmPassword) {
      fail('Passwords do not match. Aborting.')
    }
  } else {
    validatePasswordPolicy(password)
  }

  // 2. Hash using bcryptjs with cost factor 12 (matching existing auth architecture)
  const passwordHash = await bcrypt.hash(password, 12)

  // 3. Atomically update password, increment tokenVersion (revoking old sessions), and ensure active
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        isActive: true,
      },
    })

    // Record audit activity log event
    await tx.activityLog.create({
      data: {
        actorUserId: user.id,
        actorRole: 'ADMIN',
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        summary: `Administrator password reset via command-line recovery script for ${email}.`,
      },
    })

    return updated
  })

  // 4. Verify that the new password hashes correctly and authenticates successfully
  const isMatch = await bcrypt.compare(password, updatedUser.passwordHash)
  if (!isMatch) {
    fail('Verification failed: newly generated hash does not match input password.')
  }

  const authSession = await loginUser({ email, password })
  if (!authSession || !authSession.token || authSession.user.role !== 'ADMIN') {
    fail('Verification failed: authentication pipeline rejected the updated credentials.')
  }

  console.log(`\n✔ Administrator password successfully reset for: ${email}`)
  console.log(`✔ Password hashed using bcrypt (12 rounds)`)
  console.log(`✔ Stale JWT sessions invalidated (tokenVersion incremented to ${updatedUser.tokenVersion})`)
  console.log(`✔ Authentication verified: account is active and verified as role ADMIN`)
  console.log(`✔ Customer records, policies, claims, and relations were preserved intact`)
}

main()
  .catch((err) => {
    console.error('✖ Error during password reset:', err.message || err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
