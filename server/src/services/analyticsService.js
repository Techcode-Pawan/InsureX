// Dashboard analytics for the Admin console and Agent workspace.
//
// Every figure is a PostgreSQL aggregate. Agent scope is applied in SQL from the authenticated
// agent id (never from request input). Date ranges are calendar days in APP_TIMEZONE, and all
// timestamps (stored as UTC) are converted to that zone before bucketing, so a payment at 23:30
// IST lands on the right day.
import { Prisma } from '@prisma/client'
import prisma from '../config/db.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errorHandler.js'
import { refreshOverduePremiums } from './premiumService.js'

const TZ = env.APP_TIMEZONE
const GRANULARITIES = ['day', 'week', 'month']
const MAX_RANGE_DAYS = 366 * 3
const UNPAID = ['DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD']

// ── Date helpers (calendar dates in APP_TIMEZONE, represented as 'YYYY-MM-DD') ──
function todayInTz() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
const toUtcDate = (s) => new Date(`${s}T00:00:00Z`)
const fmt = (d) => d.toISOString().slice(0, 10)

function startOfBucket(dateStr, gran) {
  const d = toUtcDate(dateStr)
  if (gran === 'month') d.setUTCDate(1)
  if (gran === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) // Monday, like date_trunc('week')
  return d
}

// Every bucket key between from and to, so periods with no activity appear as zero instead of vanishing.
function bucketKeys(from, to, gran) {
  const keys = []
  const end = toUtcDate(to)
  for (let d = startOfBucket(from, gran); d <= end;) {
    keys.push(fmt(d))
    if (gran === 'day') d.setUTCDate(d.getUTCDate() + 1)
    else if (gran === 'week') d.setUTCDate(d.getUTCDate() + 7)
    else d.setUTCMonth(d.getUTCMonth() + 1)
  }
  return keys
}

export function parseRange(query = {}) {
  const today = todayInTz()
  const to = query.to || today
  let from = query.from
  if (!from) {
    const d = toUtcDate(to)
    d.setUTCMonth(d.getUTCMonth() - 5, 1)
    from = fmt(d)
  }
  if (!isIsoDate(from) || !isIsoDate(to)) throw new AppError('Dates must be in YYYY-MM-DD format.', 400)
  if (from > to) throw new AppError('The start date must be on or before the end date.', 400)
  const days = (toUtcDate(to) - toUtcDate(from)) / 86400000
  if (days > MAX_RANGE_DAYS) throw new AppError('Date range is limited to 3 years.', 400)
  const granularity = query.granularity || (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month')
  if (!GRANULARITIES.includes(granularity)) throw new AppError('granularity must be day, week or month.', 400)
  return { from, to, granularity, today, timezone: TZ }
}

const uuid = (v) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null)

// ── SQL fragments ───────────────────────────────────────────────────────────────
const local = (col) => Prisma.sql`(${col} AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})`
const inRange = (col, r) => Prisma.sql`${local(col)}::date BETWEEN ${r.from}::date AND ${r.to}::date`
const bucket = (col, r) => Prisma.sql`to_char(date_trunc(${r.granularity}, ${local(col)}), 'YYYY-MM-DD')`

/**
 * Builds WHERE fragments for each entity. `agentId` limits everything to that agent's book:
 * customers assigned to the agent plus records explicitly linked to them (the same rules the
 * agent workspace API uses). Admin filters (agent / policy type / company) narrow further.
 */
