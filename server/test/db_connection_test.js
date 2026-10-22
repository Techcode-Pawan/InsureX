import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
  try {
    // Test 1: Raw SQL connectivity
    const dbInfo = await prisma.$queryRawUnsafe(
      "SELECT current_database() AS db, current_user AS usr"
    )
    console.log('✅ Prisma → PostgreSQL connection: SUCCESS')
    console.log('   Database:', dbInfo[0].db)
    console.log('   User:', dbInfo[0].usr)

    // Test 2: Query all models to verify tables exist
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.policyType.count(),
      prisma.insurancePolicy.count(),
      prisma.claim.count(),
      prisma.insuranceAgent.count(),
      prisma.insuranceCompany.count(),
      prisma.insuranceApplication.count(),
      prisma.premium.count(),
      prisma.premiumPayment.count(),
      prisma.beneficiary.count(),
      prisma.document.count(),
      prisma.claimProcessing.count(),
      prisma.policyRenewal.count(),
    ])

    const names = [
      'User', 'Customer', 'PolicyType', 'InsurancePolicy',
      'Claim', 'InsuranceAgent', 'InsuranceCompany', 'InsuranceApplication',
      'Premium', 'PremiumPayment', 'Beneficiary', 'Document',
      'ClaimProcessing', 'PolicyRenewal',
    ]

    console.log('\n📊 All 14 tables verified (row counts):')
    names.forEach((name, i) => {
      console.log(`   ${name.padEnd(24)} ${counts[i]}`)
    })

    console.log('\n✅ All Prisma model queries executed successfully!')
    console.log('✅ Database is fully operational.')
  } catch (err) {
    console.error('❌ Connection test FAILED:', err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
