// Analytics, agent self-service and customer beneficiary endpoints: access control, data
// isolation and business rules against the real database. Fixtures are fictional
// (@example.test) and every created id is tracked and removed in teardown.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import prisma from '../src/config/db.js'

const PORT = 5191
const BASE = `http://localhost:${PORT}/api`
const RUN = `an${Date.now().toString(36)}`
const PW = 'QaAnalytics-Passw0rd'
let server
const ids = { users: [], customers: [], agents: [], policyTypes: [] }
const t = {}
const f = {}

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

async function user(role, label) {
  const u = await prisma.user.create({ data: { email: `qa.${label}.${RUN}@example.test`, name: `QA ${label}`, role, passwordHash: await bcrypt.hash(PW, 10) } })
  ids.users.push(u.id)
  const r = await post('/auth/login', null, { email: u.email, password: PW })
  assert.equal(r.status, 200)
  return { user: u, token: r.body.data.token }
}
async function agentProfile(label, userId) {
  const a = await prisma.insuranceAgent.create({
    data: {
      agentNumber: `QA-AN-${label}-${RUN}`, userId, firstName: 'QA', lastName: `Analyst ${label}`, email: `qa.anagent.${label}.${RUN}@example.test`,
      phone: '9000000000', city: 'Testpur', region: 'QA', licenseNumber: `QA-AN-LIC-${label}-${RUN}`, specialization: 'Testing',
    },
  })
  ids.agents.push(a.id)
  return a
}
const profile = (last4) => ({
  firstName: 'QA', lastName: `Holder ${last4}`, dateOfBirth: '1990-01-15', gender: 'Other', phone: '9000000001',
  address: '1 Fictional Lane', city: `QaCity${RUN}`, state: 'QA State', postalCode: '400001', idProofType: 'PAN', idProofLast4: last4,
})

before(async () => {
  server = app.listen(PORT)
  t.admin = (await user('ADMIN', 'anadmin')).token
  const a1 = await user('AGENT', 'anagent1')
  const a2 = await user('AGENT', 'anagent2')
  f.agent1 = (await agentProfile('1', a1.user.id)).id
  f.agent2 = (await agentProfile('2', a2.user.id)).id
  t.agent1 = a1.token
  t.agent2 = a2.token
  const pt = await prisma.policyType.create({
    data: { typeCode: `QA-AN-${RUN}`, name: `QA Analytics Plan ${RUN}`, description: 'Fictional test plan', coverageDetails: 'Test', eligibility: 'Test', terms: 'Test' },
  })
  ids.policyTypes.push(pt.id)
  f.pt = pt.id
  for (const who of ['x', 'y']) {
    const reg = await post('/auth/register', null, { email: `qa.an${who}.${RUN}@example.test`, password: PW, name: `QA An ${who}` })
    ids.users.push(reg.body.data.user.id)
    t[who] = reg.body.data.token
    const p = await post('/me/profile', t[who], profile(who === 'x' ? 'AN11' : 'AN22'))
    assert.equal(p.status, 201, p.body?.message)
    ids.customers.push(p.body.data.id)
    f[`cust_${who}`] = p.body.data.id
  }
  await call('PUT', `/admin/customers/${f.cust_x}/agent`, { token: t.admin, body: { agentId: f.agent1 } })
  await call('PUT', `/admin/customers/${f.cust_y}/agent`, { token: t.admin, body: { agentId: f.agent2 } })
  // X gets an active policy via the real workflow; Y keeps a pending application
  const appX = await post('/me/applications', t.x, { policyTypeId: f.pt, requestedCoverage: 400000 })
  const ok = await post(`/applications/${appX.body.data.id}/approve`, t.admin, {})
  assert.equal(ok.status, 200, ok.body?.message)
  f.policyX = ok.body.data.policy.id
  const appY = await post('/agent/applications', t.agent2, { customerId: f.cust_y, policyTypeId: f.pt, requestedCoverage: 250000 })
  assert.equal(appY.status, 201, appY.body?.message)
  f.appY = appY.body.data.id
})

