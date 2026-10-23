// ============================================================
// InsureX - PostgreSQL Database Seed Script
// Populates normalized, interconnected demonstration data.
// ============================================================

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting InsureX Database Seeding...')

  // 1. Seed Users
  // FICTIONAL DEVELOPMENT DATA. No passwords are hardcoded: set SEED_DEMO_PASSWORD in your local
  // environment to create demo logins. Existing users are never modified (update: {}).
  console.log('1. Seeding Users...')
  const demoPassword = process.env.SEED_DEMO_PASSWORD
  if (!demoPassword || demoPassword.length < 10) {
    throw new Error('Set SEED_DEMO_PASSWORD (10+ characters) to seed demo logins. Never use this in production.')
  }
  const passwordHash = await bcrypt.hash(demoPassword, 12)

  await prisma.user.upsert({
    where: { email: 'admin@insurex.in' },
    update: {},
    create: {
      email: 'admin@insurex.in',
      passwordHash,
      name: 'Siddharth Rao (Demo Admin)',
      role: 'ADMIN',
      phone: '+91 98200 45678',
      isActive: true,
    },
  })

  const agentUser = await prisma.user.upsert({
    where: { email: 'rajesh.kapoor@insurex.in' },
    update: {},
    create: {
      email: 'rajesh.kapoor@insurex.in',
      passwordHash,
      name: 'Rajesh Kapoor',
      role: 'AGENT',
      phone: '+91 98201 11223',
      isActive: true,
    },
  })

  // 2. Seed Insurance Companies
  console.log('2. Seeding Insurance Companies...')
  const starShield = await prisma.insuranceCompany.upsert({
    where: { registrationNumber: 'IRDAI/NL-01/2006' },
    update: {},
    create: {
      name: 'Star Shield Health Insurance Co.',
      shortName: 'Star Shield',
      registrationNumber: 'IRDAI/NL-01/2006',
      category: 'Health & Medical',
      phone: '+91 22 6600 1100',
      email: 'partners@starshield.insure',
      website: 'https://starshield.demo.insure',
      address: 'Star Towers, 4th Floor, Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      solvencyRatio: 2.15,
      rating: 'AAA (Stable)',
      status: 'ACTIVE',
      description: 'Premier health insurer specializing in comprehensive family floater policies.',
    },
  })

  const nationalGeneral = await prisma.insuranceCompany.upsert({
    where: { registrationNumber: 'IRDAI/NL-02/1998' },
    update: {},
    create: {
      name: 'National General Assurance Ltd.',
      shortName: 'National General',
      registrationNumber: 'IRDAI/NL-02/1998',
      category: 'General & Motor',
      phone: '+91 11 4980 2200',
      email: 'underwriting@nationalgeneral.demo',
      website: 'https://nationalgeneral.demo.insure',
      address: 'Barakhamba Road, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
      solvencyRatio: 1.95,
      rating: 'AA+ (Stable)',
      status: 'ACTIVE',
      description: 'Leading underwriter offering comprehensive motor and property indemnity covers.',
    },
  })

  // 3. Seed Policy Types
  console.log('3. Seeding Policy Types...')
  const lifeType = await prisma.policyType.upsert({
    where: { typeCode: 'LIFE' },
    update: {},
    create: {
      typeCode: 'LIFE',
      name: 'Life Insurance',
      description: 'Provides financial security to nominated beneficiaries upon death.',
      coverageDetails: 'Covers natural death, accidental death, and terminal illness.',
      eligibility: 'Indian residents aged 18–65 years.',
      terms: 'Policy term: 10–40 years. Premium payable annually or quarterly.',
      icon: 'Shield',
      status: 'ACTIVE',
    },
  })

  const healthType = await prisma.policyType.upsert({
    where: { typeCode: 'HEALTH' },
    update: {},
    create: {
      typeCode: 'HEALTH',
      name: 'Health Insurance',
      description: 'Covers medical expenses including hospitalisation, surgery, and diagnostics.',
      coverageDetails: 'Cashless treatment at 7,500+ network hospitals.',
      eligibility: 'Individuals aged 18–65. Family floater available.',
      terms: 'Annual renewal. Waiting period 30 days for general illnesses.',
      icon: 'Heart',
      status: 'ACTIVE',
    },
  })

  const vehicleType = await prisma.policyType.upsert({
    where: { typeCode: 'VEHICLE' },
    update: {},
    create: {
      typeCode: 'VEHICLE',
      name: 'Vehicle Insurance',
      description: 'Protects against loss from vehicle damage, third-party liability, and theft.',
      coverageDetails: 'Own damage cover + mandatory third-party liability + roadside assist.',
      eligibility: 'Registered vehicle owners with valid RC.',
      terms: 'Annual policy. No-claim bonus applicable on renewal.',
      icon: 'Car',
      status: 'ACTIVE',
    },
  })

  // 4. Seed Customers
  console.log('4. Seeding Customers...')
  const arjun = await prisma.customer.upsert({
    where: { customerNumber: 'CUST-1001' },
    update: {},
    create: {
      customerNumber: 'CUST-1001',
      firstName: 'Arjun',
      lastName: 'Mehta',
      dateOfBirth: new Date('1988-04-15'),
      gender: 'Male',
      email: 'arjun.mehta@email.com',
      phone: '+91 98201 34567',
      address: '14, Shivaji Nagar, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411005',
      idProofType: 'Aadhaar',
      maskedIdProofNumber: 'XXXX-XXXX-4521',
      status: 'ACTIVE',
      registrationDate: new Date('2022-03-10'),
    },
  })

  const sunita = await prisma.customer.upsert({
    where: { customerNumber: 'CUST-1002' },
    update: {},
    create: {
      customerNumber: 'CUST-1002',
      firstName: 'Sunita',
      lastName: 'Rao',
      dateOfBirth: new Date('1992-09-22'),
      gender: 'Female',
      email: 'sunita.rao@email.com',
      phone: '+91 99300 78901',
      address: '7, Jayanagar 4th Block, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560011',
      idProofType: 'PAN',
      maskedIdProofNumber: 'ABCXXXXX8D',
      status: 'ACTIVE',
      registrationDate: new Date('2022-07-18'),
    },
  })

  // 5. Seed Agents
  console.log('5. Seeding Agents...')
  const agentRajesh = await prisma.insuranceAgent.upsert({
    where: { licenseNumber: 'IRDAI-AG-49821' },
    update: {},
    create: {
      agentNumber: 'AGT-101',
      userId: agentUser.id,
      companyId: starShield.id,
      firstName: 'Rajesh',
      lastName: 'Kapoor',
      email: 'rajesh.kapoor@insurex.in',
      phone: '+91 98201 11223',
      city: 'Mumbai',
      region: 'Maharashtra & West',
      licenseNumber: 'IRDAI-AG-49821',
      specialization: 'Health & Life',
      status: 'ACTIVE',
      commissionRate: 8.5,
      rating: 4.9,
      bio: 'Senior advisor with 9 years of experience in retail health portfolios and term life advisory.',
    },
  })

  // 6. Seed Application & Policy
  console.log('6. Seeding Applications & Policies...')
  const app1 = await prisma.insuranceApplication.upsert({
    where: { applicationNumber: 'APP-1001' },
    update: {},
    create: {
      applicationNumber: 'APP-1001',
      customerId: arjun.id,
      policyTypeId: lifeType.id,
      requestedCoverage: 2500000,
      annualIncome: 1200000,
      employmentStatus: 'Salaried Professional',
      nomineeName: 'Priti Mehta',
      nomineeRelation: 'Spouse',
      status: 'APPROVED',
      applicationDate: new Date('2024-01-05'),
      reviewDate: new Date('2024-01-08'),
      notes: 'Approved under regular underwriting terms.',
    },
  })

  const policy1 = await prisma.insurancePolicy.upsert({
    where: { policyNumber: 'POL-2024-0101' },
    update: {},
    create: {
      policyNumber: 'POL-2024-0101',
      applicationId: app1.id,
      customerId: arjun.id,
      policyTypeId: lifeType.id,
      companyId: starShield.id,
      agentId: agentRajesh.id,
      sumAssured: 2500000,
      premiumAmount: 18500,
      premiumFrequency: 'ANNUALLY',
      startDate: new Date('2024-01-10'),
      expiryDate: new Date('2034-01-10'),
      status: 'ACTIVE',
    },
  })

  // 7. Seed Premiums & Payments
  console.log('7. Seeding Premiums & Payments...')
  const prem1 = await prisma.premium.upsert({
    where: { premiumNumber: 'PRM-001-01' },
    update: {},
    create: {
      premiumNumber: 'PRM-001-01',
      policyId: policy1.id,
      amount: 18500,
      paidAmount: 18500,
      dueDate: new Date('2024-01-10'),
      paidDate: new Date('2024-01-10'),
      status: 'PAID',
    },
  })

  await prisma.premiumPayment.upsert({
    where: { transactionReference: 'TXN-UPI-9821' },
    update: {},
    create: {
      paymentNumber: 'PPAY-001',
      premiumId: prem1.id,
      policyId: policy1.id,
      amount: 18500,
      paymentDate: new Date('2024-01-10'),
      paymentMethod: 'UPI',
      transactionReference: 'TXN-UPI-9821',
      status: 'SUCCESS',
      notes: 'Annual premium received via UPI.',
    },
  })

  // 8. Seed Beneficiaries (collective <= 100%)
  console.log('8. Seeding Beneficiaries...')
  await prisma.beneficiary.create({
    data: {
      policyId: policy1.id,
      name: 'Priti Mehta',
      relationship: 'Spouse',
      allocationPercentage: 70,
      phone: '+91 98201 98765',
      email: 'priti.mehta@email.com',
      dateOfBirth: new Date('1990-06-12'),
      idProofType: 'Aadhaar',
      idProofNumber: 'XXXX-XXXX-8921',
      address: '14, Shivaji Nagar, Pune',
    },
  })

  await prisma.beneficiary.create({
    data: {
      policyId: policy1.id,
      name: 'Ramesh Mehta',
      relationship: 'Father',
      allocationPercentage: 30,
      phone: '+91 98201 12344',
      email: 'ramesh.m@email.com',
      dateOfBirth: new Date('1960-03-24'),
      idProofType: 'PAN',
      idProofNumber: 'RMEXXXXX1K',
      address: '14, Shivaji Nagar, Pune',
    },
  })

  // 9. Seed Claim & Claim Processing
  console.log('9. Seeding Claim & Processing...')
  const claim1 = await prisma.claim.upsert({
    where: { claimNumber: 'CLM-1001' },
    update: {},
    create: {
      claimNumber: 'CLM-1001',
      customerId: arjun.id,
      policyId: policy1.id,
      assignedAgentId: agentRajesh.id,
      claimType: 'Hospitalisation',
      claimDate: new Date('2024-05-12'),
      claimedAmount: 145000,
      approvedAmount: 132000,
      status: 'SETTLED',
      incidentDescription: 'Emergency appendectomy at Fortis Hospital Pune.',
      settlementDate: new Date('2024-06-15'),
      settlementMethod: 'Bank Transfer',
      settlementTransactionRef: 'TXN-SETT-8841',
    },
  })

  await prisma.claimProcessing.upsert({
    where: { claimId: claim1.id },
    update: {},
    create: {
      claimId: claim1.id,
      assignedAgentId: agentRajesh.id,
      processingDate: new Date('2024-05-13'),
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Hospital records and invoice verified against policy terms.',
      approvedAmount: 132000,
      processingStatus: 'SETTLED',
      documentsVerified: true,
    },
  })

  // 10. Seed Document
  console.log('10. Seeding Documents...')
  await prisma.document.upsert({
    where: { documentNumber: 'DOC-1001' },
    update: {},
    create: {
      documentNumber: 'DOC-1001',
      name: 'Hospital_Discharge_Summary_Fortis.pdf',
      documentType: 'Hospital Discharge Summary',
      fileSize: '2.4 MB',
      fileFormat: 'PDF',
      customerId: arjun.id,
      policyId: policy1.id,
      claimId: claim1.id,
      submissionDate: new Date('2024-05-12'),
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Signed by treating surgeon Dr. S. Kulkarni.',
      verifiedBy: 'Rajesh Kapoor',
      verifiedDate: new Date('2024-05-18'),
    },
  })

  // 11. Seed Policy Renewal
  console.log('11. Seeding Renewals...')
  await prisma.policyRenewal.upsert({
    where: { renewalNumber: 'REN-1001' },
    update: {},
    create: {
      renewalNumber: 'REN-1001',
      policyId: policy1.id,
      previousExpiryDate: new Date('2025-01-10'),
      newStartDate: new Date('2025-01-11'),
      newExpiryDate: new Date('2026-01-10'),
      renewalPremium: 19500,
      status: 'UPCOMING',
      notes: 'Annual renewal reminder notice generated.',
    },
  })

  console.log('✅ InsureX Database Seed Completed Successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error in Database Seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
