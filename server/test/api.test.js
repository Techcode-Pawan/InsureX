import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import prisma from '../src/config/db.js'
import { signToken } from '../src/middleware/auth.js'

// Admin-only endpoints now require authentication, so validation is exercised as a
// temporary fictional admin (created here, removed in teardown).
let adminUser
let AUTH = {}

describe('PHASE 3: Backend API Endpoint & Validation Tests', () => {
  before(async () => {
    adminUser = await prisma.user.create({
      data: { email: `qa.apitest.${Date.now()}@example.test`, name: 'QA API Test Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(`x-${Date.now()}-unused`, 4) },
    })
    AUTH = { Authorization: `Bearer ${signToken(adminUser)}` }
  })

  after(async () => {
    await prisma.activityLog.deleteMany({ where: { actorUserId: adminUser.id } })
    await prisma.user.delete({ where: { id: adminUser.id } })
  })

  // Helper to run ephemeral test requests against Express app
  async function withServer(fn) {
    const server = app.listen(0)
    const port = server.address().port
    const baseUrl = `http://localhost:${port}/api`
    try {
      await fn(baseUrl)
    } finally {
      server.close()
    }
  }

  // 1. System Health
  test('GET /api/health should return online status and version', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/health`)
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(data.status, 'online')
      assert.equal(data.system, 'InsureX Insurance Management System API')
      assert.ok(data.timestamp)
    })
  })

  // 2. Auth Endpoints Validation
  test('POST /api/auth/register validates schema and rejects invalid payloads', async () => {
    await withServer(async (base) => {
      // Invalid email & short password
      const res = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad-email', password: '123' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.equal(data.message, 'Validation failed.')
      assert.ok(Array.isArray(data.errors))
      assert.ok(data.errors.some(e => e.field === 'email'))
    })
  })

  test('POST /api/auth/login requires non-empty password', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@insurex.com', password: '' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'password'))
    })
  })

  // 3. Customers Endpoint Validation
  test('POST /api/customers rejects payload missing required demographic fields', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ firstName: 'Aarav' }), // missing lastName, email, phone, etc.
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'lastName'))
      assert.ok(data.errors.some(e => e.field === 'email'))
    })
  })

  // 4. Policy Types Endpoint Validation
  test('POST /api/policy-types rejects payload missing mandatory typeCode or coverage', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/policy-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ name: 'Term Life Basic' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'typeCode'))
      assert.ok(data.errors.some(e => e.field === 'description'))
    })
  })

  // 5. Policies Endpoint Validation
  test('POST /api/policies validates UUID references and numeric monetary values', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          customerId: 'not-a-valid-uuid',
          policyTypeId: 'also-invalid',
          sumAssured: -100, // Negative amount
          premiumAmount: 0,
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'customerId'))
      assert.ok(data.errors.some(e => e.field === 'sumAssured'))
    })
  })

  // 6. Applications Endpoint Validation
  test('POST /api/applications rejects negative coverage requests', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          customerId: '550e8400-e29b-41d4-a716-446655440000',
          policyTypeId: '550e8400-e29b-41d4-a716-446655440001',
          requestedCoverage: -50000,
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'requestedCoverage'))
    })
  })

  test('POST /api/applications/:id/reject requires minimum 5-character reason', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/applications/550e8400-e29b-41d4-a716-446655440000/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ rejectionReason: 'No' }), // too short
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'rejectionReason'))
    })
  })

  // 7. Payments Endpoint Validation
  test('POST /api/payments rejects invalid payment method and non-positive amount', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          premiumId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 0,
          paymentMethod: 'GOLD_COINS',
          transactionReference: 'TXN-1234',
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'amount'))
      assert.ok(data.errors.some(e => e.field === 'paymentMethod'))
    })
  })

  // 8. Beneficiaries Endpoint Validation
  test('POST /api/beneficiaries rejects allocation exceeding 100%', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          policyId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Primary Beneficiary',
          relationship: 'Spouse',
          allocationPercentage: 150, // exceeds 100%
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'allocationPercentage'))
    })
  })

  // 9. Claims Endpoint Validation
  test('POST /api/claims rejects incident description shorter than 10 characters', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          customerId: '550e8400-e29b-41d4-a716-446655440000',
          policyId: '550e8400-e29b-41d4-a716-446655440001',
          claimType: 'Hospitalization',
          claimDate: '2025-06-15',
          claimedAmount: 45000,
          incidentDescription: 'hurt', // shorter than 10 chars
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'incidentDescription'))
    })
  })

  test('POST /api/claims/:id/reject rejects empty rejectionReason', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/claims/550e8400-e29b-41d4-a716-446655440000/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ rejectionReason: '   ' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'rejectionReason'))
    })
  })

  test('POST /api/claims/:id/settle requires valid settlement method and transactionRef', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/claims/550e8400-e29b-41d4-a716-446655440000/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ settlementMethod: '' }), // missing transactionRef & empty method
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'settlementMethod'))
      assert.ok(data.errors.some(e => e.field === 'transactionRef'))
    })
  })

  // 10. Agents Endpoint Validation
  test('POST /api/agents requires valid email, phone, and licenseNumber', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          firstName: 'Rajesh',
          lastName: 'Sharma',
          email: 'invalid-email',
          phone: '123', // less than 10 digits
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'email'))
      assert.ok(data.errors.some(e => e.field === 'licenseNumber'))
    })
  })

  // 11. Documents Endpoint Validation
  test('POST /api/documents requires customerId UUID and documentType', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ name: 'Aadhaar Card' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'customerId'))
      assert.ok(data.errors.some(e => e.field === 'documentType'))
    })
  })

  // 12. Renewals Endpoint Validation
  test('POST /api/renewals requires renewalPremium and valid date formats', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/renewals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({
          policyId: '550e8400-e29b-41d4-a716-446655440000',
          newStartDate: 'not-a-date',
          renewalPremium: -500,
        }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'renewalPremium'))
    })
  })

  // 13. Insurance Companies Endpoint Validation
  test('POST /api/insurance-companies requires registrationNumber and email', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/insurance-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH },
        body: JSON.stringify({ name: 'HDFC ERGO General Insurance' }),
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.errors.some(e => e.field === 'registrationNumber'))
      assert.ok(data.errors.some(e => e.field === 'email'))
    })
  })

  // 14. 404 Routing Protection
  test('Admin-only endpoints reject anonymous requests', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      assert.equal(res.status, 401)
    })
  })

  test('Undefined endpoint returns structured 404 response', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/undefined-module-xyz`)
      assert.equal(res.status, 404)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.match(data.message, /not found/i)
    })
  })
})
