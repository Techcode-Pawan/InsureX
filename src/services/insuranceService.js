// ============================================================
// InsureX Frontend Service Layer
// Bridges UI modules to Backend REST APIs with explicit fallback
// ============================================================

import api from './apiClient'

// Import existing mock data as fallbacks
import { initialCustomers } from '../data/customerData'
import { initialPolicies, initialPolicyTypes } from '../data/policyData'
import { initialApplications, initialPayments, initialPremiums } from '../data/applicationData'
import { initialClaims, initialProcessing } from '../data/claimData'
import { initialAgents } from '../data/agentData'
import { initialBeneficiaries } from '../data/beneficiaryData'
import { initialDocuments } from '../data/documentData'
import { initialRenewals } from '../data/renewalData'
import { initialCompanies } from '../data/companyData'
import { policyDistributionData, premiumMonthlyTrend, claimStatusDistribution } from '../data/reportData'

export const insuranceService = {
  // ── Customers ───────────────────────────────────────────────
  async getCustomers(params = {}) {
    return api.get('/customers', params, { data: initialCustomers, total: initialCustomers.length })
  },
  async getCustomerById(id) {
    const mock = initialCustomers.find(c => c.customerId === id || c.id === id) || null
    return api.get(`/customers/${id}`, {}, mock)
  },
  async createCustomer(data) {
    return api.post('/customers', data, data)
  },
  async updateCustomer(id, data) {
    return api.put(`/customers/${id}`, data, data)
  },
  async deleteCustomer(id) {
    return api.delete(`/customers/${id}`, { success: true })
  },

  // ── Policy Types ────────────────────────────────────────────
  async getPolicyTypes(params = {}) {
    return api.get('/policy-types', params, { data: initialPolicyTypes })
  },
  async getPolicyTypeById(id) {
    const mock = initialPolicyTypes.find(t => t.typeId === id || t.id === id) || null
    return api.get(`/policy-types/${id}`, {}, mock)
  },

  // ── Policies ────────────────────────────────────────────────
  async getPolicies(params = {}) {
    return api.get('/policies', params, { data: initialPolicies, total: initialPolicies.length })
  },
  async getPolicyById(id) {
    const mock = initialPolicies.find(p => p.policyId === id || p.id === id) || null
    return api.get(`/policies/${id}`, {}, mock)
  },
  async createPolicy(data) {
    return api.post('/policies', data, data)
  },
  async updatePolicy(id, data) {
    return api.put(`/policies/${id}`, data, data)
  },

  // ── Applications ────────────────────────────────────────────
  async getApplications(params = {}) {
    return api.get('/applications', params, { data: initialApplications, total: initialApplications.length })
  },
  async approveApplication(id, data = {}) {
    return api.post(`/applications/${id}/approve`, data, { success: true })
  },
  async rejectApplication(id, data = {}) {
    return api.post(`/applications/${id}/reject`, data, { success: true })
  },

  // ── Premiums & Payments ─────────────────────────────────────
  async getPremiums(params = {}) {
    return api.get('/premiums', params, { data: initialPremiums, total: initialPremiums.length })
  },
  async getPayments(params = {}) {
    return api.get('/payments', params, { data: initialPayments, total: initialPayments.length })
  },
  async createPayment(data) {
    return api.post('/payments', data, data)
  },

  // ── Claims & Processing ─────────────────────────────────────
  async getClaims(params = {}) {
    return api.get('/claims', params, { data: initialClaims, total: initialClaims.length })
  },
  async getClaimById(id) {
    const mock = initialClaims.find(c => c.claimId === id || c.id === id) || null
    return api.get(`/claims/${id}`, {}, mock)
  },
  async createClaim(data) {
    return api.post('/claims', data, data)
  },
  async assignClaim(id, agentId) {
    return api.post(`/claims/${id}/assign`, { agentId }, { success: true })
  },
  async approveClaim(id, data) {
    return api.post(`/claims/${id}/approve`, data, { success: true })
  },
  async rejectClaim(id, data) {
    return api.post(`/claims/${id}/reject`, data, { success: true })
  },
  async settleClaim(id, data) {
    return api.post(`/claims/${id}/settle`, data, { success: true })
  },
  async getProcessingQueue(params = {}) {
    return api.get('/claim-processing', params, { data: initialProcessing, total: initialProcessing.length })
  },

  // ── Agents ──────────────────────────────────────────────────
  async getAgents(params = {}) {
    return api.get('/agents', params, { data: initialAgents })
  },
  async getAgentById(id) {
    const mock = initialAgents.find(a => a.agentId === id || a.id === id) || null
    return api.get(`/agents/${id}`, {}, mock)
  },
  async createAgent(data) {
    return api.post('/agents', data, data)
  },

  // ── Beneficiaries ───────────────────────────────────────────
  async getBeneficiaries(params = {}) {
    return api.get('/beneficiaries', params, { data: initialBeneficiaries })
  },
  async createBeneficiary(data) {
    return api.post('/beneficiaries', data, data)
  },

  // ── Documents ───────────────────────────────────────────────
  async getDocuments(params = {}) {
    return api.get('/documents', params, { data: initialDocuments })
  },
  async createDocument(data) {
    return api.post('/documents', data, data)
  },

  // ── Renewals ────────────────────────────────────────────────
  async getRenewals(params = {}) {
    return api.get('/renewals', params, { data: initialRenewals })
  },
  async createRenewal(data) {
    return api.post('/renewals', data, data)
  },

  // ── Insurance Companies ─────────────────────────────────────
  async getCompanies(params = {}) {
    return api.get('/insurance-companies', params, { data: initialCompanies })
  },
  async createCompany(data) {
    return api.post('/insurance-companies', data, data)
  },

  // ── Dashboard & Reports ─────────────────────────────────────
  async getDashboardSummary() {
    return api.get('/dashboard/summary', {}, {
      totalCustomers: initialCustomers.length,
      activePolicies: initialPolicies.filter(p => p.status === 'active').length,
      pendingApplications: initialApplications.filter(a => a.status === 'pending').length,
      pendingClaims: initialClaims.filter(c => c.status === 'pending').length,
    })
  },
}

export default insuranceService
