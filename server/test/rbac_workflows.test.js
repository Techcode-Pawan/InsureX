// End-to-end RBAC, data-isolation and business-workflow tests against the real Express app
// and PostgreSQL database. All fixtures are fictional (@example.test, "QA RBAC" names) and are
// removed in teardown. Pre-existing records are never modified.
//
// Run: cd server && node --test test/rbac_workflows.test.js
process.env.NODE_ENV = 'test'

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import prisma from '../src/config/db.js'

const PORT = 5190
const BASE = `http://localhost:${PORT}/api`
const RUN = Date.now().toString(36)
const PW = 'QaRbac-Passw0rd!'
let server

const ids = { users: [], customers: [], agents: [], policyTypes: [] }
const t = {} // tokens
const f = {} // fixture ids

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const get = (p, token) => call('GET', p, { token })
const post = (p, token, body = {}) => call('POST', p, { token, body })

async function makeUser(role, label) {
  const user = await prisma.user.create({
    data: { email: `qa.${label}.${RUN}@example.test`, name: `QA RBAC ${label}`, role, passwordHash: await bcrypt.hash(PW, 10) },
  })
  ids.users.push(user.id)
  return user
}

async function makeAgent(label, userId) {
  const a = await prisma.insuranceAgent.create({
    data: {
      agentNumber: `QA-AGT-${label}-${RUN}`, userId, firstName: 'QA', lastName: `Agent ${label}`,
      email: `qa.agentprofile.${label}.${RUN}@example.test`, phone: '9000000000', city: 'Testpur', region: 'QA',
      licenseNumber: `QA-LIC-${label}-${RUN}`, specialization: 'Testing',
    },
  })
  ids.agents.push(a.id)
  return a
}

async function login(email) {
  const r = await post('/auth/login', null, { email, password: PW })
  assert.equal(r.status, 200, `login ${email}: ${r.body?.message}`)
  return r.body.data.token
}

const profile = (last4) => ({
  firstName: 'QA', lastName: `Customer ${last4}`, dateOfBirth: '1990-01-15', gender: 'Other', phone: '9000000001',
  address: '1 Fictional Lane', city: 'Testpur', state: 'QA State', postalCode: '400001', idProofType: 'PAN', idProofLast4: last4,
})

before(async () => {
  server = app.listen(PORT)

  const admin = await makeUser('ADMIN', 'admin')
  const agentAUser = await makeUser('AGENT', 'agenta')
  const agentBUser = await makeUser('AGENT', 'agentb')
  f.agentA = (await makeAgent('A', agentAUser.id)).id
  f.agentB = (await makeAgent('B', agentBUser.id)).id
  t.admin = await login(admin.email)
  t.agentA = await login(agentAUser.email)
  t.agentB = await login(agentBUser.email)

  const pt = await prisma.policyType.create({
    data: { typeCode: `QA-${RUN}`, name: `QA RBAC Plan ${RUN}`, description: 'Fictional test plan', coverageDetails: 'Test cover', eligibility: 'Test', terms: 'Test' },
  })
  ids.policyTypes.push(pt.id)
  f.policyType = pt.id

  // Two self-registered customers
  for (const who of ['x', 'y']) {
    const reg = await post('/auth/register', null, { email: `qa.cust${who}.${RUN}@example.test`, password: PW, name: `QA RBAC Cust ${who}` })
    assert.equal(reg.status, 201)
    ids.users.push(reg.body.data.user.id)
    t[who] = reg.body.data.token
    const p = await post('/me/profile', t[who], profile(who === 'x' ? 'AB12' : 'CD34'))
    assert.equal(p.status, 201, p.body?.message)
    ids.customers.push(p.body.data.id)
    f[`cust_${who}`] = p.body.data.id
  }
  // Customer X is serviced by agent A; Y by agent B
  assert.equal((await call('PUT', `/admin/customers/${f.cust_x}/agent`, { token: t.admin, body: { agentId: f.agentA } })).status, 200)
  assert.equal((await call('PUT', `/admin/customers/${f.cust_y}/agent`, { token: t.admin, body: { agentId: f.agentB } })).status, 200)
})

