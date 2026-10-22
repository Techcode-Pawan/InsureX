import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCheckConstraints() {
  console.log('Testing proposed CHECK constraints against existing database rows...')

  const checks = [
    { table: 'InsurancePolicy', sql: `SELECT COUNT(*) FROM "InsurancePolicy" WHERE NOT ("sumAssured" > 0 AND "premiumAmount" > 0 AND "startDate" < "expiryDate")` },
    { table: 'Premium', sql: `SELECT COUNT(*) FROM "Premium" WHERE NOT (amount > 0 AND "paidAmount" >= 0 AND "paidAmount" <= amount)` },
    { table: 'PremiumPayment', sql: `SELECT COUNT(*) FROM "PremiumPayment" WHERE NOT (amount > 0)` },
    { table: 'Claim', sql: `SELECT COUNT(*) FROM "Claim" WHERE NOT ("claimedAmount" > 0 AND ("approvedAmount" IS NULL OR ("approvedAmount" >= 0 AND "approvedAmount" <= "claimedAmount")))` },
    { table: 'ClaimProcessing', sql: `SELECT COUNT(*) FROM "ClaimProcessing" WHERE NOT ("approvedAmount" IS NULL OR "approvedAmount" >= 0)` },
    { table: 'Beneficiary', sql: `SELECT COUNT(*) FROM "Beneficiary" WHERE NOT ("allocationPercentage" > 0 AND "allocationPercentage" <= 100)` },
    { table: 'InsuranceApplication', sql: `SELECT COUNT(*) FROM "InsuranceApplication" WHERE NOT ("requestedCoverage" > 0 AND ("annualIncome" IS NULL OR "annualIncome" >= 0))` },
    { table: 'InsuranceAgent', sql: `SELECT COUNT(*) FROM "InsuranceAgent" WHERE NOT ("commissionRate" >= 0 AND "commissionRate" <= 100 AND rating >= 0 AND rating <= 5)` },
    { table: 'PolicyRenewal', sql: `SELECT COUNT(*) FROM "PolicyRenewal" WHERE NOT ("renewalPremium" > 0 AND "newStartDate" < "newExpiryDate" AND "newStartDate" >= "previousExpiryDate")` },
    { table: 'InsuranceCompany', sql: `SELECT COUNT(*) FROM "InsuranceCompany" WHERE NOT ("solvencyRatio" IS NULL OR "solvencyRatio" >= 0)` },
  ]

  let allPass = true
  for (const c of checks) {
    const res = await prisma.$queryRawUnsafe(c.sql)
    const violations = Number(res[0].count)
    console.log(`  Table [${c.table}]: ${violations} violations found.`)
    if (violations > 0) allPass = false
  }

  if (allPass) {
    console.log('✅ ALL EXISTING ROWS PERFECTLY SATISFY PROPOSED CHECK CONSTRAINTS!')
  } else {
    console.warn('❌ Violations found in existing data!')
  }
}

testCheckConstraints()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
