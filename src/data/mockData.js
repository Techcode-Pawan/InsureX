// ============================================================
// InsureX Mock Data
// Used during frontend development. Replace with API calls later.
// ============================================================

// ---- Customers ----
export const customers = [
  { id: 'C001', name: 'James Harrington', email: 'james.h@email.com', phone: '+1 (555) 201-4567', dob: '1985-03-12', status: 'active', policies: 3, joinDate: '2022-01-15' },
  { id: 'C002', name: 'Priya Nair', email: 'priya.nair@email.com', phone: '+1 (555) 312-8823', dob: '1990-07-24', status: 'active', policies: 1, joinDate: '2022-06-03' },
  { id: 'C003', name: 'Marcus Webb', email: 'marcus.w@email.com', phone: '+1 (555) 409-2210', dob: '1978-11-30', status: 'inactive', policies: 0, joinDate: '2021-11-20' },
  { id: 'C004', name: 'Sofia Reyes', email: 'sofia.r@email.com', phone: '+1 (555) 510-3390', dob: '1993-04-09', status: 'active', policies: 2, joinDate: '2023-02-08' },
  { id: 'C005', name: 'Kwame Asante', email: 'kwame.a@email.com', phone: '+1 (555) 614-7741', dob: '1982-09-18', status: 'active', policies: 4, joinDate: '2021-08-14' },
]

// ---- Policy Types ----
export const policyTypes = [
  { id: 'PT01', name: 'Life Insurance', code: 'LIFE', description: 'Provides financial security to beneficiaries upon insured\'s death.', premium: 'From $50/mo', status: 'active' },
  { id: 'PT02', name: 'Health Insurance', code: 'HEALTH', description: 'Covers medical expenses and hospitalization costs.', premium: 'From $120/mo', status: 'active' },
  { id: 'PT03', name: 'Auto Insurance', code: 'AUTO', description: 'Protects against vehicle damage and third-party liability.', premium: 'From $80/mo', status: 'active' },
  { id: 'PT04', name: 'Home Insurance', code: 'HOME', description: 'Covers property damage, theft, and natural disasters.', premium: 'From $60/mo', status: 'active' },
  { id: 'PT05', name: 'Travel Insurance', code: 'TRAVEL', description: 'Protection during domestic and international travel.', premium: 'From $15/mo', status: 'inactive' },
]

// ---- Policies ----
export const policies = [
  { id: 'P2024-001', customerId: 'C001', customerName: 'James Harrington', type: 'Life Insurance', startDate: '2024-01-01', endDate: '2025-01-01', premium: 150, status: 'active', coverage: 500000 },
  { id: 'P2024-002', customerId: 'C002', customerName: 'Priya Nair', type: 'Health Insurance', startDate: '2024-02-15', endDate: '2025-02-15', premium: 220, status: 'active', coverage: 100000 },
  { id: 'P2024-003', customerId: 'C003', customerName: 'Marcus Webb', type: 'Auto Insurance', startDate: '2023-06-01', endDate: '2024-06-01', premium: 95, status: 'expired', coverage: 30000 },
  { id: 'P2024-004', customerId: 'C004', customerName: 'Sofia Reyes', type: 'Home Insurance', startDate: '2024-03-10', endDate: '2025-03-10', premium: 75, status: 'active', coverage: 250000 },
  { id: 'P2024-005', customerId: 'C005', customerName: 'Kwame Asante', type: 'Life Insurance', startDate: '2024-04-20', endDate: '2025-04-20', premium: 200, status: 'active', coverage: 750000 },
]

// ---- Claims ----
export const claims = [
  { id: 'CL2024-001', policyId: 'P2024-001', customerName: 'James Harrington', type: 'Life Insurance', amount: 15000, filed: '2024-05-01', status: 'pending', description: 'Hospitalization claim' },
  { id: 'CL2024-002', policyId: 'P2024-002', customerName: 'Priya Nair', type: 'Health Insurance', amount: 8500, filed: '2024-06-10', status: 'approved', description: 'Surgery costs' },
  { id: 'CL2024-003', policyId: 'P2024-004', customerName: 'Sofia Reyes', type: 'Home Insurance', amount: 22000, filed: '2024-07-03', status: 'processing', description: 'Storm damage to roof' },
  { id: 'CL2024-004', policyId: 'P2024-005', customerName: 'Kwame Asante', type: 'Life Insurance', amount: 5000, filed: '2024-07-20', status: 'rejected', description: 'Pre-existing condition exclusion' },
]

