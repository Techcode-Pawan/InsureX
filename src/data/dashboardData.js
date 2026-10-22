// ============================================================
// InsureX Dashboard Mock Data
// Demonstration data only. Not real business statistics.
// Extends the base mockData.js without modifying it.
// ============================================================

// ---- KPI Data by Date Range ----
export const kpiByRange = {
  '7d': {
    totalCustomers:  { value: 2845, change: +2.1,  prev: 2786 },
    activePolicies:  { value: 1926, change: +1.4,  prev: 1899 },
    pendingClaims:   { value: 48,   change: -6.0,  prev: 51   },
    premiumsCollected: { value: 284500, change: +3.8, prev: 274000 },
  },
  '30d': {
    totalCustomers:  { value: 2845, change: +5.3,  prev: 2702 },
    activePolicies:  { value: 1926, change: +4.1,  prev: 1850 },
    pendingClaims:   { value: 48,   change: -8.0,  prev: 52   },
    premiumsCollected: { value: 1842500, change: +9.2, prev: 1687000 },
  },
  '90d': {
    totalCustomers:  { value: 2845, change: +11.8, prev: 2545 },
    activePolicies:  { value: 1926, change: +9.6,  prev: 1757 },
    pendingClaims:   { value: 48,   change: -14.0, prev: 56   },
    premiumsCollected: { value: 1842500, change: +16.4, prev: 1582500 },
  },
  'year': {
    totalCustomers:  { value: 2845, change: +24.7, prev: 2281 },
    activePolicies:  { value: 1926, change: +21.3, prev: 1587 },
    pendingClaims:   { value: 48,   change: -22.0, prev: 62   },
    premiumsCollected: { value: 5842500, change: +28.1, prev: 4560000 },
  },
}

// ---- Monthly Premium Collection (full year) ----
export const premiumByRange = {
  '7d': [
    { label: 'Mon',  amount: 38200 },
    { label: 'Tue',  amount: 42100 },
    { label: 'Wed',  amount: 36800 },
    { label: 'Thu',  amount: 45300 },
    { label: 'Fri',  amount: 51200 },
    { label: 'Sat',  amount: 28400 },
    { label: 'Sun',  amount: 19800 },
  ],
  '30d': [
    { label: 'W1',  amount: 198000 },
    { label: 'W2',  amount: 224000 },
    { label: 'W3',  amount: 210000 },
    { label: 'W4',  amount: 210500 },
  ],
  '90d': [
    { label: 'May', amount: 568000 },
    { label: 'Jun', amount: 612000 },
    { label: 'Jul', amount: 662500 },
  ],
  'year': [
    { label: 'Jan', amount: 368000  },
    { label: 'Feb', amount: 412000  },
    { label: 'Mar', amount: 445000  },
    { label: 'Apr', amount: 428000  },
    { label: 'May', amount: 568000  },
    { label: 'Jun', amount: 612000  },
    { label: 'Jul', amount: 662500  },
    { label: 'Aug', amount: 598000  },
    { label: 'Sep', amount: 634000  },
    { label: 'Oct', amount: 481000  },
    { label: 'Nov', amount: 0       },
    { label: 'Dec', amount: 0       },
  ],
}

// ---- Policy Distribution (Donut Chart) ----
export const policyDistribution = [
  { name: 'Life Insurance',    value: 612, color: '#168BFF' },
  { name: 'Health Insurance',  value: 498, color: '#20B8FF' },
  { name: 'Vehicle Insurance', value: 384, color: '#0EA5E9' },
  { name: 'Home Insurance',    value: 246, color: '#38BDF8' },
  { name: 'Travel Insurance',  value: 124, color: '#7DD3FC' },
  { name: 'Other Insurance',   value: 62,  color: '#BAE6FD' },
]

// ---- Claims by Status (Bar Chart) ----
export const claimsByStatus = [
  { status: 'Pending',      count: 48,  color: '#F59E0B' },
  { status: 'Under Review', count: 34,  color: '#168BFF' },
  { status: 'Approved',     count: 127, color: '#10B981' },
  { status: 'Rejected',     count: 29,  color: '#EF4444' },
  { status: 'Settled',      count: 214, color: '#8B5CF6' },
]

