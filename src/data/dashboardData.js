// ============================================================
// InsureX Dashboard Mock Data
// All values are deterministic demonstration data.
// Separate from UI components for easy backend swap-out.
// ============================================================

// ---- INR Formatter ----
export function formatINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatINRFull(amount) {
  return `₹${amount.toLocaleString('en-IN')}`
}

// ============================================================
// KPI Cards — per date range
// ============================================================
export const kpiByRange = {
  '7d': {
    totalCustomers:    { value: 2845, prev: 2791, change: +1.9 },
    activePolicies:    { value: 1926, prev: 1884, change: +2.2 },
    pendingClaims:     { value: 48,   prev: 53,   change: -9.4 },
    premiumsCollected: { value: 284500, prev: 261200, change: +8.9 },
  },
  '30d': {
    totalCustomers:    { value: 2845, prev: 2690, change: +5.8 },
    activePolicies:    { value: 1926, prev: 1802, change: +6.9 },
    pendingClaims:     { value: 48,   prev: 61,   change: -21.3 },
    premiumsCollected: { value: 1842500, prev: 1615000, change: +14.1 },
  },
  '90d': {
    totalCustomers:    { value: 2845, prev: 2510, change: +13.3 },
    activePolicies:    { value: 1926, prev: 1640, change: +17.4 },
    pendingClaims:     { value: 48,   prev: 74,   change: -35.1 },
    premiumsCollected: { value: 5210000, prev: 4480000, change: +16.3 },
  },
  'year': {
    totalCustomers:    { value: 2845, prev: 2102, change: +35.3 },
    activePolicies:    { value: 1926, prev: 1388, change: +38.8 },
    pendingClaims:     { value: 48,   prev: 91,   change: -47.3 },
    premiumsCollected: { value: 18425000, prev: 14820000, change: +24.3 },
  },
}

// ============================================================
// Premium Collection Chart — per date range
// ============================================================
export const premiumChartByRange = {
  '7d': [
    { label: 'Mon', amount: 38400 },
    { label: 'Tue', amount: 41200 },
    { label: 'Wed', amount: 35800 },
    { label: 'Thu', amount: 44600 },
    { label: 'Fri', amount: 52100 },
    { label: 'Sat', amount: 29500 },
    { label: 'Sun', amount: 22900 },
  ],
  '30d': [
    { label: 'W1',  amount: 412000 },
    { label: 'W2',  amount: 468500 },
    { label: 'W3',  amount: 445000 },
    { label: 'W4',  amount: 517000 },
  ],
  '90d': [
    { label: 'Aug', amount: 1620000 },
    { label: 'Sep', amount: 1745000 },
    { label: 'Oct', amount: 1842500 },
  ],
  'year': [
    { label: 'Jan', amount: 1180000 },
    { label: 'Feb', amount: 1245000 },
    { label: 'Mar', amount: 1390000 },
    { label: 'Apr', amount: 1302000 },
    { label: 'May', amount: 1478000 },
    { label: 'Jun', amount: 1560000 },
    { label: 'Jul', amount: 1615000 },
    { label: 'Aug', amount: 1620000 },
    { label: 'Sep', amount: 1745000 },
    { label: 'Oct', amount: 1842500 },
    { label: 'Nov', amount: 1720000 },
    { label: 'Dec', amount: 1928000 },
  ],
}

// ============================================================
// Policy Distribution (Donut Chart)
// ============================================================
export const policyDistribution = [
  { name: 'Life Insurance',    value: 648,  color: '#168BFF' },
  { name: 'Health Insurance',  value: 512,  color: '#20B8FF' },
  { name: 'Vehicle Insurance', value: 388,  color: '#6366F1' },
  { name: 'Home Insurance',    value: 194,  color: '#10B981' },
  { name: 'Travel Insurance',  value: 118,  color: '#F59E0B' },
  { name: 'Other Insurance',   value: 66,   color: '#64748B' },
]