after(async () => {
  const custIds = ids.customers
  const policies = await prisma.insurancePolicy.findMany({ where: { customerId: { in: custIds } }, select: { id: true } })
  const polIds = policies.map((p) => p.id)
  const claims = await prisma.claim.findMany({ where: { customerId: { in: custIds } }, select: { id: true } })
  await prisma.document.deleteMany({ where: { customerId: { in: custIds } } })
  await prisma.claimProcessing.deleteMany({ where: { claimId: { in: claims.map((c) => c.id) } } })
  await prisma.claim.deleteMany({ where: { customerId: { in: custIds } } })
  await prisma.premiumPayment.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.premium.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.policyRenewal.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.beneficiary.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.insurancePolicy.deleteMany({ where: { id: { in: polIds } } })
  await prisma.insuranceApplication.deleteMany({ where: { customerId: { in: custIds } } })
  await prisma.activityLog.deleteMany({ where: { OR: [{ customerId: { in: custIds } }, { actorUserId: { in: ids.users } }, { agentId: { in: ids.agents } }] } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids.users } } })
  await prisma.customer.deleteMany({ where: { id: { in: custIds } } })
  await prisma.insuranceAgent.deleteMany({ where: { id: { in: ids.agents } } })
  await prisma.policyType.deleteMany({ where: { id: { in: ids.policyTypes } } })
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } })
  server.close()
  await prisma.$disconnect()
})

// ── 1. Authentication per role ─────────────────────────────────
test('1. each role authenticates and /auth/me reports the server-side role', async () => {
  for (const [tok, role] of [[t.admin, 'ADMIN'], [t.agentA, 'AGENT'], [t.x, 'CUSTOMER']]) {
    const me = await get('/auth/me', tok)
    assert.equal(me.status, 200)
    assert.equal(me.body.data.role, role)
    assert.equal(me.body.data.passwordHash, undefined, 'password hash must never be returned')
  }
  const bad = await post('/auth/login', null, { email: `qa.admin.${RUN}@example.test`, password: 'wrong-password-1' })
  assert.equal(bad.status, 401)
  assert.equal(bad.body.message, 'Invalid email or password.')
})

test('1b. public registration cannot self-assign ADMIN or AGENT', async () => {
  const r = await post('/auth/register', null, { email: `qa.escalate.${RUN}@example.test`, password: PW, name: 'QA Escalate', role: 'ADMIN' })
  assert.equal(r.status, 201)
  ids.users.push(r.body.data.user.id)
  assert.equal(r.body.data.user.role, 'CUSTOMER')
  assert.equal((await get('/customers', r.body.data.token)).status, 403)
})

test('1c. weak passwords are rejected', async () => {
  const r = await post('/auth/register', null, { email: `qa.weak.${RUN}@example.test`, password: 'short', name: 'QA Weak' })
  assert.equal(r.status, 400)
})

// ── 2/7. Protected routes & direct API attempts ────────────────
test('2. protected endpoints reject anonymous requests with 401', async () => {
  for (const p of ['/customers', '/policies', '/payments', '/claims', '/documents', '/reports/claims', '/admin/overview', '/me/overview', '/agent/overview', '/notifications']) {
    assert.equal((await get(p)).status, 401, p)
  }
  assert.equal((await get('/customers', 'not-a-real-token')).status, 401)
})

test('3/6/7. role matrix: admin-only endpoints refuse agents and customers (403)', async () => {
  const adminOnly = ['/customers', '/policies', '/applications', '/payments', '/premiums', '/claims', '/agents', '/documents', '/renewals', '/reports/claims', '/admin/overview', '/admin/users', '/insurance-companies']
  for (const p of adminOnly) {
    assert.equal((await get(p, t.admin)).status, 200, `admin ${p}`)
    assert.equal((await get(p, t.agentA)).status, 403, `agent ${p}`)
    assert.equal((await get(p, t.x)).status, 403, `customer ${p}`)
  }
  assert.equal((await get('/agent/overview', t.x)).status, 403)
  assert.equal((await get('/me/overview', t.agentA)).status, 403)
  assert.equal((await get('/agent/overview', t.admin)).status, 403, 'admins do not impersonate agent workspace')
  assert.equal((await post(`/applications/00000000-0000-0000-0000-000000000000/approve`, t.agentA, {})).status, 403)
})

