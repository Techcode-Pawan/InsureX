// ============================================================
// InsureX Reporting & Analytics Mock Datasets
// All data is for demonstration and reporting analytics.
// ============================================================

export function formatINR(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

// ── Policy Distribution by Type ──────────────────────────────
export const policyDistributionData = [
  { name: 'Life Insurance', count: 34, value: 45000000, color: '#168BFF' },
  { name: 'Health Insurance', count: 48, value: 24000000, color: '#10B981' },
  { name: 'Vehicle Insurance', count: 28, value: 16500000, color: '#F59E0B' },
  { name: 'Home Insurance', count: 18, value: 22000000, color: '#8B5CF6' },
  { name: 'Travel Insurance', count: 15, value: 3500000, color: '#20B8FF' },
  { name: 'Other / Commercial', count: 9, value: 9200000, color: '#EC4899' },
]

// ── Monthly Premium Collections Trend ────────────────────────
export const premiumMonthlyTrend = [
  { month: 'Nov 23', collected: 1850000, target: 1600000 },
  { month: 'Dec 23', collected: 2120000, target: 1800000 },
  { month: 'Jan 24', collected: 2450000, target: 2000000 },
  { month: 'Feb 24', collected: 1980000, target: 2000000 },
  { month: 'Mar 24', collected: 3200000, target: 2500000 },
  { month: 'Apr 24', collected: 2150000, target: 2200000 },
  { month: 'May 24', collected: 2680000, target: 2300000 },
  { month: 'Jun 24', collected: 2890000, target: 2400000 },
  { month: 'Jul 24', collected: 3120000, target: 2600000 },
  { month: 'Aug 24', collected: 2950000, target: 2700000 },
  { month: 'Sep 24', collected: 3400000, target: 2800000 },
  { month: 'Oct 24', collected: 3650000, target: 3000000 },
]

// ── Claim Status Distribution ────────────────────────────────
export const claimStatusDistribution = [
  { name: 'Settled', count: 32, value: 4850000, color: '#10B981' },
  { name: 'Approved', count: 12, value: 1620000, color: '#168BFF' },
  { name: 'Under Review', count: 18, value: 2450000, color: '#6366F1' },
  { name: 'Pending', count: 15, value: 1890000, color: '#F59E0B' },
  { name: 'Rejected', count: 8, value: 1100000, color: '#EF4444' },
]

// ── Customer Registrations Trend ─────────────────────────────
export const customerRegistrationTrend = [
  { month: 'Jan 24', newCustomers: 14, activeTotal: 120 },
  { month: 'Feb 24', newCustomers: 18, activeTotal: 138 },
  { month: 'Mar 24', newCustomers: 26, activeTotal: 164 },
  { month: 'Apr 24', newCustomers: 22, activeTotal: 186 },
  { month: 'May 24', newCustomers: 30, activeTotal: 216 },
  { month: 'Jun 24', newCustomers: 28, activeTotal: 244 },
  { month: 'Jul 24', newCustomers: 35, activeTotal: 279 },
  { month: 'Aug 24', newCustomers: 31, activeTotal: 310 },
  { month: 'Sep 24', newCustomers: 42, activeTotal: 352 },
  { month: 'Oct 24', newCustomers: 46, activeTotal: 398 },
]

// ── Renewal Performance Statistics ───────────────────────────
export const renewalStatisticsData = [
  { quarter: 'Q4 2023', renewed: 42, upcoming: 0, overdue: 4, lapsed: 2 },
  { quarter: 'Q1 2024', renewed: 58, upcoming: 0, overdue: 5, lapsed: 3 },
  { quarter: 'Q2 2024', renewed: 64, upcoming: 0, overdue: 6, lapsed: 4 },
  { quarter: 'Q3 2024', renewed: 71, upcoming: 12, overdue: 7, lapsed: 2 },
  { quarter: 'Q4 2024', renewed: 38, upcoming: 45, overdue: 3, lapsed: 1 },
]

// ── Overall KPI Summary ──────────────────────────────────────
export const reportKPIs = {
  grossWrittenPremium: 32440000,
  gwpGrowthPct: 18.4,
  claimsSettlementRatio: 94.2,
  csrImprovement: '+2.1% YoY',
  averageClaimTAT: 4.8,
  tatUnit: 'days',
  policyRetentionRate: 88.6,
  retentionTarget: 'Target: 85%',
}

// ── Helper: Download CSV ─────────────────────────────────────
export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return
  const separator = ','
  const keys = Object.keys(rows[0])
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k]
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString()
            cell = cell.replace(/"/g, '""')
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`
            return cell
          })
          .join(separator)
      })
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
