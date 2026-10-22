import prisma from '../config/db.js'

export async function getDashboardSummary() {
  const [
    totalCustomers,
    activePolicies,
    pendingApplications,
    pendingClaims,
    premiumsCollected,
  ] = await Promise.all([
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.insurancePolicy.count({ where: { status: 'ACTIVE' } }),
    prisma.insuranceApplication.count({ where: { status: 'PENDING' } }),
    prisma.claim.count({ where: { status: 'PENDING' } }),
    prisma.premiumPayment.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' },
    }),
  ])

  return {
    totalCustomers,
    activePolicies,
    pendingApplications,
    pendingClaims,
    totalPremiumsCollected: premiumsCollected._sum.amount || 0,
  }
}

export async function getDashboardAnalytics() {
  const [policiesByType, claimsByStatus] = await Promise.all([
    prisma.insurancePolicy.groupBy({
      by: ['policyTypeId'],
      _count: { id: true },
      _sum: { sumAssured: true },
    }),
    prisma.claim.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { claimedAmount: true },
    }),
  ])

  return {
    policiesByType,
    claimsByStatus,
  }
}

export async function getReportPolicies() {
  return prisma.insurancePolicy.groupBy({
    by: ['policyTypeId'],
    _count: { id: true },
    _sum: { sumAssured: true, premiumAmount: true },
  })
}

export async function getReportPremiums() {
  return prisma.premiumPayment.findMany({
    where: { status: 'SUCCESS' },
    select: {
      amount: true,
      paymentDate: true,
      paymentMethod: true,
    },
    orderBy: { paymentDate: 'desc' },
    take: 100,
  })
}

export async function getReportClaims() {
  return prisma.claim.groupBy({
    by: ['status'],
    _count: { id: true },
    _sum: { claimedAmount: true, approvedAmount: true },
  })
}