// ============================================================
// Claims Overview (Bar Chart) — per date range
// ============================================================
export const claimsOverviewByRange = {
  '7d': [
    { status: 'Pending',      count: 48  },
    { status: 'Under Review', count: 32  },
    { status: 'Approved',     count: 21  },
    { status: 'Rejected',     count: 8   },
    { status: 'Settled',      count: 14  },
  ],
  '30d': [
    { status: 'Pending',      count: 48  },
    { status: 'Under Review', count: 61  },
    { status: 'Approved',     count: 87  },
    { status: 'Rejected',     count: 24  },
    { status: 'Settled',      count: 63  },
  ],
  '90d': [
    { status: 'Pending',      count: 48  },
    { status: 'Under Review', count: 74  },
    { status: 'Approved',     count: 218 },
    { status: 'Rejected',     count: 56  },
    { status: 'Settled',      count: 194 },
  ],
  'year': [
    { status: 'Pending',      count: 48  },
    { status: 'Under Review', count: 112 },
    { status: 'Approved',     count: 641 },
    { status: 'Rejected',     count: 189 },
    { status: 'Settled',      count: 820 },
  ],
}

export const claimStatusColors = {
  'Pending':      '#F59E0B',
  'Under Review': '#168BFF',
  'Approved':     '#10B981',
  'Rejected':     '#EF4444',
  'Settled':      '#6366F1',
}

// ============================================================
// Recent Activities
// ============================================================
export const recentActivities = [
  {
    id: 'ACT001',
    type: 'customer',
    icon: 'UserPlus',
    title: 'New customer registered',
    description: 'Arjun Mehta completed registration.',
    time: '5 min ago',
    link: '/customers',
  },
  {
    id: 'ACT002',
    type: 'application',
    icon: 'FolderOpen',
    title: 'Application submitted',
    description: 'APP-2024-0312 filed for Life Insurance.',
    time: '22 min ago',
    link: '/applications',
  },
  {
    id: 'ACT003',
    type: 'payment',
    icon: 'Banknote',
    title: 'Premium payment recorded',
    description: 'POL-2024-0198 — ₹4,200 received via UPI.',
    time: '1 hr ago',
    link: '/payments',
  },
  {
    id: 'ACT004',
    type: 'claim',
    icon: 'AlertCircle',
    title: 'Claim submitted',
    description: 'CL-2024-0089 filed by Priya Sharma (Health).',
    time: '2 hr ago',
    link: '/claims',
  },
  {
    id: 'ACT005',
    type: 'renewal',
    icon: 'RefreshCcw',
    title: 'Policy renewed',
    description: 'POL-2024-0045 renewed for 12 months.',
    time: '3 hr ago',
    link: '/renewals',
  },
  {
    id: 'ACT006',
    type: 'claim',
    icon: 'CheckCircle2',
    title: 'Claim status updated',
    description: 'CL-2024-0072 approved — ₹28,000 settlement.',
    time: '5 hr ago',
    link: '/claim-processing',
  },
  {
    id: 'ACT007',
    type: 'policy',
    icon: 'Shield',
    title: 'New policy issued',
    description: 'POL-2024-0321 — Vehicle Insurance for Ravi Desai.',
    time: '8 hr ago',
    link: '/policies',
  },
]

