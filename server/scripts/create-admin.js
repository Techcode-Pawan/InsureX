// Provision an administrator login from the command line. There is no public way to create admins.
//
//   ADMIN_EMAIL=ops@yourco.in ADMIN_NAME="Ops Lead" ADMIN_PASSWORD='<strong secret>' node scripts/create-admin.js
//
// Credentials are read from the environment so they never appear in source control.
import bcrypt from 'bcryptjs'
import prisma from '../src/config/db.js'

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const name = (process.env.ADMIN_NAME || '').trim()
const password = process.env.ADMIN_PASSWORD || ''

function fail(msg) {
  console.error(`✖ ${msg}`)
  process.exit(1)
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Set ADMIN_EMAIL to a valid email address.')
if (name.length < 2) fail('Set ADMIN_NAME.')
// Same rule the API enforces (validators/schemas.js strongPassword), so CLI and app never disagree.
if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail('ADMIN_PASSWORD must be 8–128 characters with at least one letter and one number.')
}

const existing = await prisma.user.findUnique({ where: { email } })
if (existing) fail(`A login for ${email} already exists (role ${existing.role}). Nothing changed.`)

await prisma.user.create({
  data: { email, name, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) },
})
console.log(`✔ Administrator ${email} created.`)
await prisma.$disconnect()