function scopes({ agentId, policyTypeId, companyId }) {
  const T = Prisma.sql`TRUE`
  const and = (...parts) => Prisma.join(parts.filter(Boolean), ' AND ')
  return {
    customer: agentId ? Prisma.sql`c."assignedAgentId" = ${agentId}` : T,
    application: and(
      agentId ? Prisma.sql`(c."assignedAgentId" = ${agentId} OR a."assistedByAgentId" = ${agentId})` : T,
      policyTypeId ? Prisma.sql`a."policyTypeId" = ${policyTypeId}` : null,
    ),
    policy: and(
      agentId ? Prisma.sql`(c."assignedAgentId" = ${agentId} OR p."agentId" = ${agentId})` : T,
      policyTypeId ? Prisma.sql`p."policyTypeId" = ${policyTypeId}` : null,
      companyId ? Prisma.sql`p."companyId" = ${companyId}` : null,
    ),
    claim: and(
      agentId ? Prisma.sql`(c."assignedAgentId" = ${agentId} OR cl."assignedAgentId" = ${agentId} OR p."agentId" = ${agentId})` : T,
      policyTypeId ? Prisma.sql`p."policyTypeId" = ${policyTypeId}` : null,
      companyId ? Prisma.sql`p."companyId" = ${companyId}` : null,
    ),
  }
}

// Joins used with the fragments above
const APP_FROM = Prisma.sql`"InsuranceApplication" a JOIN "Customer" c ON c.id = a."customerId"`
const POL_FROM = Prisma.sql`"InsurancePolicy" p JOIN "Customer" c ON c.id = p."customerId"`
const PREM_FROM = Prisma.sql`"Premium" pr JOIN "InsurancePolicy" p ON p.id = pr."policyId" JOIN "Customer" c ON c.id = p."customerId"`
const PAY_FROM = Prisma.sql`"PremiumPayment" pp JOIN "InsurancePolicy" p ON p.id = pp."policyId" JOIN "Customer" c ON c.id = p."customerId"`
const CLAIM_FROM = Prisma.sql`"Claim" cl JOIN "InsurancePolicy" p ON p.id = cl."policyId" JOIN "Customer" c ON c.id = cl."customerId"`
const REN_FROM = Prisma.sql`"PolicyRenewal" rn JOIN "InsurancePolicy" p ON p.id = rn."policyId" JOIN "Customer" c ON c.id = p."customerId"`

function fill(keys, rows, fields) {
  const byKey = new Map(rows.map((r) => [r.bucket, r]))
  return keys.map((k) => {
    const r = byKey.get(k) || {}
    const out = { period: k }
    for (const f of fields) out[f] = Number(r[f] || 0)
    return out
  })
}

/**
 * @param {object} opts
 * @param {'ADMIN'|'AGENT'} opts.role
 * @param {string} [opts.scopeAgentId]  authenticated agent id (AGENT role)
 * @param {object} opts.query           raw query string (from, to, granularity, agentId, policyTypeId, companyId)
 */