// ============================================================
// Recent Policies (Table)
// ============================================================
export const recentPolicies = [
  {
    id: 'POL-2024-0321',
    customer: 'Ravi Desai',
    type: 'Vehicle Insurance',
    premium: 8400,
    startDate: '2024-10-01',
    expiryDate: '2025-10-01',
    status: 'active',
  },
  {
    id: 'POL-2024-0312',
    customer: 'Sunita Rao',
    type: 'Health Insurance',
    premium: 12000,
    startDate: '2024-09-15',
    expiryDate: '2025-09-15',
    status: 'active',
  },
  {
    id: 'POL-2024-0298',
    customer: 'Arjun Mehta',
    type: 'Life Insurance',
    premium: 18500,
    startDate: '2024-09-01',
    expiryDate: '2025-09-01',
    status: 'pending',
  },
  {
    id: 'POL-2024-0245',
    customer: 'Kavya Iyer',
    type: 'Home Insurance',
    premium: 9200,
    startDate: '2024-07-10',
    expiryDate: '2025-07-10',
    status: 'active',
  },
  {
    id: 'POL-2024-0198',
    customer: 'Deepak Sharma',
    type: 'Health Insurance',
    premium: 14800,
    startDate: '2024-06-01',
    expiryDate: '2025-06-01',
    status: 'active',
  },
  {
    id: 'POL-2024-0155',
    customer: 'Meera Pillai',
    type: 'Travel Insurance',
    premium: 3500,
    startDate: '2024-04-20',
    expiryDate: '2024-10-20',
    status: 'expired',
  },
  {
    id: 'POL-2024-0132',
    customer: 'Vikram Singh',
    type: 'Life Insurance',
    premium: 22000,
    startDate: '2024-03-05',
    expiryDate: '2025-03-05',
    status: 'active',
  },
  {
    id: 'POL-2024-0099',
    customer: 'Nisha Gupta',
    type: 'Vehicle Insurance',
    premium: 7600,
    startDate: '2024-02-14',
    expiryDate: '2025-02-14',
    status: 'cancelled',
  },
]

// ============================================================
// Date Range Options
// ============================================================
export const dateRangeOptions = [
  { value: '7d',   label: 'Last 7 Days' },
  { value: '30d',  label: 'Last 30 Days' },
  { value: '90d',  label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
]

// ============================================================
// CSV Export Helper
// ============================================================
export function generateDashboardCSV(range) {
  const kpi = kpiByRange[range]
  const premiums = premiumChartByRange[range]
  const claims = claimsOverviewByRange[range]
  const rangeLabel = dateRangeOptions.find(d => d.value === range)?.label || range

  const rows = [
    ['InsureX Dashboard Report', `Date Range: ${rangeLabel}`],
    [],
    ['KEY PERFORMANCE INDICATORS'],
    ['Metric', 'Value', 'Change vs Previous Period'],
    ['Total Customers',     kpi.totalCustomers.value,    `${kpi.totalCustomers.change > 0 ? '+' : ''}${kpi.totalCustomers.change}%`],
    ['Active Policies',     kpi.activePolicies.value,    `${kpi.activePolicies.change > 0 ? '+' : ''}${kpi.activePolicies.change}%`],
    ['Pending Claims',      kpi.pendingClaims.value,     `${kpi.pendingClaims.change > 0 ? '+' : ''}${kpi.pendingClaims.change}%`],
    ['Premiums Collected',  `INR ${kpi.premiumsCollected.value.toLocaleString('en-IN')}`, `${kpi.premiumsCollected.change > 0 ? '+' : ''}${kpi.premiumsCollected.change}%`],
    [],
    ['PREMIUM COLLECTION'],
    ['Period', 'Amount (INR)'],
    ...premiums.map(p => [p.label, p.amount]),
    [],
    ['CLAIMS OVERVIEW'],
    ['Status', 'Count'],
    ...claims.map(c => [c.status, c.count]),
    [],
    ['POLICY DISTRIBUTION'],
    ['Type', 'Count'],
    ...policyDistribution.map(p => [p.name, p.value]),
    [],
    ['RECENT POLICIES'],
    ['Policy ID', 'Customer', 'Type', 'Premium (INR)', 'Start Date', 'Expiry Date', 'Status'],
    ...recentPolicies.map(p => [p.id, p.customer, p.type, p.premium, p.startDate, p.expiryDate, p.status]),
    [],
    ['Note: All figures are demonstration data only. Not real business statistics.'],
  ]

  return rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