// ── 9/10/11. Application → approval → policy & premiums ────────
test('9/10. customer applies; admin approves once; policy and installment schedule are issued', async () => {
  const app1 = await post('/me/applications', t.x, { policyTypeId: f.policyType, requestedCoverage: 1200000, annualIncome: 900000 })
  assert.equal(app1.status, 201, app1.body?.message)
  f.appX = app1.body.data.id
  assert.equal(app1.body.data.customerId, f.cust_x)

  const dup = await post('/me/applications', t.x, { policyTypeId: f.policyType, requestedCoverage: 500000 })
  assert.equal(dup.status, 409, 'second open application for same plan is blocked')

  // Customer-supplied customerId is ignored/rejected (strict schema)
  const spoof = await post('/me/applications', t.y, { policyTypeId: f.policyType, requestedCoverage: 100000, customerId: f.cust_x })
  assert.equal(spoof.status, 400)

  assert.equal((await post(`/applications/${f.appX}/approve`, t.x, {})).status, 403, 'customer cannot approve')
  const ok = await post(`/applications/${f.appX}/approve`, t.admin, { premiumFrequency: 'QUARTERLY', startDate: '2026-01-01' })
  assert.equal(ok.status, 200, ok.body?.message)
  f.policyX = ok.body.data.policy.id
  assert.equal(ok.body.data.premiumsScheduled, 4)
  assert.equal(Number(ok.body.data.policy.premiumAmount), 4500) // 1.5% of 12L / 4

  const again = await post(`/applications/${f.appX}/approve`, t.admin, {})
  assert.equal(again.status, 409, 'duplicate approval prevented')
  const reject = await post(`/applications/${f.appX}/reject`, t.admin, { rejectionReason: 'Too late to reject' })
  assert.equal(reject.status, 400, 'approved application cannot be rejected')

  const count = await prisma.insurancePolicy.count({ where: { applicationId: f.appX } })
  assert.equal(count, 1)

  const notes = await get('/notifications', t.x)
  assert.ok(notes.body.data.some((n) => n.type === 'POLICY_ISSUED'), 'customer notified of issuance')
})

test('11/12. payments: customer submission stays pending until verified; balances are exact', async () => {
  const prem = await get(`/me/premiums?policyId=${f.policyX}`, t.x)
  assert.equal(prem.status, 200)
  const first = prem.body.data[0]
  f.premiumX = first.id
  assert.equal(first.remainingBalance, 4500)

  const over = await post('/me/payments', t.x, { premiumId: first.id, amount: 4500.01, paymentMethod: 'UPI', transactionReference: `QA-OVER-${RUN}` })
  assert.equal(over.status, 400, 'overpayment refused')

  const sub = await post('/me/payments', t.x, { premiumId: first.id, amount: 2000, paymentMethod: 'UPI', transactionReference: `QA-UTR1-${RUN}` })
  assert.equal(sub.status, 201, sub.body?.message)
  assert.equal(sub.body.data.payment.status, 'PENDING')
  assert.equal(sub.body.data.gateway.configured, false)
  let p = await prisma.premium.findUnique({ where: { id: first.id } })
  assert.equal(Number(p.paidAmount), 0, 'pending payment does not change balance')

  const tooMuch = await post('/me/payments', t.x, { premiumId: first.id, amount: 3000, paymentMethod: 'UPI', transactionReference: `QA-UTR2-${RUN}` })
  assert.equal(tooMuch.status, 400, 'pending amounts count against what can still be submitted')

  const dupRef = await post('/me/payments', t.x, { premiumId: first.id, amount: 100, paymentMethod: 'UPI', transactionReference: `QA-UTR1-${RUN}` })
  assert.equal(dupRef.status, 409)

  assert.equal((await post(`/admin/payments/${sub.body.data.payment.id}/verify`, t.x, { decision: 'SUCCESS' })).status, 403)
  const v = await post(`/admin/payments/${sub.body.data.payment.id}/verify`, t.admin, { decision: 'SUCCESS' })
  assert.equal(v.status, 200, v.body?.message)
  assert.equal(v.body.data.premium.remainingBalance, 2500)
  assert.equal(v.body.data.premium.status, 'PARTIALLY_PAID')
  const v2 = await post(`/admin/payments/${sub.body.data.payment.id}/verify`, t.admin, { decision: 'SUCCESS' })
  assert.equal(v2.status, 409, 'payment cannot be applied twice')

  // Admin records an offline confirmed payment for the rest
  const rest = await post('/payments', t.admin, { premiumId: first.id, amount: 2500, paymentMethod: 'BANK_TRANSFER', transactionReference: `QA-NEFT-${RUN}` })
  assert.equal(rest.status, 201, rest.body?.message)
  p = await prisma.premium.findUnique({ where: { id: first.id } })
  assert.equal(p.status, 'PAID')
  assert.equal(Number(p.paidAmount), 4500)
  const paidAgain = await post('/payments', t.admin, { premiumId: first.id, amount: 1, paymentMethod: 'UPI', transactionReference: `QA-X-${RUN}` })
  assert.equal(paidAgain.status, 400)

  // A rejected submission never changes the balance
  const second = prem.body.data[1]
  const s2 = await post('/me/payments', t.x, { premiumId: second.id, amount: 100, paymentMethod: 'UPI', transactionReference: `QA-UTR3-${RUN}` })
  const rj = await post(`/admin/payments/${s2.body.data.payment.id}/verify`, t.admin, { decision: 'FAILED', notes: 'Not found in statement' })
  assert.equal(rj.status, 200)
  assert.equal(Number((await prisma.premium.findUnique({ where: { id: second.id } })).paidAmount), 0)
})