// ---- Agents ----
export const agents = [
  { id: 'A001', name: 'Rachel Kim', email: 'rachel.k@insurex.com', phone: '+1 (555) 701-2233', region: 'Northeast', policies: 24, commission: 8.5, status: 'active' },
  { id: 'A002', name: 'David Okonkwo', email: 'david.o@insurex.com', phone: '+1 (555) 802-4411', region: 'Southeast', policies: 19, commission: 7.0, status: 'active' },
  { id: 'A003', name: 'Linda Park', email: 'linda.p@insurex.com', phone: '+1 (555) 903-5522', region: 'West', policies: 31, commission: 9.0, status: 'active' },
]

// ---- Payments ----
export const payments = [
  { id: 'PAY001', policyId: 'P2024-001', customer: 'James Harrington', amount: 150, date: '2024-06-01', method: 'Credit Card', status: 'paid' },
  { id: 'PAY002', policyId: 'P2024-002', customer: 'Priya Nair', amount: 220, date: '2024-06-15', method: 'Bank Transfer', status: 'paid' },
  { id: 'PAY003', policyId: 'P2024-003', customer: 'Marcus Webb', amount: 95, date: '2024-07-01', method: 'Credit Card', status: 'overdue' },
  { id: 'PAY004', policyId: 'P2024-004', customer: 'Sofia Reyes', amount: 75, date: '2024-07-10', method: 'Debit Card', status: 'paid' },
  { id: 'PAY005', policyId: 'P2024-005', customer: 'Kwame Asante', amount: 200, date: '2024-07-20', method: 'Bank Transfer', status: 'pending' },
]

// ---- Insurance Companies ----
export const insuranceCompanies = [
  { id: 'IC001', name: 'Apex Life & Casualty', country: 'USA', rating: 'A+', policies: 12, status: 'active' },
  { id: 'IC002', name: 'SecureShield Insurance', country: 'Canada', rating: 'A', policies: 8, status: 'active' },
  { id: 'IC003', name: 'GlobalGuard Co.', country: 'UK', rating: 'A-', policies: 5, status: 'active' },
]

// ---- Renewals ----
export const renewals = [
  { id: 'R001', policyId: 'P2024-001', customer: 'James Harrington', type: 'Life Insurance', dueDate: '2025-01-01', premium: 150, status: 'pending' },
  { id: 'R002', policyId: 'P2024-002', customer: 'Priya Nair', type: 'Health Insurance', dueDate: '2025-02-15', premium: 220, status: 'pending' },
  { id: 'R003', policyId: 'P2024-003', customer: 'Marcus Webb', type: 'Auto Insurance', dueDate: '2024-06-01', premium: 95, status: 'overdue' },
]

// ---- Dashboard Stats ----
export const dashboardStats = {
  totalCustomers: 1284,
  activePolicies: 832,
  pendingClaims: 47,
  monthlyRevenue: 184320,
  customerGrowth: 12.4,
  policyGrowth: 8.7,
  claimsResolved: 94,
  revenueGrowth: 15.2,
}

// ---- Monthly Revenue (Recharts) ----
export const monthlyRevenue = [
  { month: 'Jan', revenue: 148000, claims: 32000 },
  { month: 'Feb', revenue: 155000, claims: 28000 },
  { month: 'Mar', revenue: 162000, claims: 35000 },
  { month: 'Apr', revenue: 158000, claims: 29000 },
  { month: 'May', revenue: 171000, claims: 38000 },
  { month: 'Jun', revenue: 168000, claims: 33000 },
  { month: 'Jul', revenue: 184320, claims: 41000 },
]
