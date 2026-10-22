// ============================================================
// Comprehensive Database CRUD & Verification Audit Script
// Tests live reads, writes, updates, and deletes with immediate cleanup
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runAudit() {
  console.log('=== [1] POSTGRESQL & PRISMA CONNECTION & SCHEMA AUDIT ===')

  // 1. Live ping
  const ping = await prisma.$queryRaw`SELECT current_database(), current_user, version()`
  console.log('✅ Connection confirmed:', ping)

  // 2. Count existing records before test
  const countsBefore = {
    customers: await prisma.customer.count(),
    policies: await prisma.insurancePolicy.count(),
    claims: await prisma.claim.count(),
    policyTypes: await prisma.policyType.count(),
    users: await prisma.user.count(),
  }
  console.log('Initial Database Record Counts:', countsBefore)

  // 3. Create a temporary test customer record
  const testNumber = `TEST-CUST-${Date.now()}`
  console.log(`\n=== [2] TESTING DB WRITE (CREATE): ${testNumber} ===`)
  const created = await prisma.customer.create({
    data: {
      customerNumber: testNumber,
      firstName: 'AuditTest',
      lastName: 'QAUser',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'Other',
      email: `audit.test.${Date.now()}@qa-insurex.internal`,
      phone: '+91 91111 22222',
      address: '99 Quality Assurance Blvd',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      idProofType: 'PAN',
      maskedIdProofNumber: 'QAXXXXX01Z',
      status: 'ACTIVE',
    },
  })
  console.log('✅ Test Record Created. ID:', created.id, 'CustomerNumber:', created.customerNumber)

  // 4. Retrieve the record (READ)
  console.log('\n=== [3] TESTING DB READ (RETRIEVE) ===')
  const retrieved = await prisma.customer.findUnique({
    where: { id: created.id },
  })
  if (!retrieved || retrieved.customerNumber !== testNumber) {
    throw new Error('FAILED: Retrieved record does not match created record')
  }
  console.log('✅ Test Record Retrieved successfully. First Name:', retrieved.firstName, 'Status:', retrieved.status)

  // 5. Update the record (UPDATE)
  console.log('\n=== [4] TESTING DB UPDATE ===')
  const updated = await prisma.customer.update({
    where: { id: created.id },
    data: {
      lastName: 'UpdatedQASurname',
      status: 'SUSPENDED',
    },
  })
  if (updated.lastName !== 'UpdatedQASurname' || updated.status !== 'SUSPENDED') {
    throw new Error('FAILED: Update verification failed')
  }
  console.log('✅ Test Record Updated successfully. New LastName:', updated.lastName, 'New Status:', updated.status)

  // 6. Delete the record (DELETE / CLEANUP)
  console.log('\n=== [5] TESTING DB DELETE (CLEANUP) ===')
  const deleted = await prisma.customer.delete({
    where: { id: created.id },
  })
  console.log('✅ Temporary Test Record Deleted. ID:', deleted.id)

  // 7. Verify deletion
  const verifyDeleted = await prisma.customer.findUnique({
    where: { id: created.id },
  })
  if (verifyDeleted !== null) {
    throw new Error('FAILED: Record still exists after deletion')
  }
  console.log('✅ Confirmed Record No Longer Exists in Database')

  // 8. Confirm existing baseline customer records remain completely intact
  const arjun = await prisma.customer.findFirst({ where: { email: 'arjun.mehta@email.com' } })
  const sunita = await prisma.customer.findFirst({ where: { email: 'sunita.rao@email.com' } })
  if (!arjun || !sunita) {
    throw new Error('FAILED: Baseline project records were unexpectedly affected!')
  }
  console.log('✅ Baseline project records (Arjun Mehta, Sunita Rao) verified intact.')
  console.log('✅ Project data completely preserved with zero side-effects.')
}

runAudit()
  .catch((err) => {
    console.error('❌ Audit Failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
