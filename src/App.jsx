import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetails from './pages/CustomerDetails'
import Policies from './pages/Policies'
import PolicyDetails from './pages/PolicyDetails'
import PolicyTypes from './pages/PolicyTypes'
import Applications from './pages/Applications'
import Premiums from './pages/Premiums'
import Payments from './pages/Payments'
import Claims from './pages/Claims'
import ClaimDetails from './pages/ClaimDetails'
import ClaimProcessing from './pages/ClaimProcessing'
import Agents from './pages/Agents'
import AgentDetails from './pages/AgentDetails'
import Beneficiaries from './pages/Beneficiaries'
import Documents from './pages/Documents'
import Renewals from './pages/Renewals'
import InsuranceCompanies from './pages/InsuranceCompanies'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'

import AdminGuard from './components/auth/AdminGuard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Portal Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/policies/:id" element={<PolicyDetails />} />
            <Route path="/policy-types" element={<PolicyTypes />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/premiums" element={<Premiums />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/claims/:id" element={<ClaimDetails />} />
            <Route path="/claim-processing" element={<ClaimProcessing />} />
            <Route path="/agents" element={<AdminGuard><Agents /></AdminGuard>} />
            <Route path="/agents/:id" element={<AdminGuard><AgentDetails /></AdminGuard>} />
            <Route path="/beneficiaries" element={<Beneficiaries />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/insurance-companies" element={<AdminGuard><InsuranceCompanies /></AdminGuard>} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<AdminGuard><Settings /></AdminGuard>} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
