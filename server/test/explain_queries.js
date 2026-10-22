import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runExplainTests() {
  console.log('=== [1] EXPLAIN ANALYZE: Customer Lookup by Email ===')
  const q1 = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Customer" WHERE email = 'arjun.mehta@email.com'`)
  q1.forEach(row => console.log(row['QUERY PLAN']))

  console.log('\n=== [2] EXPLAIN ANALYZE: Active Policies with Customer & Type Join ===')
  const q2 = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT p.id, p."policyNumber", p."sumAssured", c."firstName", c."lastName", pt.name as policy_type
    FROM "InsurancePolicy" p
    JOIN "Customer" c ON p."customerId" = c.id
    JOIN "PolicyType" pt ON p."policyTypeId" = pt.id
    WHERE p.status = 'ACTIVE';
  `)
  q2.forEach(row => console.log(row['QUERY PLAN']))

  console.log('\n=== [3] EXPLAIN ANALYZE: Premium Aggregation with Payments ===')
  const q3 = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT pr.id, pr.amount, pr."paidAmount", (pr.amount - pr."paidAmount") as balance,
           COALESCE(SUM(pp.amount), 0) as total_payments
    FROM "Premium" pr
    LEFT JOIN "PremiumPayment" pp ON pr.id = pp."premiumId" AND pp.status = 'SUCCESS'
    GROUP BY pr.id, pr.amount, pr."paidAmount";
  `)
  q3.forEach(row => console.log(row['QUERY PLAN']))

  console.log('\n=== [4] EXPLAIN ANALYZE: Dashboard KPI Aggregates ===')
  const q4 = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT
      (SELECT COUNT(*) FROM "Customer") as total_customers,
      (SELECT COUNT(*) FROM "InsurancePolicy" WHERE status = 'ACTIVE') as active_policies,
      (SELECT COUNT(*) FROM "Claim" WHERE status = 'PENDING') as pending_claims,
      (SELECT COALESCE(SUM(amount), 0) FROM "PremiumPayment" WHERE status = 'SUCCESS') as total_premiums_collected
  `)
  q4.forEach(row => console.log(row['QUERY PLAN']))
}

runExplainTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
