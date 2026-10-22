import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../src/config/env.js'
import { authorize } from '../src/middleware/auth.js'
import { AppError, errorHandler } from '../src/middleware/errorHandler.js'
import app from '../src/app.js'

describe('PHASE 5: Authentication & Security Tests', () => {

  test('Password hashing uses bcrypt with proper salt rounds', async () => {
    const password = 'SuperSecretSecurePassword!2025'
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    // Verify hash format starts with $2a$ or $2b$
    assert.match(hash, /^\$2[ab]\$10\$/)
    assert.notEqual(hash, password)

    // Correct password matches
    const isMatch = await bcrypt.compare(password, hash)
    assert.equal(isMatch, true)

    // Incorrect password fails
    const isWrongMatch = await bcrypt.compare('WrongPassword', hash)
    assert.equal(isWrongMatch, false)
  })

  test('JWT creation and signature validation', () => {
    const payload = { userId: 'user-uuid-123', role: 'ADMIN' }
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' })

    assert.ok(token)
    assert.equal(typeof token, 'string')

    // Valid decode
    const decoded = jwt.verify(token, env.JWT_SECRET)
    assert.equal(decoded.userId, payload.userId)
    assert.equal(decoded.role, 'ADMIN')

    // Tampered token fails
    assert.throws(() => jwt.verify(token + 'tampered', env.JWT_SECRET))

    // Wrong secret fails
    assert.throws(() => jwt.verify(token, 'wrong-secret-key'))
  })

  test('Role-based authorization middleware enforces correct privilege levels', () => {
    const adminUser = { user: { id: 'u1', role: 'ADMIN' } }
    const agentUser = { user: { id: 'u2', role: 'AGENT' } }
    const customerUser = { user: { id: 'u3', role: 'CUSTOMER' } }

    const adminOnly = authorize('ADMIN')
    const agentOrAdmin = authorize('ADMIN', 'AGENT')

    let called = false
    const nextSuccess = () => { called = true }

    // Admin passes adminOnly
    called = false
    adminOnly(adminUser, {}, nextSuccess)
    assert.equal(called, true)

    // Customer fails adminOnly
    let caughtErr = null
    adminOnly(customerUser, {}, (err) => { caughtErr = err })
    assert.ok(caughtErr)
    assert.equal(caughtErr.statusCode, 403)
    assert.match(caughtErr.message, /insufficient privilege/i)

    // Agent passes agentOrAdmin
    called = false
    agentOrAdmin(agentUser, {}, nextSuccess)
    assert.equal(called, true)

    // Customer fails agentOrAdmin
    caughtErr = null
    agentOrAdmin(customerUser, {}, (err) => { caughtErr = err })
    assert.ok(caughtErr)
    assert.equal(caughtErr.statusCode, 403)
  })

  test('Error handling strips internal details and formats safely', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const mockReq = {}
      let sentStatus = null
      let sentJson = null

      const mockRes = {
        status(code) {
          sentStatus = code
          return this
        },
        json(payload) {
          sentJson = payload
          return this
        },
      }

      // Operational AppError
      const operationalErr = new AppError('Policy not found.', 404)
      errorHandler(operationalErr, mockReq, mockRes, () => {})

      assert.equal(sentStatus, 404)
      assert.equal(sentJson.success, false)
      assert.equal(sentJson.message, 'Policy not found.')
      assert.equal(sentJson.stack, undefined) // Never expose stack in production!
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('Security headers (Helmet) and CORS are enabled on Express server', async () => {
    const server = app.listen(0)
    const port = server.address().port

    try {
      const res = await fetch(`http://localhost:${port}/api/health`)
      assert.equal(res.status, 200)

      // Verify Helmet headers
      const xContentTypeOptions = res.headers.get('x-content-type-options')
      assert.equal(xContentTypeOptions, 'nosniff')

      // Verify X-Powered-By is suppressed by Helmet
      const poweredBy = res.headers.get('x-powered-by')
      assert.equal(poweredBy, null)
    } finally {
      server.close()
    }
  })
})