export async function getAnalytics({ role, scopeAgentId, query }) {
  await refreshOverduePremiums()
  const r = parseRange(query)
  const isAdmin = role === 'ADMIN'
  const filters = {
    agentId: isAdmin ? uuid(query.agentId) : scopeAgentId,
    policyTypeId: uuid(query.policyTypeId),
    companyId: isAdmin ? uuid(query.companyId) : null,
  }
  const s = scopes(filters)
  const keys = bucketKeys(r.from, r.to, r.granularity)
  const today = r.today

  const q = (sql) => prisma.$queryRaw(sql)
  const [
    [custKpi], [appKpi], [polKpi], [premKpi], [payKpi], [claimKpi], [renKpi], agentKpi,
    appSeries, approvalSeries, policySeries, collectionSeries, dueSeries, paymentStatus,
    claimStatus, claimSeries, byType, byCompany, renewalStatus, renewalUpcoming, customerSeries,
    appsByType, customersByCity, agentPerformance,
  ] = await Promise.all([
    // ── KPIs ──
    q(Prisma.sql`SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE ${inRange(Prisma.sql`c."createdAt"`, r)})::int AS "newInRange"
                 FROM "Customer" c WHERE ${s.customer}`),
    q(Prisma.sql`SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE ${inRange(Prisma.sql`a."applicationDate"`, r)})::int AS "submittedInRange",
                        COUNT(*) FILTER (WHERE a.status = 'PENDING')::int AS pending,
                        COUNT(*) FILTER (WHERE a.status = 'APPROVED')::int AS approved,
                        COUNT(*) FILTER (WHERE a.status = 'REJECTED')::int AS rejected,
                        COUNT(*) FILTER (WHERE a.status = 'CANCELLED')::int AS cancelled
                 FROM ${APP_FROM} WHERE ${s.application}`),
    q(Prisma.sql`SELECT COUNT(*) FILTER (WHERE p.status = 'ACTIVE')::int AS active,
                        COUNT(*) FILTER (WHERE ${inRange(Prisma.sql`p."createdAt"`, r)})::int AS "issuedInRange",
                        COALESCE(SUM(p."sumAssured") FILTER (WHERE p.status = 'ACTIVE'), 0)::float AS "activeSumAssured",
                        COUNT(*) FILTER (WHERE p.status = 'ACTIVE' AND ${local(Prisma.sql`p."expiryDate"`)}::date
                                         BETWEEN ${today}::date AND ${today}::date + 60)::int AS "expiringIn60"
                 FROM ${POL_FROM} WHERE ${s.policy}`),
    // Premiums due = outstanding balance of unpaid installments whose due date has arrived
    q(Prisma.sql`SELECT COALESCE(SUM(pr.amount - pr."paidAmount") FILTER (WHERE ${local(Prisma.sql`pr."dueDate"`)}::date <= ${today}::date), 0)::float AS "dueNow",
                        COUNT(*) FILTER (WHERE ${local(Prisma.sql`pr."dueDate"`)}::date <= ${today}::date)::int AS "dueNowCount",
                        COUNT(*) FILTER (WHERE pr.status = 'OVERDUE')::int AS overdue,
                        COALESCE(SUM(pr.amount - pr."paidAmount") FILTER (WHERE ${local(Prisma.sql`pr."dueDate"`)}::date BETWEEN ${today}::date + 1 AND ${today}::date + 30), 0)::float AS "dueNext30"
                 FROM ${PREM_FROM} WHERE ${s.policy} AND pr.status::text = ANY(${UNPAID})`),
    // Verified = SUCCESS only. Pending submissions are reported separately and never added to collections.
    q(Prisma.sql`SELECT COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'SUCCESS' AND ${inRange(Prisma.sql`pp."paymentDate"`, r)}), 0)::float AS "verifiedInRange",
                        COUNT(*) FILTER (WHERE pp.status = 'SUCCESS' AND ${inRange(Prisma.sql`pp."paymentDate"`, r)})::int AS "verifiedCountInRange",
                        COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'SUCCESS'), 0)::float AS "verifiedAllTime",
                        COUNT(*) FILTER (WHERE pp.status = 'PENDING')::int AS "pendingCount",
                        COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'PENDING'), 0)::float AS "pendingAmount"
                 FROM ${PAY_FROM} WHERE ${s.policy}`),
    q(Prisma.sql`SELECT COUNT(*) FILTER (WHERE cl.status IN ('PENDING', 'UNDER_REVIEW'))::int AS pending,
                        COUNT(*) FILTER (WHERE cl.status = 'APPROVED')::int AS approved,
                        COUNT(*) FILTER (WHERE cl.status = 'SETTLED')::int AS settled,
                        COUNT(*) FILTER (WHERE cl.status = 'REJECTED')::int AS rejected,
                        COALESCE(SUM(cl."claimedAmount") FILTER (WHERE cl.status IN ('PENDING', 'UNDER_REVIEW')), 0)::float AS "pendingAmount"
                 FROM ${CLAIM_FROM} WHERE ${s.claim}`),
    q(Prisma.sql`SELECT COUNT(*) FILTER (WHERE rn.status IN ('UPCOMING', 'GRACE_PERIOD'))::int AS open,
                        COUNT(*) FILTER (WHERE rn.status IN ('OVERDUE', 'LAPSED'))::int AS overdue,
                        COUNT(*) FILTER (WHERE rn.status = 'RENEWED')::int AS completed
                 FROM ${REN_FROM} WHERE ${s.policy}`),
    isAdmin
      ? q(Prisma.sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active FROM "InsuranceAgent"`)
      : Promise.resolve([]),

    // ── Time series ──
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`a."applicationDate"`, r)} AS bucket, COUNT(*)::int AS submitted,
                        COUNT(*) FILTER (WHERE a.status = 'PENDING')::int AS "stillPending"
                 FROM ${APP_FROM} WHERE ${s.application} AND ${inRange(Prisma.sql`a."applicationDate"`, r)} GROUP BY 1`),
    // Decisions are bucketed by the date they were made (reviewDate), not by submission date
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`a."reviewDate"`, r)} AS bucket,
                        COUNT(*) FILTER (WHERE a.status = 'APPROVED')::int AS approved,
                        COUNT(*) FILTER (WHERE a.status = 'REJECTED')::int AS rejected
                 FROM ${APP_FROM} WHERE ${s.application} AND a."reviewDate" IS NOT NULL AND ${inRange(Prisma.sql`a."reviewDate"`, r)} GROUP BY 1`),
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`p."createdAt"`, r)} AS bucket, COUNT(*)::int AS issued,
                        COALESCE(SUM(p."sumAssured"), 0)::float AS "sumAssured"
                 FROM ${POL_FROM} WHERE ${s.policy} AND ${inRange(Prisma.sql`p."createdAt"`, r)} GROUP BY 1`),
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`pp."paymentDate"`, r)} AS bucket,
                        COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'SUCCESS'), 0)::float AS verified,
                        COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'PENDING'), 0)::float AS pending
                 FROM ${PAY_FROM} WHERE ${s.policy} AND ${inRange(Prisma.sql`pp."paymentDate"`, r)} GROUP BY 1`),
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`pr."dueDate"`, r)} AS bucket, COALESCE(SUM(pr.amount), 0)::float AS billed
                 FROM ${PREM_FROM} WHERE ${s.policy} AND ${inRange(Prisma.sql`pr."dueDate"`, r)} GROUP BY 1`),
    q(Prisma.sql`SELECT pp.status::text AS status, COUNT(*)::int AS count, COALESCE(SUM(pp.amount), 0)::float AS amount
                 FROM ${PAY_FROM} WHERE ${s.policy} AND ${inRange(Prisma.sql`pp."paymentDate"`, r)} GROUP BY 1 ORDER BY 1`),
    q(Prisma.sql`SELECT cl.status::text AS status, COUNT(*)::int AS count, COALESCE(SUM(cl."claimedAmount"), 0)::float AS claimed,
                        COALESCE(SUM(cl."approvedAmount"), 0)::float AS approved
                 FROM ${CLAIM_FROM} WHERE ${s.claim} AND ${inRange(Prisma.sql`cl."claimDate"`, r)} GROUP BY 1 ORDER BY 1`),
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`cl."claimDate"`, r)} AS bucket, COUNT(*)::int AS filed,
                        COUNT(*) FILTER (WHERE cl.status IN ('APPROVED', 'SETTLED'))::int AS "approvedOrSettled",
                        COUNT(*) FILTER (WHERE cl.status = 'REJECTED')::int AS rejected
                 FROM ${CLAIM_FROM} WHERE ${s.claim} AND ${inRange(Prisma.sql`cl."claimDate"`, r)} GROUP BY 1`),
    // Portfolio = current active book (not date-filtered)
    q(Prisma.sql`SELECT pt.name AS name, COUNT(*)::int AS policies, COALESCE(SUM(p."sumAssured"), 0)::float AS "sumAssured"
                 FROM ${POL_FROM} JOIN "PolicyType" pt ON pt.id = p."policyTypeId"
                 WHERE ${s.policy} AND p.status = 'ACTIVE' GROUP BY pt.name ORDER BY policies DESC, pt.name`),
    q(Prisma.sql`SELECT COALESCE(ic.name, 'No insurer assigned') AS name, COUNT(*)::int AS policies, COALESCE(SUM(p."sumAssured"), 0)::float AS "sumAssured"
                 FROM ${POL_FROM} LEFT JOIN "InsuranceCompany" ic ON ic.id = p."companyId"
                 WHERE ${s.policy} AND p.status = 'ACTIVE' GROUP BY 1 ORDER BY policies DESC, 1`),
    q(Prisma.sql`SELECT rn.status::text AS status, COUNT(*)::int AS count
                 FROM ${REN_FROM} WHERE ${s.policy} GROUP BY 1 ORDER BY 1`),
    // Next 6 months of expiries, and how many still have no renewal opened (need attention)
    q(Prisma.sql`SELECT to_char(date_trunc('month', ${local(Prisma.sql`p."expiryDate"`)}), 'YYYY-MM-DD') AS bucket,
                        COUNT(*)::int AS expiring,
                        COUNT(*) FILTER (WHERE NOT EXISTS (
                          SELECT 1 FROM "PolicyRenewal" x WHERE x."policyId" = p.id AND x.status IN ('UPCOMING', 'GRACE_PERIOD', 'RENEWED', 'OVERDUE')
                            AND x."newStartDate" >= p."expiryDate" - interval '1 day'))::int AS "needsAttention"
                 FROM ${POL_FROM} WHERE ${s.policy} AND p.status = 'ACTIVE'
                   AND ${local(Prisma.sql`p."expiryDate"`)}::date BETWEEN ${today}::date AND (${today}::date + interval '6 months')::date
                 GROUP BY 1 ORDER BY 1`),
    q(Prisma.sql`SELECT ${bucket(Prisma.sql`c."createdAt"`, r)} AS bucket, COUNT(*)::int AS registered
                 FROM "Customer" c WHERE ${s.customer} AND ${inRange(Prisma.sql`c."createdAt"`, r)} GROUP BY 1`),
    q(Prisma.sql`SELECT pt.name AS name, COUNT(*)::int AS applications,
                        COUNT(*) FILTER (WHERE a.status = 'APPROVED')::int AS approved,
                        COUNT(*) FILTER (WHERE a.status = 'REJECTED')::int AS rejected,
                        COUNT(*) FILTER (WHERE a.status = 'PENDING')::int AS pending
                 FROM ${APP_FROM} JOIN "PolicyType" pt ON pt.id = a."policyTypeId"
                 WHERE ${s.application} AND ${inRange(Prisma.sql`a."applicationDate"`, r)} GROUP BY pt.name ORDER BY applications DESC, pt.name`),
    q(Prisma.sql`SELECT c.city AS name, COUNT(*)::int AS customers FROM "Customer" c WHERE ${s.customer}
                 GROUP BY c.city ORDER BY customers DESC, c.city LIMIT 8`),
    isAdmin
      ? q(Prisma.sql`SELECT ag.id, ag."agentNumber", ag."firstName", ag."lastName", ag.status::text AS status,
            (SELECT COUNT(*)::int FROM "Customer" c WHERE c."assignedAgentId" = ag.id) AS customers,
            (SELECT COUNT(*)::int FROM "InsuranceApplication" a WHERE a."assistedByAgentId" = ag.id AND ${inRange(Prisma.sql`a."applicationDate"`, r)}) AS applications,
            (SELECT COUNT(*)::int FROM "InsuranceApplication" a WHERE a."assistedByAgentId" = ag.id AND a.status = 'APPROVED' AND a."reviewDate" IS NOT NULL AND ${inRange(Prisma.sql`a."reviewDate"`, r)}) AS approved,
            (SELECT COUNT(*)::int FROM "InsurancePolicy" p WHERE p."agentId" = ag.id AND ${inRange(Prisma.sql`p."createdAt"`, r)}) AS "policiesIssued",
            (SELECT COALESCE(SUM(pp.amount), 0)::float FROM "PremiumPayment" pp JOIN "InsurancePolicy" p ON p.id = pp."policyId"
               WHERE p."agentId" = ag.id AND pp.status = 'SUCCESS' AND ${inRange(Prisma.sql`pp."paymentDate"`, r)}) AS collections
          FROM "InsuranceAgent" ag
          ${filters.agentId ? Prisma.sql`WHERE ag.id = ${filters.agentId}` : Prisma.empty}
          ORDER BY collections DESC, "policiesIssued" DESC, ag."lastName" LIMIT 50`)
      : Promise.resolve([]),
  ])

  // Merge application submissions and decisions on one axis
  const decisions = new Map(approvalSeries.map((x) => [x.bucket, x]))
  const applications = fill(keys, appSeries, ['submitted', 'stillPending']).map((p) => ({
    ...p,
    approved: Number(decisions.get(p.period)?.approved || 0),
    rejected: Number(decisions.get(p.period)?.rejected || 0),
  }))
  const billed = new Map(dueSeries.map((x) => [x.bucket, Number(x.billed)]))
  const collections = fill(keys, collectionSeries, ['verified', 'pending']).map((p) => ({ ...p, billed: billed.get(p.period) || 0 }))

  // Six-month renewal axis, zero-filled
  const renewalMonths = []
  for (let i = 0; i < 6; i++) {
    const d = toUtcDate(today)
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() + i)
    renewalMonths.push(fmt(d))
  }

  return {
    range: r,
    filters: { agentId: filters.agentId, policyTypeId: filters.policyTypeId, companyId: filters.companyId },
    generatedAt: new Date().toISOString(),
    kpis: {
      customers: custKpi.total,
      newCustomersInRange: custKpi.newInRange,
      ...(isAdmin && { agents: agentKpi[0].total, activeAgents: agentKpi[0].active }),
      applications: appKpi.total,
      applicationsSubmittedInRange: appKpi.submittedInRange,
      applicationsPending: appKpi.pending,
      applicationsApproved: appKpi.approved,
      applicationsRejected: appKpi.rejected,
      activePolicies: polKpi.active,
      activeSumAssured: polKpi.activeSumAssured,
      policiesIssuedInRange: polKpi.issuedInRange,
      premiumsDueNow: premKpi.dueNow,
      premiumsDueNowCount: premKpi.dueNowCount,
      premiumsOverdueCount: premKpi.overdue,
      premiumsDueNext30: premKpi.dueNext30,
      verifiedCollectionsInRange: payKpi.verifiedInRange,
      verifiedPaymentsInRange: payKpi.verifiedCountInRange,
      verifiedCollectionsAllTime: payKpi.verifiedAllTime,
      pendingVerifications: payKpi.pendingCount,
      pendingVerificationAmount: payKpi.pendingAmount,
      claimsPending: claimKpi.pending,
      claimsPendingAmount: claimKpi.pendingAmount,
      claimsApproved: claimKpi.approved,
      claimsSettled: claimKpi.settled,
      claimsRejected: claimKpi.rejected,
      upcomingRenewals: polKpi.expiringIn60,
      renewalsOpen: renKpi.open,
      renewalsOverdue: renKpi.overdue,
      renewalsCompleted: renKpi.completed,
    },
    series: {
      applications,
      policiesIssued: fill(keys, policySeries, ['issued', 'sumAssured']),
      collections,
      claims: fill(keys, claimSeries, ['filed', 'approvedOrSettled', 'rejected']),
      customerGrowth: fill(keys, customerSeries, ['registered']),
    },
    breakdowns: {
      paymentStatus,
      claimsByStatus: claimStatus,
      portfolioByPolicyType: byType,
      portfolioByCompany: byCompany,
      renewalsByStatus: renewalStatus,
      upcomingRenewalsByMonth: fill(renewalMonths, renewalUpcoming, ['expiring', 'needsAttention']),
      applicationsByPolicyType: appsByType,
      customersByCity: customersByCity,
      ...(isAdmin && { agentPerformance }),
    },
  }
}