// ── 4/7. Customer isolation (IDOR) ─────────────────────────────
test('4/7. customer Y cannot read or act on customer X records by changing ids', async () => {
  assert.equal((await get(`/me/policies/${f.policyX}`, t.y)).status, 404)
  assert.equal((await get(`/me/applications/${f.appX}`, t.y)).status, 404)
  assert.equal((await post(`/me/applications/${f.appX}/cancel`, t.y)).status, 404)
  const pay = await post('/me/payments', t.y, { premiumId: f.premiumX, amount: 1, paymentMethod: 'UPI', transactionReference: `QA-IDOR-${RUN}` })
  assert.equal(pay.status, 404)
  const claim = await post('/me/claims', t.y, { policyId: f.policyX, claimType: 'Medical', claimDate: '2026-02-01', claimedAmount: 1000, incidentDescription: 'Attempted claim on another customer policy' })
  assert.equal(claim.status, 404)
  const ren = await post('/me/renewals', t.y, { policyId: f.policyX })
  assert.equal(ren.status, 404)
  const yPolicies = await get('/me/policies', t.y)
  assert.equal(yPolicies.body.data.length, 0)
  const yPayments = await get('/me/payments', t.y)
  assert.equal(yPayments.body.data.length, 0)
  assert.equal((await get('/me/policies/not-a-uuid', t.y)).status, 404)
})

// ── 5. Agent isolation ─────────────────────────────────────────
test('5. agents see only their assigned book', async () => {
  const a = await get('/agent/customers', t.agentA)
  assert.equal(a.status, 200)
  const aIds = a.body.data.map((c) => c.id)
  assert.ok(aIds.includes(f.cust_x))
  assert.ok(!aIds.includes(f.cust_y))

  assert.equal((await get(`/agent/customers/${f.cust_x}`, t.agentA)).status, 200)
  assert.equal((await get(`/agent/customers/${f.cust_x}`, t.agentB)).status, 404)
  assert.equal((await get(`/agent/policies/${f.policyX}`, t.agentB)).status, 404)
  assert.equal((await get(`/agent/applications/${f.appX}`, t.agentB)).status, 404)
  assert.equal((await call('PATCH', `/agent/customers/${f.cust_x}`, { token: t.agentB, body: { city: 'Hijack' } })).status, 404)
  const sneaky = await post('/agent/applications', t.agentB, { customerId: f.cust_x, policyTypeId: f.policyType, requestedCoverage: 100000 })
  assert.equal(sneaky.status, 404)

  // Agent may update only contact fields
  const upd = await call('PATCH', `/agent/customers/${f.cust_x}`, { token: t.agentA, body: { city: 'Newtown' } })
  assert.equal(upd.status, 200)
  const forbiddenField = await call('PATCH', `/agent/customers/${f.cust_x}`, { token: t.agentA, body: { status: 'SUSPENDED' } })
  assert.equal(forbiddenField.status, 400)

  // Payment status visible without transaction references
  const prem = await get('/agent/premiums', t.agentA)
  assert.equal(prem.status, 200)
  const withPay = prem.body.data.find((p) => p.payments.length)
  assert.ok(withPay)
  assert.equal(withPay.payments[0].transactionReference, undefined)

  const ov = await get('/agent/overview', t.agentA)
  assert.equal(ov.status, 200)
  assert.equal(ov.body.data.metrics.assignedCustomers, 1)
})

