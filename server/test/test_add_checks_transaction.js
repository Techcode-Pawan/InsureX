import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

test('PHASE 3 & 4: PostgreSQL Engine CHECK Constraints Enforcement', async (t) => {
  await t.test('Database engine rejects negative premium amount via chk_premium_amount', async () => {
    let errorCaught = null
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Premium" (id, "premiumNumber", "policyId", amount, "paidAmount", "dueDate", "status", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'FAIL-PREM-NEG', (SELECT id FROM "InsurancePolicy" LIMIT 1), -500, 0, NOW(), 'DUE', NOW(), NOW());
      `)
    } catch (err) {
      errorCaught = err
    }
    assert.ok(errorCaught, 'PostgreSQL must reject negative premium amount')
    assert.match(errorCaught.message, /chk_premium_amount|check constraint/i)
  })

  await t.test('Database engine rejects invalid policy dates where startDate >= expiryDate', async () => {
    let errorCaught = null
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "InsurancePolicy" (
          id, "policyNumber", "customerId", "policyTypeId", "sumAssured", "premiumAmount",
          "premiumFrequency", "startDate", "expiryDate", "status", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text, 'FAIL-POL-DATES', (SELECT id FROM "Customer" LIMIT 1),
          (SELECT id FROM "PolicyType" LIMIT 1), 500000, 10000, 'ANNUALLY',
          NOW(), NOW() - INTERVAL '1 day', 'ACTIVE', NOW(), NOW()
        );
      `)
    } catch (err) {
      errorCaught = err
    }
    assert.ok(errorCaught, 'PostgreSQL must reject invalid policy dates')
    assert.match(errorCaught.message, /chk_policy_date_range|check constraint/i)
  })

  await t.test('Database engine rejects beneficiary allocation percentage > 100%', async () => {
    let errorCaught = null
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Beneficiary" (
          id, "policyId", name, relationship, "allocationPercentage", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text, (SELECT id FROM "InsurancePolicy" LIMIT 1), 'Invalid Nominee',
          'Spouse', 150.00, NOW(), NOW()
        );
      `)
    } catch (err) {
      errorCaught = err
    }
    assert.ok(errorCaught, 'PostgreSQL must reject allocation percentage > 100%')
    assert.match(errorCaught.message, /chk_beneficiary_allocation|check constraint/i)
  })

  await prisma.$disconnect()
})