// ---- Recent Activity Feed ----
export const recentActivities = [
  {
    id: 'ACT001',
    type: 'customer',
    icon: 'Users',
    title: 'New customer registered',
    description: 'Arjun Mehta completed onboarding.',
    time: '4 min ago',
    link: '/customers',
  },
  {
    id: 'ACT002',
    type: 'application',
    icon: 'FolderOpen',
    title: 'Insurance application submitted',
    description: 'Health policy application from Sneha Kapoor.',
    time: '18 min ago',
    link: '/applications',
  },
  {
    id: 'ACT003',
    type: 'payment',
    icon: 'Banknote',
    title: 'Premium payment recorded',
    description: '₹12,400 collected for policy P2024-084.',
    time: '42 min ago',
    link: '/payments',
  },
  {
    id: 'ACT004',
    type: 'claim',
    icon: 'AlertCircle',
    title: 'Claim submitted',
    description: 'CL2024-091 filed by Rahul Desai – Vehicle damage.',
    time: '1 hr ago',
    link: '/claims',
  },
  {
    id: 'ACT005',
    type: 'renewal',
    icon: 'RefreshCcw',
    title: 'Insurance policy renewed',
    description: 'Policy P2024-033 renewed for Kavya Sharma.',
    time: '2 hr ago',
    link: '/renewals',
  },
  {
    id: 'ACT006',
    type: 'claim',
    icon: 'GitPullRequest',
    title: 'Claim status updated',
    description: 'CL2024-078 moved to Approved – ₹38,000 settlement.',
    time: '3 hr ago',
    link: '/claim-processing',
  },
  {
    id: 'ACT007',
    type: 'policy',
    icon: 'Shield',
    title: 'New policy issued',
    description: 'Life policy P2024-102 issued to Vikram Nair.',
    time: '5 hr ago',
    link: '/policies',
  },
]

// ---- Recent Policies Table ----
export const recentPolicies = [
  {
    id: 'P2024-102',
    customer: 'Vikram Nair',
    type: 'Life Insurance',
    premium: 18400,
    startDate: '2024-10-01',
    expiryDate: '2025-10-01',
    status: 'active',
  },
  {
    id: 'P2024-101',
    customer: 'Sneha Kapoor',
    type: 'Health Insurance',
    premium: 12400,
    startDate: '2024-09-15',
    expiryDate: '2025-09-15',
    status: 'active',
  },
  {
    id: 'P2024-098',
    customer: 'Arjun Mehta',
    type: 'Vehicle Insurance',
    premium: 8200,
    startDate: '2024-09-01',
    expiryDate: '2025-09-01',
    status: 'pending',
  },
  {
    id: 'P2024-094',
    customer: 'Priya Sharma',
    type: 'Home Insurance',
    premium: 9600,
    startDate: '2024-08-20',
    expiryDate: '2025-08-20',
    status: 'active',
  },
  {
    id: 'P2024-089',
    customer: 'Rahul Desai',
    type: 'Vehicle Insurance',
    premium: 7400,
    startDate: '2024-08-05',
    expiryDate: '2025-08-05',
    status: 'active',
  },
  {
    id: 'P2024-081',
    customer: 'Kavya Sharma',
    type: 'Travel Insurance',
    premium: 3200,
    startDate: '2024-07-10',
    expiryDate: '2024-10-10',
    status: 'expired',
  },
  {
    id: 'P2024-076',
    customer: 'Deepak Joshi',
    type: 'Life Insurance',
    premium: 22000,
    startDate: '2024-06-01',
    expiryDate: '2025-06-01',
    status: 'active',
  },
  {
    id: 'P2024-071',
    customer: 'Meera Pillai',
    type: 'Health Insurance',
    premium: 14800,
    startDate: '2024-05-15',
    expiryDate: '2025-05-15',
    status: 'cancelled',
  },
]

// ---- Quick Actions ----
export const quickActions = [
  { label: 'Add Customer',         icon: 'UserPlus',    action: 'modal',      link: '/customers'    },
  { label: 'View Policies',        icon: 'Shield',      action: 'navigate',   link: '/policies'     },
  { label: 'Review Applications',  icon: 'FolderOpen',  action: 'navigate',   link: '/applications' },
  { label: 'Review Claims',        icon: 'AlertCircle', action: 'navigate',   link: '/claims'       },
]

// ---- CSV Export Helper ----
export function buildExportCSV(kpi, range) {
  const rangeLabel = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'year': 'This Year' }[range]
  const rows = [
    ['InsureX – Dashboard Export'],
    [`Date Range: ${rangeLabel}`],
    [`Exported At: ${new Date().toLocaleString('en-IN')}`],
    [],
    ['KPI Summary'],
    ['Metric', 'Value', 'Change vs Previous Period'],
    ['Total Customers',    kpi.totalCustomers.value,      `${kpi.totalCustomers.change > 0 ? '+' : ''}${kpi.totalCustomers.change}%`],
    ['Active Policies',    kpi.activePolicies.value,      `${kpi.activePolicies.change > 0 ? '+' : ''}${kpi.activePolicies.change}%`],
    ['Pending Claims',     kpi.pendingClaims.value,       `${kpi.pendingClaims.change > 0 ? '+' : ''}${kpi.pendingClaims.change}%`],
    ['Premiums Collected', `INR ${kpi.premiumsCollected.value.toLocaleString('en-IN')}`, `${kpi.premiumsCollected.change > 0 ? '+' : ''}${kpi.premiumsCollected.change}%`],
    [],
    ['Policy Distribution'],
    ['Category', 'Count'],
    ...policyDistribution.map(p => [p.name, p.value]),
    [],
    ['Claims by Status'],
    ['Status', 'Count'],
    ...claimsByStatus.map(c => [c.status, c.count]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}
