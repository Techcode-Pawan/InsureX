// ============================================================
// InsureX API Service Layer
// During frontend development, this returns mock data.
// Replace mock imports with real fetch/axios calls for backend.
// ============================================================

import * as mock from '../data/mockData'

const SIMULATED_DELAY = 400 // ms – simulates network latency

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

async function mockResponse(data) {
  await delay(SIMULATED_DELAY)
  return { data, error: null }
}

// ---- Customers ----
export const customersApi = {
  getAll: () => mockResponse(mock.customers),
  getById: (id) => mockResponse(mock.customers.find((c) => c.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `C${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Policies ----
export const policiesApi = {
  getAll: () => mockResponse(mock.policies),
  getById: (id) => mockResponse(mock.policies.find((p) => p.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `P${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Policy Types ----
export const policyTypesApi = {
  getAll: () => mockResponse(mock.policyTypes),
  getById: (id) => mockResponse(mock.policyTypes.find((pt) => pt.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `PT${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Claims ----
export const claimsApi = {
  getAll: () => mockResponse(mock.claims),
  getById: (id) => mockResponse(mock.claims.find((c) => c.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `CL${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Agents ----
export const agentsApi = {
  getAll: () => mockResponse(mock.agents),
  getById: (id) => mockResponse(mock.agents.find((a) => a.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `A${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Payments ----
export const paymentsApi = {
  getAll: () => mockResponse(mock.payments),
  getById: (id) => mockResponse(mock.payments.find((p) => p.id === id) || null),
}

// ---- Insurance Companies ----
export const companiesApi = {
  getAll: () => mockResponse(mock.insuranceCompanies),
  getById: (id) => mockResponse(mock.insuranceCompanies.find((c) => c.id === id) || null),
  create: (payload) => mockResponse({ ...payload, id: `IC${Date.now()}` }),
  update: (id, payload) => mockResponse({ ...payload, id }),
  delete: (id) => mockResponse({ id }),
}

// ---- Renewals ----
export const renewalsApi = {
  getAll: () => mockResponse(mock.renewals),
  getById: (id) => mockResponse(mock.renewals.find((r) => r.id === id) || null),
}

// ---- Dashboard ----
export const dashboardApi = {
  getStats: () => mockResponse(mock.dashboardStats),
  getMonthlyRevenue: () => mockResponse(mock.monthlyRevenue),
}

// ---- Applications (placeholder data) ----
export const applicationsApi = {
  getAll: () => mockResponse([]),
  create: (payload) => mockResponse({ ...payload, id: `APP${Date.now()}` }),
}

// ---- Premiums (placeholder data) ----
export const premiumsApi = {
  getAll: () => mockResponse([]),
}

// ---- Beneficiaries (placeholder data) ----
export const beneficiariesApi = {
  getAll: () => mockResponse([]),
  create: (payload) => mockResponse({ ...payload, id: `B${Date.now()}` }),
}

// ---- Documents (placeholder data) ----
export const documentsApi = {
  getAll: () => mockResponse([]),
}

// ---- Reports ----
export const reportsApi = {
  getSummary: () => mockResponse(mock.dashboardStats),
  getChartData: () => mockResponse(mock.monthlyRevenue),
}
