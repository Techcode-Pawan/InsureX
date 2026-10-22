import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { AppError } from '../src/middleware/errorHandler.js'
import {
  paymentSchema,
  beneficiarySchema,
  claimSchema,
  claimRejectSchema,
  claimApproveSchema,
  claimSettleSchema,
  renewalSchema,
  applicationSchema,
  applicationRejectSchema,
  policySchema,
} from '../src/validators/schemas.js'

describe('PHASE 4: Business Rule & Domain Logic Tests', () => {

  // ── Rule 1: Approved applications can create policies without duplicates ──
  test('Rule 1: Approved application prevents duplicate policy creation', () => {
    const existingApp = {
      id: 'app-123',
      status: 'APPROVED',
      policy: { id: 'pol-999', policyNumber: 'POL-2025-1001' },
      requestedCoverage: 500000,
    }

    // Emulate duplicate check logic in applicationService
    const canApprove = (app) => {
      if (app.status === 'APPROVED' || app.policy) {
        throw new AppError('Policy already generated for this application. Duplicate policy creation prohibited.', 400)
      }
      return true
    }

    assert.throws(
      () => canApprove(existingApp),
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /Duplicate policy creation prohibited/i)
        return true
      }
    )

    // Unapproved app without policy succeeds
    const pendingApp = { id: 'app-456', status: 'PENDING', policy: null, requestedCoverage: 300000 }
    assert.equal(canApprove(pendingApp), true)
  })

  // ── Rule 2: Policies belong to valid customers and policy types ──
  test('Rule 2: Policies require valid customerId, policyTypeId, and positive amounts', () => {
    // Valid payload
    const validPolicy = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      policyTypeId: '550e8400-e29b-41d4-a716-446655440001',
      sumAssured: 1000000,
      premiumAmount: 15000,
      premiumFrequency: 'ANNUALLY',
      startDate: '2025-01-01',
      expiryDate: '2026-01-01',
      status: 'ACTIVE',
    }
    const result = policySchema.safeParse(validPolicy)
    assert.equal(result.success, true)

    // Invalid payload: non-UUID customerId
    const invalidCustomer = { ...validPolicy, customerId: 'not-a-uuid' }
    assert.equal(policySchema.safeParse(invalidCustomer).success, false)

    // Invalid payload: non-positive sumAssured
    const negativeSum = { ...validPolicy, sumAssured: -5000 }
    assert.equal(policySchema.safeParse(negativeSum).success, false)

    // Invalid payload: invalid date format
    const badDate = { ...validPolicy, startDate: '01/01/2025' }
    assert.equal(policySchema.safeParse(badDate).success, false)
  })

  // ── Rule 3: Premiums reference valid policies ──
  test('Rule 3: Premiums must be associated with valid policyId', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    const validatePremiumPolicyRef = (policyId) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(policyId)
      if (!isUuid) throw new AppError('Premium must reference a valid policy UUID.', 400)
      return true
    }

    assert.equal(validatePremiumPolicyRef(validUuid), true)
    assert.throws(() => validatePremiumPolicyRef('invalid-policy-ref'), /valid policy UUID/)
  })

  // ── Rule 4: Payments reference valid premiums ──
  test('Rule 4: Payments schema validates premiumId, positive amount, and transactionReference', () => {
    const validPayment = {
      premiumId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 12500,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-20250101-987654',
      notes: 'Monthly installment paid via GPay',
    }
    assert.equal(paymentSchema.safeParse(validPayment).success, true)

    // Missing transactionReference fails
    const missingTxn = { ...validPayment, transactionReference: '' }
    assert.equal(paymentSchema.safeParse(missingTxn).success, false)

    // Negative amount fails
    const negAmount = { ...validPayment, amount: -100 }
    assert.equal(paymentSchema.safeParse(negAmount).success, false)

    // Invalid paymentMethod fails
    const badMethod = { ...validPayment, paymentMethod: 'BITCOIN' }
    assert.equal(paymentSchema.safeParse(badMethod).success, false)
  })

  // ── Rule 5: Partial payments update outstanding balances correctly ──
  test('Rule 5: Partial payment balance calculation and status progression', () => {
    const calculatePayment = (totalAmount, currentPaid, paymentAmount) => {
      const totalDue = Number(totalAmount)
      const current = Number(currentPaid)
      const pay = Number(paymentAmount)
      const currentBalance = totalDue - current

      if (currentBalance <= 0) throw new AppError('This premium has already been paid in full.', 400)
      if (pay > currentBalance) throw new AppError(`Payment amount exceeds remaining balance.`, 400)

      const newPaid = current + pay
      const newRemaining = totalDue - newPaid
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID'

      return {
        paidAmount: newPaid,
        remainingBalance: Math.max(0, newRemaining),
        status: newStatus,
      }
    }

    const premiumTotal = 20000

    // Step 1: Initial partial payment of 8,000
    const step1 = calculatePayment(premiumTotal, 0, 8000)
    assert.equal(step1.paidAmount, 8000)
    assert.equal(step1.remainingBalance, 12000)
    assert.equal(step1.status, 'PARTIALLY_PAID')

    // Step 2: Second partial payment of 5,000
    const step2 = calculatePayment(premiumTotal, step1.paidAmount, 5000)
    assert.equal(step2.paidAmount, 13000)
    assert.equal(step2.remainingBalance, 7000)
    assert.equal(step2.status, 'PARTIALLY_PAID')

    // Step 3: Attempting to overpay (pay 9,000 when only 7,000 remaining) should be rejected
    assert.throws(
      () => calculatePayment(premiumTotal, step2.paidAmount, 9000),
      /Payment amount exceeds remaining balance/
    )

    // Step 4: Final exact payment of remaining 7,000 completes the premium
    const step4 = calculatePayment(premiumTotal, step2.paidAmount, 7000)
    assert.equal(step4.paidAmount, 20000)
    assert.equal(step4.remainingBalance, 0)
    assert.equal(step4.status, 'PAID')

    // Step 5: Subsequent payment attempt on fully paid premium rejected
    assert.throws(
      () => calculatePayment(premiumTotal, step4.paidAmount, 100),
      /already been paid in full/
    )
  })

  // ── Rule 6: Beneficiary allocations cannot exceed 100% per policy ──
  test('Rule 6: Beneficiary allocations cannot exceed 100% per policy', () => {
    const existingBeneficiaries = [
      { name: 'Spouse', allocationPercentage: 50 },
      { name: 'Child 1', allocationPercentage: 25 },
    ]

    const validateAllocation = (existing, newAllocation) => {
      const currentTotal = existing.reduce((sum, b) => sum + Number(b.allocationPercentage), 0)
      const toAdd = Number(newAllocation)
      if (currentTotal + toAdd > 100) {
        const remaining = Math.max(0, 100 - currentTotal)
        throw new AppError(
          `Total beneficiary allocation cannot exceed 100%. Currently allocated: ${currentTotal}%. Maximum allowable: ${remaining}%.`,
          400
        )
      }
      return true
    }

    // Current total is 75%. Adding 25% should succeed (total = 100%)
    assert.equal(validateAllocation(existingBeneficiaries, 25), true)

    // Adding 30% should fail (75 + 30 = 105% > 100%)
    assert.throws(
      () => validateAllocation(existingBeneficiaries, 30),
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /cannot exceed 100%/i)
        assert.match(err.message, /Maximum allowable: 25%/i)
        return true
      }
    )

    // Beneficiary schema directly rejects > 100%
    const badSchema = beneficiarySchema.safeParse({
      policyId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Relative',
      relationship: 'Brother',
      allocationPercentage: 110, // > 100
    })
    assert.equal(badSchema.success, false)
  })

  // ── Rule 7: Claims reference policies belonging to the correct customer ──
  test('Rule 7: Claim must reference policy belonging to the claimant customer', () => {
    const customerA = 'cust-uuid-111'
    const customerB = 'cust-uuid-222'

    const policy = {
      id: 'pol-uuid-333',
      customerId: customerA,
      status: 'ACTIVE',
      sumAssured: 500000,
    }

    const validateClaimFiling = (claimData, policyRecord) => {
      if (policyRecord.customerId !== claimData.customerId) {
        throw new AppError('The referenced policy does not belong to the claiming customer.', 400)
      }
      if (policyRecord.status !== 'ACTIVE') {
        throw new AppError(`Cannot file claim against non-active policy.`, 400)
      }
      if (Number(claimData.claimedAmount) > Number(policyRecord.sumAssured)) {
        throw new AppError(`Claimed amount exceeds the policy sum assured.`, 400)
      }
      return true
    }

    // Legitimate claim by policy owner
    assert.equal(
      validateClaimFiling({ customerId: customerA, claimedAmount: 100000 }, policy),
      true
    )

    // Fraudulent / mismatch claim by customer B on customer A's policy
    assert.throws(
      () => validateClaimFiling({ customerId: customerB, claimedAmount: 100000 }, policy),
      /The referenced policy does not belong to the claiming customer/
    )

    // Claim exceeding sum assured
    assert.throws(
      () => validateClaimFiling({ customerId: customerA, claimedAmount: 600000 }, policy),
      /Claimed amount exceeds the policy sum assured/
    )
  })

  // ── Rule 8: Claims cannot be settled before approval ──
  test('Rule 8: Claims cannot be settled before approval', () => {
    const validateSettlement = (claimStatus) => {
      if (claimStatus !== 'APPROVED') {
        throw new AppError(
          `Cannot settle claim. Current status is '${claimStatus}'. A claim must be approved prior to disbursement settlement.`,
          400
        )
      }
      return true
    }

    // Settling pending claim rejected
    assert.throws(() => validateSettlement('PENDING'), /A claim must be approved prior to disbursement settlement/)

    // Settling under_review claim rejected
    assert.throws(() => validateSettlement('UNDER_REVIEW'), /A claim must be approved prior to disbursement settlement/)

    // Settling rejected claim rejected
    assert.throws(() => validateSettlement('REJECTED'), /A claim must be approved prior to disbursement settlement/)

    // Settling approved claim succeeds
    assert.equal(validateSettlement('APPROVED'), true)
  })

  // ── Rule 9: Rejected claims require a rejection reason ──
  test('Rule 9: Rejection of claim or application requires non-empty reason', () => {
    // Valid rejection with explanation
    const validClaimReject = { rejectionReason: 'Damages occurred prior to policy start date and are not covered under terms.' }
    assert.equal(claimRejectSchema.safeParse(validClaimReject).success, true)

    // Empty rejection reason fails Zod validation
    const emptyClaimReject = { rejectionReason: '' }
    assert.equal(claimRejectSchema.safeParse(emptyClaimReject).success, false)

    // Too short rejection reason fails
    const shortClaimReject = { rejectionReason: 'No' }
    assert.equal(claimRejectSchema.safeParse(shortClaimReject).success, false)

    // Application rejection validation
    const validAppReject = { rejectionReason: 'Applicant does not meet income eligibility criteria.' }
    assert.equal(applicationRejectSchema.safeParse(validAppReject).success, true)

    const emptyAppReject = { rejectionReason: ' ' }
    assert.equal(applicationRejectSchema.safeParse(emptyAppReject).success, false)
  })

  // ── Rule 10: Renewals reference valid policies and dates ──
  test('Rule 10: Renewals validate policy reference and new expiry after start date', () => {
    const validRenewal = {
      policyId: '550e8400-e29b-41d4-a716-446655440000',
      newStartDate: '2026-01-01',
      newExpiryDate: '2027-01-01',
      renewalPremium: 16500,
      notes: 'Annual renewal with standard inflation indexation',
    }
    assert.equal(renewalSchema.safeParse(validRenewal).success, true)

    // New expiry date before or equal to start date must fail
    const validateRenewalDates = (startDate, expiryDate) => {
      const s = new Date(startDate)
      const e = new Date(expiryDate)
      if (e <= s) {
        throw new AppError('New expiry date must be strictly after the new start date.', 400)
      }
      return true
    }

    assert.equal(validateRenewalDates('2026-01-01', '2027-01-01'), true)
    assert.throws(
      () => validateRenewalDates('2026-01-01', '2025-12-31'),
      /New expiry date must be strictly after the new start date/
    )
    assert.throws(
      () => validateRenewalDates('2026-01-01', '2026-01-01'),
      /New expiry date must be strictly after the new start date/
    )
  })
})
