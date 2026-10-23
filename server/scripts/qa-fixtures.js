// Creates / removes a FICTIONAL QA dataset for manual browser testing of the three panels.
//   node scripts/qa-fixtures.js create <credentials-output-file>
//   node scripts/qa-fixtures.js cleanup
// Every record is tagged with "QA Demo" / @example.test and is removed by `cleanup`.
// The random password is written only to the given file, never printed.
import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../src/config/db.js'
import * as applicationService from '../src/services/applicationService.js'
import * as premiumService from '../src/services/premiumService.js'
import * as claimService from '../src/services/claimService.js'

const DOMAIN = '@example.test'
const EMAILS = { admin: `qa.demo.admin${DOMAIN}`, agent: `qa.demo.agent${DOMAIN}`, customer: `qa.demo.customer${DOMAIN}` }

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { in: Object.values(EMAILS) } }, select: { id: true } })
  const userIds = users.map((u) => u.id)
  const customers = await prisma.customer.findMany({ where: { email: { endsWith: DOMAIN }, firstName: 'QA Demo' }, select: { id: true } })
  const custIds = customers.map((c) => c.id)
  const agents = await prisma.insuranceAgent.findMany({ where: { email: { endsWith: DOMAIN }, firstName: 'QA Demo' }, select: { id: true } })
  const agentIds = agents.map((a) => a.id)
  const polIds = (await prisma.insurancePolicy.findMany({ where: { customerId: { in: custIds } }, select: { id: true } })).map((p) => p.id)
  const claimIds = (await prisma.claim.findMany({ where: { customerId: { in: custIds } }, select: { id: true } })).map((c) => c.id)
  const docs = await prisma.document.findMany({ where: { customerId: { in: custIds } }, select: { fileUrl: true } })
  await prisma.document.deleteMany({ where: { customerId: { in: custIds } } })
  await prisma.claimProcessing.deleteMany({ where: { claimId: { in: claimIds } } })
  await prisma.claim.deleteMany({ where: { id: { in: claimIds } } })
  await prisma.premiumPayment.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.premium.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.policyRenewal.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.beneficiary.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.insurancePolicy.deleteMany({ where: { id: { in: polIds } } })
  await prisma.insuranceApplication.deleteMany({ where: { customerId: { in: custIds } } })
  await prisma.activityLog.deleteMany({ where: { OR: [{ customerId: { in: custIds } }, { actorUserId: { in: userIds } }, { agentId: { in: agentIds } }] } })
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.customer.deleteMany({ where: { id: { in: custIds } } })
  await prisma.insuranceAgent.deleteMany({ where: { id: { in: agentIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  const { env } = await import('../src/config/env.js')
  for (const d of docs) if (d.fileUrl) fs.rmSync(`${env.UPLOAD_DIR}/${d.fileUrl}`, { force: true })
  console.log(`QA demo data removed (${custIds.length} customers, ${agentIds.length} agents, ${userIds.length} users).`)
}

async function create(outFile) {
  if (!outFile) throw new Error('Pass a file path for the generated credentials.')
  await cleanup()
  const password = `Qa-${crypto.randomBytes(9).toString('base64url')}9`
  const passwordHash = await bcrypt.hash(password, 10)
  const admin = await prisma.user.create({ data: { email: EMAILS.admin, name: 'QA Demo Admin', role: 'ADMIN', passwordHash } })
  const agentUser = await prisma.user.create({ data: { email: EMAILS.agent, name: 'QA Demo Agent', role: 'AGENT', passwordHash } })
  const custUser = await prisma.user.create({ data: { email: EMAILS.customer, name: 'QA Demo Customer', role: 'CUSTOMER', passwordHash } })
  const agent = await prisma.insuranceAgent.create({
    data: {
      agentNumber: 'QA-DEMO-AGT', userId: agentUser.id, firstName: 'QA Demo', lastName: 'Advisor', email: `qa.demo.agentprofile${DOMAIN}`,
      phone: '9000000010', city: 'Testpur', region: 'QA Region', licenseNumber: 'QA-DEMO-LIC', specialization: 'Health',
    },
  })
  const customer = await prisma.customer.create({
    data: {
      customerNumber: 'QA-DEMO-CUST', userId: custUser.id, assignedAgentId: agent.id, firstName: 'QA Demo', lastName: 'Policyholder',
      dateOfBirth: new Date('1991-04-12'), gender: 'Other', email: `qa.demo.customer.profile${DOMAIN}`, phone: '9000000011',
      address: '12 Fictional Road', city: 'Testpur', state: 'QA State', postalCode: '400001', idProofType: 'PAN', maskedIdProofNumber: 'XXXX-XXXX-QA12',
    },
  })
  const pt = await prisma.policyType.findFirst({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } })
  const actor = { id: admin.id, role: 'ADMIN', name: 'QA Demo Admin' }
  const app = await applicationService.createApplication({ customerId: customer.id, policyTypeId: pt.id, requestedCoverage: 800000, annualIncome: 1200000, assistedByAgentId: agent.id }, { id: agentUser.id, role: 'AGENT' })
  const start = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10)
  const { policy } = await applicationService.approveApplication(app.id, { premiumFrequency: 'QUARTERLY', startDate: start }, actor)
  const premiums = await prisma.premium.findMany({ where: { policyId: policy.id }, orderBy: { dueDate: 'asc' } })
  await premiumService.createPayment({ premiumId: premiums[0].id, amount: Number(premiums[0].amount), paymentMethod: 'UPI', transactionReference: `QA-DEMO-${Date.now()}` }, actor)
  await claimService.createClaim({ customerId: customer.id, policyId: policy.id, claimType: 'Hospitalisation', claimDate: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), claimedAmount: 42000, incidentDescription: 'Fictional QA claim: two-night hospital stay for testing.' }, { id: custUser.id, role: 'CUSTOMER' })
  // A second pending application so the admin queue has something to review
  const pt2 = await prisma.policyType.findFirst({ where: { status: 'ACTIVE', id: { not: pt.id } } })
  if (pt2) await applicationService.createApplication({ customerId: customer.id, policyTypeId: pt2.id, requestedCoverage: 500000 }, { id: custUser.id, role: 'CUSTOMER' })

  fs.writeFileSync(outFile, JSON.stringify({ ...EMAILS, password }, null, 2))
  console.log(`QA demo data created. Credentials written to ${outFile}`)
}

const [mode, out] = process.argv.slice(2)
try {
  if (mode === 'create') await create(out)
  else if (mode === 'cleanup') await cleanup()
  else console.log('Usage: node scripts/qa-fixtures.js create <file> | cleanup')
} finally {
  await prisma.$disconnect()
}
