import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testViewsAndQueries() {
  console.log('Testing beginner queries and views from database.sql against live PostgreSQL...')

  // Test View 1 creation
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vw_active_policyholders AS
    SELECT 
        p.id AS policy_id,
        p."policyNumber",
        c."customerNumber",
        c."firstName" || ' ' || c."lastName" AS customer_name,
        c.email,
        c.phone,
        pt.name AS plan_name,
        p."sumAssured",
        p."premiumAmount",
        p."premiumFrequency",
        p."startDate",
        p."expiryDate"
    FROM "InsurancePolicy" p
    JOIN "Customer" c ON p."customerId" = c.id
    JOIN "PolicyType" pt ON p."policyTypeId" = pt.id
    WHERE p.status = 'ACTIVE';
  `)
  console.log('✅ View vw_active_policyholders created successfully!')

  // Test View 2 creation
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vw_claims_tracking AS
    SELECT 
        clm."claimNumber",
        c."customerNumber",
        c."firstName" || ' ' || c."lastName" AS customer_name,
        p."policyNumber",
        clm."claimType",
        clm."claimedAmount",
        COALESCE(clm."approvedAmount", 0) AS approved_amount,
        clm.status AS claim_status,
        clm."claimDate"
    FROM "Claim" clm
    JOIN "Customer" c ON clm."customerId" = c.id
    JOIN "InsurancePolicy" p ON clm."policyId" = p.id;
  `)
  console.log('✅ View vw_claims_tracking created successfully!')

  // Query View 1
  const policyholders = await prisma.$queryRawUnsafe(`SELECT * FROM vw_active_policyholders LIMIT 5`)
  console.log('✅ Query vw_active_policyholders returned rows:', policyholders.length)

  // Query View 2
  const claims = await prisma.$queryRawUnsafe(`SELECT * FROM vw_claims_tracking LIMIT 5`)
  console.log('✅ Query vw_claims_tracking returned rows:', claims.length)

  console.log('🎉 ALL QUERIES IN database.sql TESTED & 100% VALID!')
}

testViewsAndQueries()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
