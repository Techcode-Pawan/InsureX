import prisma from '../config/db.js'
import { daysFromNow } from '../lib/common.js'
import { refreshOverduePremiums } from './premiumService.js'

const OPEN_CLAIMS = ['PENDING', 'UNDER_REVIEW', 'APPROVED']
const UNPAID = ['DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD']

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

// System-wide operations overview for the admin console. Every figure is computed from PostgreSQL.
export async function getAdminOverview() {
  await refreshOverduePremiums()
  const now = new Date()
  const in60 = daysFromNow(60)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    totalCustomers, activeCustomers, totalAgents, activeAgents, activePolicies, pendingApplications,
    collected, outstanding, overdue, openClaims, claimExposure, upcomingRenewals, openRenewals,
    pendingPayments, pendingDocuments, monthlyCollections, policiesByType, claimsByStatus,
    applicationQueue, claimQueue, renewalAlerts, paymentQueue, recentActivity,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.insuranceAgent.count(),
    prisma.insuranceAgent.count({ where: { status: 'ACTIVE' } }),
    prisma.insurancePolicy.count({ where: { status: 'ACTIVE' } }),
    prisma.insuranceApplication.count({ where: { status: 'PENDING' } }),
    prisma.premiumPayment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: { id: true } }),
    prisma.$queryRaw`SELECT COALESCE(SUM(amount - "paidAmount"), 0)::float AS total,
                            COALESCE(SUM(CASE WHEN "dueDate" <= NOW() THEN amount - "paidAmount" ELSE 0 END), 0)::float AS "dueNow"
                     FROM "Premium" WHERE status::text = ANY(${UNPAID})`,
    prisma.premium.count({ where: { status: 'OVERDUE' } }),
    prisma.claim.count({ where: { status: { in: OPEN_CLAIMS } } }),
    prisma.claim.aggregate({ where: { status: { in: OPEN_CLAIMS } }, _sum: { claimedAmount: true } }),
    prisma.insurancePolicy.count({ where: { status: 'ACTIVE', expiryDate: { gte: now, lte: in60 } } }),
    prisma.policyRenewal.count({ where: { status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'] } } }),
    prisma.premiumPayment.count({ where: { status: 'PENDING' } }),
    prisma.document.count({ where: { verificationStatus: { in: ['PENDING', 'NEEDS_INFO'] } } }),
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "paymentDate"), 'YYYY-MM') AS month,
                            SUM(amount)::float AS amount, COUNT(*)::int AS payments
                     FROM "PremiumPayment"
                     WHERE status = 'SUCCESS' AND "paymentDate" >= ${sixMonthsAgo}
                     GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT pt.name, COUNT(p.id)::int AS count, COALESCE(SUM(p."sumAssured"), 0)::float AS "sumAssured"
                     FROM "PolicyType" pt LEFT JOIN "InsurancePolicy" p ON p."policyTypeId" = pt.id AND p.status = 'ACTIVE'
                     GROUP BY pt.name ORDER BY count DESC, pt.name`,
    prisma.claim.groupBy({ by: ['status'], _count: { id: true }, _sum: { claimedAmount: true } }),
    prisma.insuranceApplication.findMany({
      where: { status: 'PENDING' }, orderBy: { applicationDate: 'asc' }, take: 6,
      select: {
        id: true, applicationNumber: true, applicationDate: true, requestedCoverage: true,
        customer: { select: { id: true, firstName: true, lastName: true } }, policyType: { select: { name: true } },
        assistedByAgent: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.claim.findMany({
      where: { status: { in: OPEN_CLAIMS } }, orderBy: { claimDate: 'asc' }, take: 6,
      select: {
        id: true, claimNumber: true, claimDate: true, claimedAmount: true, status: true, claimType: true,
        customer: { select: { firstName: true, lastName: true } }, assignedAgent: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.insurancePolicy.findMany({
      where: { status: 'ACTIVE', expiryDate: { lte: in60 } }, orderBy: { expiryDate: 'asc' }, take: 6,
      select: {
        id: true, policyNumber: true, expiryDate: true,
        customer: { select: { firstName: true, lastName: true } }, policyType: { select: { name: true } },
        renewals: { where: { status: { in: ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'] } }, select: { renewalNumber: true, status: true } },
      },
    }),
    prisma.premiumPayment.findMany({
      where: { status: 'PENDING' }, orderBy: { paymentDate: 'asc' }, take: 6,
      select: {
        id: true, paymentNumber: true, amount: true, paymentDate: true, paymentMethod: true, transactionReference: true,
        policy: { select: { policyNumber: true, customer: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' }, take: 12,
      select: { id: true, action: true, entityType: true, summary: true, actorRole: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ])

  return {
    metrics: {
      totalCustomers, activeCustomers, totalAgents, activeAgents, activePolicies, pendingApplications,
      premiumsCollected: Number(collected._sum.amount || 0),
      paymentsCount: collected._count.id,
      outstandingBalance: outstanding[0]?.total || 0,
      outstandingDueNow: outstanding[0]?.dueNow || 0,
      overduePremiums: overdue,
      openClaims,
      openClaimExposure: Number(claimExposure._sum.claimedAmount || 0),
      upcomingRenewals,
      openRenewals,
      pendingPayments,
      pendingDocuments,
    },
    charts: {
      monthlyCollections,
      policiesByType,
      claimsByStatus: claimsByStatus.map((c) => ({ status: c.status, count: c._count.id, amount: Number(c._sum.claimedAmount || 0) })),
    },
    queues: {
      applications: applicationQueue,
      claims: claimQueue,
      renewals: renewalAlerts.map(({ renewals, ...p }) => ({ ...p, openRenewal: renewals[0] || null })),
      payments: paymentQueue,
    },
    recentActivity,
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

// Consolidated management report for /api/reports/summary. Every figure is an aggregate over PostgreSQL.
export async function getReportSummary() {
  const since = new Date()
  since.setMonth(since.getMonth() - 11, 1)
  since.setHours(0, 0, 0, 0)

  const [monthly, byType, claims, outstanding, agents, methods] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "paymentDate"), 'YYYY-MM') AS month,
                            SUM(amount)::float AS amount, COUNT(*)::int AS payments
                     FROM "PremiumPayment"
                     WHERE status = 'SUCCESS' AND "paymentDate" >= ${since}
                     GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT pt.name AS "policyType",
                            COUNT(p.id) FILTER (WHERE p.status = 'ACTIVE')::int AS active,
                            COUNT(p.id)::int AS total,
                            COALESCE(SUM(p."sumAssured") FILTER (WHERE p.status = 'ACTIVE'), 0)::float AS "sumAssured",
                            COALESCE(SUM(p."premiumAmount" * CASE p."premiumFrequency"
                              WHEN 'MONTHLY' THEN 12 WHEN 'QUARTERLY' THEN 4 WHEN 'HALF_YEARLY' THEN 2 ELSE 1 END)
                              FILTER (WHERE p.status = 'ACTIVE'), 0)::float AS "annualPremium"
                     FROM "PolicyType" pt LEFT JOIN "InsurancePolicy" p ON p."policyTypeId" = pt.id
                     GROUP BY pt.name ORDER BY active DESC, pt.name`,
    prisma.$queryRaw`SELECT status::text AS status, COUNT(*)::int AS count,
                            COALESCE(SUM("claimedAmount"), 0)::float AS claimed,
                            COALESCE(SUM("approvedAmount"), 0)::float AS approved
                     FROM "Claim" GROUP BY status ORDER BY status`,
    prisma.$queryRaw`SELECT status::text AS status, COUNT(*)::int AS count,
                            COALESCE(SUM(amount), 0)::float AS billed,
                            COALESCE(SUM(amount - "paidAmount"), 0)::float AS outstanding
                     FROM "Premium" GROUP BY status ORDER BY status`,
    prisma.$queryRaw`SELECT a.id, a."agentNumber", a."firstName", a."lastName", a.status::text AS status,
                            (SELECT COUNT(*)::int FROM "Customer" c WHERE c."assignedAgentId" = a.id) AS customers,
                            (SELECT COUNT(*)::int FROM "InsurancePolicy" p WHERE p."agentId" = a.id AND p.status = 'ACTIVE') AS "activePolicies",
                            (SELECT COALESCE(SUM(pp.amount), 0)::float FROM "PremiumPayment" pp
                               JOIN "InsurancePolicy" p ON p.id = pp."policyId"
                              WHERE p."agentId" = a.id AND pp.status = 'SUCCESS') AS "premiumCollected",
                            (SELECT COUNT(*)::int FROM "InsuranceApplication" ia
                              WHERE ia."assistedByAgentId" = a.id AND ia.status = 'APPROVED') AS "approvedApplications"
                     FROM "InsuranceAgent" a
                     ORDER BY "premiumCollected" DESC, "activePolicies" DESC, a."lastName"`,
    prisma.$queryRaw`SELECT "paymentMethod"::text AS method, COUNT(*)::int AS count, SUM(amount)::float AS amount
                     FROM "PremiumPayment" WHERE status = 'SUCCESS' GROUP BY 1 ORDER BY amount DESC`,
  ])

  return {
    generatedAt: new Date().toISOString(),
    premiumsByMonth: monthly,
    policiesByType: byType,
    claimsByStatus: claims,
    premiumsByStatus: outstanding,
    agentLeaderboard: agents,
    paymentsByMethod: methods,
  }
}