test('5b. agent registers a customer (auto-assigned) and assists an application', async () => {
  const c = await post('/agent/customers', t.agentA, { ...profile('EF56'), email: `qa.agentcust.${RUN}@example.test` })
  assert.equal(c.status, 201, c.body?.message)
  ids.customers.push(c.body.data.id)
  const app = await post('/agent/applications', t.agentA, { customerId: c.body.data.id, policyTypeId: f.policyType, requestedCoverage: 300000 })
  assert.equal(app.status, 201, app.body?.message)
  assert.equal(app.body.data.assistedByAgentId, f.agentA)
  assert.equal((await get(`/agent/applications/${app.body.data.id}`, t.agentB)).status, 404)
})

// ── 13. Claims ─────────────────────────────────────────────────
test('13. claim submission and processing transitions', async () => {
  const bad = await post('/me/claims', t.x, { policyId: f.policyX, claimType: 'Medical', claimDate: '2026-02-01', claimedAmount: 99999999, incidentDescription: 'Amount above sum assured' })
  assert.equal(bad.status, 400)
  const outside = await post('/me/claims', t.x, { policyId: f.policyX, claimType: 'Medical', claimDate: '2025-06-01', claimedAmount: 1000, incidentDescription: 'Before policy start date' })
  assert.equal(outside.status, 400)

  const c = await post('/me/claims', t.x, { policyId: f.policyX, claimType: 'Medical', claimDate: '2026-02-01', claimedAmount: 50000, incidentDescription: 'Fictional hospital admission for testing' })
  assert.equal(c.status, 201, c.body?.message)
  f.claimX = c.body.data.id

  assert.equal((await post(`/claims/${f.claimX}/settle`, t.admin, { settlementMethod: 'NEFT', transactionRef: 'QA-SET-1' })).status, 400, 'cannot settle before approval')
  assert.equal((await post(`/claims/${f.claimX}/approve`, t.agentA, { approvedAmount: 1 })).status, 403)
  assert.equal((await post(`/claims/${f.claimX}/assign`, t.admin, { agentId: f.agentA })).status, 200)
  const over = await post(`/claims/${f.claimX}/approve`, t.admin, { approvedAmount: 60000 })
  assert.equal(over.status, 400)
  assert.equal((await post(`/claims/${f.claimX}/approve`, t.admin, { approvedAmount: 45000 })).status, 200)
  assert.equal((await post(`/claims/${f.claimX}/reject`, t.admin, { rejectionReason: 'Changed mind later' })).status, 400, 'approved claim cannot be rejected')
  assert.equal((await post(`/claims/${f.claimX}/settle`, t.admin, { settlementMethod: 'NEFT', transactionRef: `QA-SET-${RUN}` })).status, 200)
  assert.equal((await post(`/claims/${f.claimX}/settle`, t.admin, { settlementMethod: 'NEFT', transactionRef: 'again' })).status, 400, 'no double settlement')

  const mine = await get(`/me/claims/${f.claimX}`, t.x)
  assert.equal(mine.body.data.status, 'SETTLED')
  assert.equal(mine.body.data.processing.verificationNotes, undefined, 'internal notes hidden from customer')
  assert.equal(mine.body.data.assignedAgent, undefined)
  assert.equal((await get(`/me/claims/${f.claimX}`, t.y)).status, 404)
  assert.equal((await get(`/agent/claims/${f.claimX}`, t.agentB)).status, 404)
})

// ── 14. Renewals ───────────────────────────────────────────────
test('14. renewal request window, single open renewal, and processing', async () => {
  const early = await post('/me/renewals', t.x, { policyId: f.policyX })
  assert.equal(early.status, 400, 'renewal not yet open for a policy expiring in a year+')

  // Move the test policy close to expiry (fixture data only)
  await prisma.insurancePolicy.update({ where: { id: f.policyX }, data: { expiryDate: new Date(Date.now() + 20 * 86400000) } })
  const r = await post('/me/renewals', t.x, { policyId: f.policyX, notes: 'Please renew' })
  assert.equal(r.status, 201, r.body?.message)
  assert.equal((await post('/me/renewals', t.x, { policyId: f.policyX })).status, 409, 'only one open renewal')
  assert.equal((await call('PUT', `/renewals/${r.body.data.id}`, { token: t.admin, body: { policyId: f.policyX } })).status, 400, 'unknown fields rejected')

  const done = await call('PUT', `/renewals/${r.body.data.id}`, { token: t.admin, body: { status: 'RENEWED', paymentReference: `QA-REN-${RUN}` } })
  assert.equal(done.status, 200, done.body?.message)
  const pol = await prisma.insurancePolicy.findUnique({ where: { id: f.policyX } })
  assert.equal(pol.expiryDate.toISOString(), new Date(r.body.data.newExpiryDate).toISOString())
  assert.equal((await call('PUT', `/renewals/${r.body.data.id}`, { token: t.admin, body: { status: 'LAPSED' } })).status, 409, 'final renewal state is locked')
  const renewalPremium = await prisma.premium.findFirst({ where: { policyId: f.policyX, amount: r.body.data.renewalPremium } })
  assert.ok(renewalPremium, 'renewal premium billed')
})