after(async () => {
  const custIds = ids.customers
  const polIds = (await prisma.insurancePolicy.findMany({ where: { customerId: { in: custIds } }, select: { id: true } })).map((p) => p.id)
  await prisma.beneficiary.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.premiumPayment.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.premium.deleteMany({ where: { policyId: { in: polIds } } })
  await prisma.policyRenewal.deleteMany({ where: { policyId: { in: polIds } } })
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

test('analytics endpoints are role-restricted', async () => {
  assert.equal((await get('/admin/analytics')).status, 401)
  assert.equal((await get('/admin/analytics', t.agent1)).status, 403)
  assert.equal((await get('/admin/analytics', t.x)).status, 403)
  assert.equal((await get('/agent/analytics', t.x)).status, 403)
  assert.equal((await get('/agent/analytics', t.admin)).status, 403)
  assert.equal((await get('/admin/analytics', t.admin)).status, 200)
  assert.equal((await get('/agent/analytics', t.agent1)).status, 200)
})

test('agent analytics only counts the agent\'s own book, and agentId cannot widen it', async () => {
  const mine = await get(`/agent/analytics?agentId=${f.agent2}`, t.agent1)
  assert.equal(mine.status, 200)
  assert.equal(mine.body.data.kpis.customers, 1)
  assert.equal(mine.body.data.kpis.activePolicies, 1)
  assert.equal(mine.body.data.kpis.applicationsPending, 0, 'agent 2\'s pending application must not leak')
  assert.equal(mine.body.data.filters.agentId, f.agent1)
  assert.equal(mine.body.data.kpis.agents, undefined)
  assert.equal(mine.body.data.breakdowns.agentPerformance, undefined)
  const two = await get('/agent/analytics', t.agent2)
  assert.equal(two.body.data.kpis.applicationsPending, 1)
  assert.equal(two.body.data.kpis.activePolicies, 0)
})

test('admin analytics filters narrow results and invalid ranges are rejected', async () => {
  const byAgent = await get(`/admin/analytics?agentId=${f.agent2}`, t.admin)
  assert.equal(byAgent.body.data.kpis.customers, 1)
  assert.equal(byAgent.body.data.kpis.applicationsPending, 1)
  const byType = await get(`/admin/analytics?policyTypeId=${f.pt}`, t.admin)
  assert.equal(byType.body.data.kpis.activePolicies, 1)
  assert.equal(byType.body.data.kpis.applications, 2)
  assert.equal((await get('/admin/analytics?from=2026-10-10&to=2026-01-01', t.admin)).status, 400)
  assert.equal((await get('/admin/analytics?granularity=year', t.admin)).status, 400)
  const day = await get('/admin/analytics?from=2026-10-01&to=2026-10-07&granularity=day', t.admin)
  assert.equal(day.body.data.series.applications.length, 7, 'every day in range is present, zero-filled')
})

test('pending payments are never counted as verified collections', async () => {
  const prem = (await get(`/me/premiums?policyId=${f.policyX}`, t.x)).body.data[0]
  const before = (await get(`/admin/analytics?policyTypeId=${f.pt}`, t.admin)).body.data.kpis
  const sub = await post('/me/payments', t.x, { premiumId: prem.id, amount: 1000, paymentMethod: 'UPI', transactionReference: `QA-AN-${RUN}` })
  assert.equal(sub.status, 201)
  const after = (await get(`/admin/analytics?policyTypeId=${f.pt}`, t.admin)).body.data.kpis
  assert.equal(after.verifiedCollectionsInRange, before.verifiedCollectionsInRange)
  assert.equal(after.pendingVerifications, before.pendingVerifications + 1)
  assert.equal(after.pendingVerificationAmount, before.pendingVerificationAmount + 1000)
  await post(`/admin/payments/${sub.body.data.payment.id}/verify`, t.admin, { decision: 'SUCCESS' })
  const verified = (await get(`/admin/analytics?policyTypeId=${f.pt}`, t.admin)).body.data.kpis
  assert.equal(verified.verifiedCollectionsInRange, before.verifiedCollectionsInRange + 1000)
  assert.equal(verified.pendingVerifications, before.pendingVerifications)
})

test('agent profile: own record only, admin-controlled fields rejected', async () => {
  const me = await get('/agent/profile', t.agent1)
  assert.equal(me.status, 200)
  assert.equal(me.body.data.id, f.agent1)
  const upd = await call('PATCH', '/agent/profile', { token: t.agent1, body: { phone: '9876543210', bio: 'QA bio' } })
  assert.equal(upd.status, 200)
  assert.equal((await prisma.insuranceAgent.findUnique({ where: { id: f.agent1 } })).phone, '9876543210')
  for (const body of [{ commissionRate: 40 }, { status: 'ACTIVE' }, { licenseNumber: 'X' }, { email: 'x@example.test' }]) {
    assert.equal((await call('PATCH', '/agent/profile', { token: t.agent1, body })).status, 400, JSON.stringify(body))
  }
  assert.equal((await get('/agent/profile', t.x)).status, 403)
})

test('agent application edit: own pending applications only', async () => {
  assert.equal((await call('PATCH', `/agent/applications/${f.appY}`, { token: t.agent1, body: { requestedCoverage: 1 } })).status, 404, 'other agent\'s application is invisible')
  const ok = await call('PATCH', `/agent/applications/${f.appY}`, { token: t.agent2, body: { requestedCoverage: 300000, nomineeName: 'QA Nominee' } })
  assert.equal(ok.status, 200, ok.body?.message)
  assert.equal(Number(ok.body.data.requestedCoverage), 300000)
  assert.equal((await call('PATCH', `/agent/applications/${f.appY}`, { token: t.agent2, body: { status: 'APPROVED' } })).status, 400, 'status cannot be set')
  await post(`/applications/${f.appY}/reject`, t.admin, { rejectionReason: 'QA rejection reason' })
  assert.equal((await call('PATCH', `/agent/applications/${f.appY}`, { token: t.agent2, body: { requestedCoverage: 5 } })).status, 400, 'decided applications are locked')
})

test('agent activity history is limited to the agent\'s book', async () => {
  const a1 = await get('/agent/activity?limit=100', t.agent1)
  assert.equal(a1.status, 200)
  const a2 = await get('/agent/activity?limit=100', t.agent2)
  const ids1 = new Set(a1.body.data.map((x) => x.id))
  assert.ok(a2.body.data.every((x) => !ids1.has(x.id) || x.customerId === null), 'no customer events shared across agents')
  assert.ok(a1.body.data.every((x) => x.customerId === null || x.customerId === f.cust_x))
})

test('customer beneficiaries: CRUD on own policy, 100% rule, IDOR blocked', async () => {
  const add = await post('/me/beneficiaries', t.x, { policyId: f.policyX, name: 'QA Spouse', relationship: 'Spouse', allocationPercentage: 60 })
  assert.equal(add.status, 201, add.body?.message)
  const id = add.body.data.id
  assert.equal(add.body.data.idProofNumber, undefined, 'no internal identity fields returned')
  assert.equal((await post('/me/beneficiaries', t.x, { policyId: f.policyX, name: 'QA Child', relationship: 'Child', allocationPercentage: 50 })).status, 400, '110% refused')
  assert.equal((await post('/me/beneficiaries', t.y, { policyId: f.policyX, name: 'QA Intruder', relationship: 'Other', allocationPercentage: 10 })).status, 404)
  assert.equal((await call('PUT', `/me/beneficiaries/${id}`, { token: t.y, body: { allocationPercentage: 1 } })).status, 404)
  assert.equal((await call('DELETE', `/me/beneficiaries/${id}`, { token: t.y })).status, 404)
  assert.equal((await call('PUT', `/me/beneficiaries/${id}`, { token: t.x, body: { policyId: f.policyX } })).status, 400, 'strict schema')
  const upd = await call('PUT', `/me/beneficiaries/${id}`, { token: t.x, body: { allocationPercentage: 100 } })
  assert.equal(upd.status, 200, upd.body?.message)
  assert.equal(Number(upd.body.data.allocationPercentage), 100)
  assert.equal((await get('/me/beneficiaries', t.y)).body.data.length, 0)
  assert.equal((await call('DELETE', `/me/beneficiaries/${id}`, { token: t.x })).status, 200)
  assert.equal(await prisma.beneficiary.count({ where: { id } }), 0)
})

test('public insurer catalogue exposes only public fields', async () => {
  const r = await get('/catalog/companies')
  assert.equal(r.status, 200)
  for (const c of r.body.data) {
    assert.equal(c.registrationNumber, undefined)
    assert.equal(c.solvencyRatio, undefined)
    assert.ok(Array.isArray(c.plans))
  }
})
