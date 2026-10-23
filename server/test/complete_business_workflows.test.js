// ============================================================
// Complete Business Workflows & Financial Calculations E2E Test
// Covers Workflows A, B, C, D, E with actual PostgreSQL transactions
// ============================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../src/config/db.js'
import * as applicationService from '../src/services/applicationService.js'
import * as premiumService from '../src/services/premiumService.js'
import * as claimService from '../src/services/claimService.js'
import * as renewalService from '../src/services/renewalService.js'
import * as beneficiaryService from '../src/services/beneficiaryService.js'

test('COMPREHENSIVE AUDIT: 5 End-to-End Business Workflows & Financial Calculations', async (t) => {
  // Shared fixtures created for workflow tests
  let testCustomer = null
  let testPolicyType = null
  let testCompany = null
  let testApplication = null
  let testPolicy = null
  let testPremium = null

  await t.test('Setup: Create Baseline Test Fixtures', async () => {
    testCustomer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-WF-${Date.now()}`,
        firstName: 'Workflow',
        lastName: 'Tester',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Male',
        email: `workflow.test.${Date.now()}@insurex.internal`,
        phone: '+91 98888 77777',
        address: '100 Financial District',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400051',
        idProofType: 'Aadhaar',
        maskedIdProofNumber: 'XXXX-XXXX-9999',
        status: 'ACTIVE',
      },
    })
    assert.ok(testCustomer.id)

    testPolicyType = await prisma.policyType.findFirst({ where: { status: 'ACTIVE' } })
    assert.ok(testPolicyType, 'PolicyType fixture must exist')

    testCompany = await prisma.insuranceCompany.findFirst({ where: { status: 'ACTIVE' } })
    assert.ok(testCompany, 'InsuranceCompany fixture must exist')
  })

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW A: Insurance Application Lifecycle
  // ─────────────────────────────────────────────────────────────
  await t.test('Workflow A: Create Application -> Validate -> Approve -> Policy Generated (No Duplicates)', async () => {
    // 1. Create Application
    testApplication = await applicationService.createApplication({
      customerId: testCustomer.id,
      policyTypeId: testPolicyType.id,
      requestedCoverage: 1000000, // 10 Lakhs
      annualIncome: 800000,
      employmentStatus: 'Salaried Professional',
      nomineeName: 'Anita Tester',
      nomineeRelation: 'Spouse',
      notes: 'Standard underwriting evaluation.',
    })
    assert.equal(testApplication.status, 'PENDING')
    assert.equal(Number(testApplication.requestedCoverage), 1000000)

    // 2. Approve Application -> Should atomically issue policy
    const approvalResult = await applicationService.approveApplication(testApplication.id, {
      companyId: testCompany.id,
      premiumAmount: 15000,
      premiumFrequency: 'ANNUALLY',
      startDate: new Date('2025-01-01'),
      expiryDate: new Date('2026-01-01'),
    })

    assert.ok(approvalResult.policy, 'Policy must be returned in approval result')
    assert.equal(approvalResult.policy.status, 'ACTIVE')
    assert.equal(Number(approvalResult.policy.sumAssured), 1000000)
    assert.equal(Number(approvalResult.policy.premiumAmount), 15000)
    testPolicy = approvalResult.policy

    // 3. Verify application is now marked APPROVED
    const updatedApp = await prisma.insuranceApplication.findUnique({
      where: { id: testApplication.id },
    })
    assert.equal(updatedApp.status, 'APPROVED')

    // 4. Duplicate prevention test: attempting to approve again must throw 400
    await assert.rejects(
      async () => {
        await applicationService.approveApplication(testApplication.id)
      },
      (err) => {
        assert.match(err.message, /already generated|Duplicate policy creation prohibited/i)
        return true
      }
    )
  })

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW B: Premium and Payment Tracking & Balance Recalculation
  // ─────────────────────────────────────────────────────────────
  await t.test('Workflow B: Create Premium -> Record Partial Payment -> Verify Balance -> Final Payment -> Full Settlement', async () => {
    // 1. Create Premium installment of ₹15,000 (status: DUE)
    testPremium = await prisma.premium.create({
      data: {
        premiumNumber: `PRM-WF-${Date.now()}`,
        policyId: testPolicy.id,
        amount: 15000,
        paidAmount: 0,
        dueDate: new Date('2025-02-01'),
        status: 'DUE',
      },
    })
    assert.equal(Number(testPremium.amount), 15000)
    assert.equal(Number(testPremium.paidAmount), 0)

    // 2. Record first partial payment of ₹5,000
    const payment1 = await premiumService.createPayment({
      premiumId: testPremium.id,
      amount: 5000,
      paymentMethod: 'UPI',
      transactionReference: `TXN-P1-${Date.now()}`,
      notes: 'First installment paid via UPI',
    })

    assert.equal(payment1.payment.status, 'SUCCESS')
    assert.equal(Number(payment1.payment.amount), 5000)
    assert.equal(payment1.premium.status, 'PARTIALLY_PAID')
    assert.equal(payment1.premium.remainingBalance, 10000, 'Remaining balance must be exactly ₹10,000')

    // 3. Duplicate payment protection test: reusing transaction reference must fail
    await assert.rejects(
      async () => {
        await premiumService.createPayment({
          premiumId: testPremium.id,
          amount: 1000,
          paymentMethod: 'UPI',
          transactionReference: payment1.payment.transactionReference,
        })
      },
      (err) => {
        assert.match(err.message, /already been processed/i)
        return true
      }
    )

    // 4. Overpayment protection test: attempting to pay ₹12,000 when only ₹10,000 is due
    await assert.rejects(
      async () => {
        await premiumService.createPayment({
          premiumId: testPremium.id,
          amount: 12000,
          paymentMethod: 'NET_BANKING',
          transactionReference: `TXN-OVER-${Date.now()}`,
        })
      },
      (err) => {
        assert.match(err.message, /exceeds the remaining balance/i)
        return true
      }
    )

    // 5. Record second payment for remaining ₹10,000
    const payment2 = await premiumService.createPayment({
      premiumId: testPremium.id,
      amount: 10000,
      paymentMethod: 'NET_BANKING',
      transactionReference: `TXN-P2-${Date.now()}`,
      notes: 'Settled remaining balance',
    })

    assert.equal(payment2.premium.status, 'PAID')
    assert.equal(payment2.premium.remainingBalance, 0, 'Remaining balance must be exactly ₹0')
    assert.ok(payment2.premium.paidDate, 'paidDate must be populated upon full settlement')
  })

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW C: Claims Lifecycle & Status Progression
  // ─────────────────────────────────────────────────────────────
  await t.test('Workflow C: Submit Claim -> Under Review -> Approve -> Settle (Disallows Premature Settlement)', async () => {
    // 1. Submit claim against active policy
    const claim = await claimService.createClaim({
      customerId: testCustomer.id,
      policyId: testPolicy.id,
      claimType: 'Accidental Damage',
      claimDate: '2025-06-15',
      claimedAmount: 75000,
      incidentDescription: 'Road accident resulting in vehicular damage requiring workshop repairs.',
    })

    assert.equal(claim.status, 'PENDING')
    assert.equal(Number(claim.claimedAmount), 75000)
    assert.ok(claim.processing, 'ClaimProcessing record must be initialized automatically')

    // 2. Premature settlement check: Cannot settle a PENDING claim!
    await assert.rejects(
      async () => {
        await claimService.settleClaim(claim.id, {
          settlementMethod: 'Bank Transfer',
          transactionRef: `SETT-PREM-${Date.now()}`,
        })
      },
      (err) => {
        assert.match(err.message, /must be approved prior to disbursement settlement/i)
        return true
      }
    )

    // 3. Approve claim for ₹70,000
    const approvedClaim = await claimService.approveClaim(claim.id, {
      approvedAmount: 70000,
      notes: 'Surveyor approved assessment with standard ₹5,000 deductible deduction.',
    })
    assert.equal(approvedClaim.status, 'APPROVED')
    assert.equal(Number(approvedClaim.approvedAmount), 70000)

    // 4. Settle claim
    const settledClaim = await claimService.settleClaim(claim.id, {
      settlementMethod: 'NEFT Transfer',
      transactionRef: `NEFT-SETT-${Date.now()}`,
    })
    assert.equal(settledClaim.status, 'SETTLED')

    // Clean up claim and processing
    await prisma.claimProcessing.deleteMany({ where: { claimId: claim.id } })
    await prisma.claim.delete({ where: { id: claim.id } })
  })

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW D: Policy Renewal Verification
  // ─────────────────────────────────────────────────────────────
  await t.test('Workflow D: Create Renewal -> Validate Dates & Status -> Process Renewal', async () => {
    const renewal = await renewalService.createRenewal({
      policyId: testPolicy.id,
      previousExpiryDate: '2026-01-01',
      newStartDate: '2026-01-02',
      newExpiryDate: '2027-01-01',
      renewalPremium: 15500,
      notes: 'Annual renewal reminder notice.',
    })

    assert.equal(renewal.status, 'UPCOMING')
    assert.equal(Number(renewal.renewalPremium), 15500)

    // Update status to RENEWED and verify policy expiry extended
    const updated = await renewalService.updateRenewal(renewal.id, {
      status: 'RENEWED',
      renewalDate: new Date(),
    })
    assert.equal(updated.status, 'RENEWED')

    const extendedPolicy = await prisma.insurancePolicy.findUnique({ where: { id: testPolicy.id } })
    assert.equal(extendedPolicy.expiryDate.toISOString().split('T')[0], '2027-01-01')

    // Cleanup renewal
    await prisma.policyRenewal.delete({ where: { id: renewal.id } })
  })

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW E: Customer and Beneficiary Allocation Rules
  // ─────────────────────────────────────────────────────────────
  await t.test('Workflow E: Add Beneficiaries -> Enforce 100% Max Allocation -> Edit and Verify Persistence', async () => {
    // 1. Add Beneficiary 1 with 60%
    const ben1 = await beneficiaryService.createBeneficiary({
      policyId: testPolicy.id,
      name: 'Anita Tester',
      relationship: 'Spouse',
      allocationPercentage: 60,
      phone: '+91 98888 11111',
      email: 'anita@tester.internal',
      idProofType: 'Aadhaar',
      idProofNumber: 'XXXX-XXXX-1111',
      address: '100 Financial District, Mumbai',
    })
    assert.equal(Number(ben1.allocationPercentage), 60)

    // 2. Attempt to add Beneficiary 2 with 50% (60 + 50 = 110% > 100% -> MUST FAIL)
    await assert.rejects(
      async () => {
        await beneficiaryService.createBeneficiary({
          policyId: testPolicy.id,
          name: 'Rohit Tester',
          relationship: 'Child',
          allocationPercentage: 50,
        })
      },
      (err) => {
        assert.match(err.message, /Total beneficiary allocation.*cannot exceed 100%/i)
        return true
      }
    )

    // 3. Add Beneficiary 2 with valid 40% (60 + 40 = 100% -> MUST SUCCEED)
    const ben2 = await beneficiaryService.createBeneficiary({
      policyId: testPolicy.id,
      name: 'Rohit Tester',
      relationship: 'Child',
      allocationPercentage: 40,
      phone: '+91 98888 22222',
      email: 'rohit@tester.internal',
      idProofType: 'PAN',
      idProofNumber: 'ROHXXXXX01K',
      address: '100 Financial District, Mumbai',
    })
    assert.equal(Number(ben2.allocationPercentage), 40)

    // 4. Update Beneficiary details and verify persistence
    const updatedBen1 = await beneficiaryService.updateBeneficiary(ben1.id, {
      phone: '+91 98888 99999',
    })
    assert.equal(updatedBen1.phone, '+91 98888 99999')

    const persisted = await beneficiaryService.getBeneficiaryById(ben1.id)
    assert.equal(persisted.phone, '+91 98888 99999')

    // Cleanup beneficiaries
    await prisma.beneficiary.deleteMany({ where: { policyId: testPolicy.id } })
  })

  // ─────────────────────────────────────────────────────────────
  // TEARDOWN: Clean up all test fixtures cleanly
  // ─────────────────────────────────────────────────────────────
  await t.test('Teardown: Clean up Test Fixtures', async () => {
    if (!testCustomer) return
    // Remove everything created for the fixture customer, children first (FKs are RESTRICT).
    const customerId = testCustomer.id
    const polIds = (await prisma.insurancePolicy.findMany({ where: { customerId }, select: { id: true } })).map((p) => p.id)
    const claimIds = (await prisma.claim.findMany({ where: { customerId }, select: { id: true } })).map((c) => c.id)
    await prisma.document.deleteMany({ where: { customerId } })
    await prisma.claimProcessing.deleteMany({ where: { claimId: { in: claimIds } } })
    await prisma.claim.deleteMany({ where: { customerId } })
    await prisma.premiumPayment.deleteMany({ where: { policyId: { in: polIds } } })
    await prisma.premium.deleteMany({ where: { policyId: { in: polIds } } })
    await prisma.policyRenewal.deleteMany({ where: { policyId: { in: polIds } } })
    await prisma.beneficiary.deleteMany({ where: { policyId: { in: polIds } } })
    await prisma.insurancePolicy.deleteMany({ where: { customerId } })
    await prisma.insuranceApplication.deleteMany({ where: { customerId } })
    await prisma.activityLog.deleteMany({ where: { OR: [{ customerId }, { entityId: { in: [...polIds, ...claimIds] } }] } })
    await prisma.customer.delete({ where: { id: customerId } })
  })
})