// ── 8/15. CRUD + persistence ───────────────────────────────────
test('8/15. updates persist in PostgreSQL and are visible on a fresh read', async () => {
  const u = await call('PATCH', '/me/profile', { token: t.x, body: { phone: '9876543210' } })
  assert.equal(u.status, 200)
  const fresh = await get('/me/profile', t.x)
  assert.equal(fresh.body.data.phone, '9876543210')
  const row = await prisma.customer.findUnique({ where: { id: f.cust_x } })
  assert.equal(row.phone, '9876543210')
  const locked = await call('PATCH', '/me/profile', { token: t.x, body: { firstName: 'Changed' } })
  assert.equal(locked.status, 400, 'identity fields cannot be self-edited')
})

test('admin dashboard metrics are computed from the database', async () => {
  const ov = await get('/admin/overview', t.admin)
  assert.equal(ov.status, 200)
  const dbActive = await prisma.insurancePolicy.count({ where: { status: 'ACTIVE' } })
  assert.equal(ov.body.data.metrics.activePolicies, dbActive)
  const dbCustomers = await prisma.customer.count()
  assert.equal(ov.body.data.metrics.totalCustomers, dbCustomers)
})

test('notifications are private to their owner', async () => {
  const mine = await get('/notifications', t.x)
  const n = mine.body.data[0]
  assert.ok(n)
  const other = await post(`/notifications/${n.id}/read`, t.y)
  assert.equal(other.body.updated, 0, 'another user cannot mark it read')
  const yList = await get('/notifications', t.y)
  assert.ok(!yList.body.data.some((x) => x.id === n.id))
})

test('admin password reset: only admins, weak passwords refused, old sessions and password stop working', async () => {
  const email = `qa.custy.${RUN}@example.test`
  const target = await prisma.user.findUnique({ where: { email } })
  const before = await login(email)
  assert.equal((await post(`/admin/users/${target.id}/reset-password`, t.agentA, { temporaryPassword: 'Temp-Passw0rd1' })).status, 403)
  assert.equal((await post(`/admin/users/${target.id}/reset-password`, t.admin, { temporaryPassword: 'weak' })).status, 400)
  const ok = await post(`/admin/users/${target.id}/reset-password`, t.admin, { temporaryPassword: 'Temp-Passw0rd1' })
  assert.equal(ok.status, 200)
  assert.equal((await get('/me/overview', before)).status, 401, 'existing session revoked')
  assert.equal((await post('/auth/login', null, { email, password: PW })).status, 401, 'old password rejected')
  const fresh = await post('/auth/login', null, { email, password: 'Temp-Passw0rd1' })
  assert.equal(fresh.status, 200)
  t.y = fresh.body.data.token
})

// ── 16. Logout, revocation, deactivation ───────────────────────
test('16. logout revokes the token; deactivation ends sessions', async () => {
  const tok = await login(`qa.agentb.${RUN}@example.test`)
  assert.equal((await get('/agent/overview', tok)).status, 200)
  assert.equal((await post('/auth/logout', tok)).status, 200)
  assert.equal((await get('/agent/overview', tok)).status, 401)
  assert.equal((await get('/agent/overview', t.agentB)).status, 401, 'logout revokes all of that user\'s sessions')

  const target = await prisma.user.findUnique({ where: { email: `qa.agentb.${RUN}@example.test` } })
  const fresh = await login(target.email)
  assert.equal((await call('PATCH', `/admin/users/${target.id}`, { token: t.admin, body: { isActive: false } })).status, 200)
  assert.equal((await get('/agent/overview', fresh)).status, 401)
  assert.equal((await post('/auth/login', null, { email: target.email, password: PW })).status, 403, 'deactivated account is refused with an explanation')
})
