import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth, homeFor } from './context/AuthContext'
import RequireRole from './components/auth/RequireRole'

// Layouts: one per role, each with its own navigation
import AdminLayout from './layouts/AdminLayout'
import AgentLayout from './layouts/AgentLayout'
import CustomerLayout from './layouts/CustomerLayout'

// Public
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const SetupPassword = lazy(() => import('./pages/SetupPassword'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))

// ── Admin console (/admin) — existing operations pages ──
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AccessManagement = lazy(() => import('./pages/admin/AccessManagement'))
const Verifications = lazy(() => import('./pages/admin/Verifications'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'))
const Policies = lazy(() => import('./pages/Policies'))
const PolicyDetails = lazy(() => import('./pages/PolicyDetails'))
const PolicyTypes = lazy(() => import('./pages/PolicyTypes'))
const Applications = lazy(() => import('./pages/Applications'))
const Premiums = lazy(() => import('./pages/Premiums'))
const Payments = lazy(() => import('./pages/Payments'))
const Claims = lazy(() => import('./pages/Claims'))
const ClaimDetails = lazy(() => import('./pages/ClaimDetails'))
const ClaimProcessing = lazy(() => import('./pages/ClaimProcessing'))
const Agents = lazy(() => import('./pages/Agents'))
const AgentDetails = lazy(() => import('./pages/AgentDetails'))
const Beneficiaries = lazy(() => import('./pages/Beneficiaries'))
const Documents = lazy(() => import('./pages/Documents'))
const Renewals = lazy(() => import('./pages/Renewals'))
const InsuranceCompanies = lazy(() => import('./pages/InsuranceCompanies'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))

// ── Agent workspace (/agent) ──
const AgentWorkspace = lazy(() => import('./pages/agent/AgentWorkspace'))
const AgentCustomers = lazy(() => import('./pages/agent/AgentCustomers'))
const AgentCustomerDetail = lazy(() => import('./pages/agent/AgentCustomerDetail'))
const AgentCustomerNew = lazy(() => import('./pages/agent/AgentCustomerNew'))
const AgentApplications = lazy(() => import('./pages/agent/AgentApplications'))
const AgentApplicationNew = lazy(() => import('./pages/agent/AgentApplicationNew'))
const AgentApplicationDetail = lazy(() => import('./pages/agent/AgentApplicationDetail'))
const AgentPolicies = lazy(() => import('./pages/agent/AgentPolicies'))
const AgentPolicyDetail = lazy(() => import('./pages/agent/AgentPolicyDetail'))
const AgentPremiums = lazy(() => import('./pages/agent/AgentPremiums'))
const AgentClaims = lazy(() => import('./pages/agent/AgentClaims'))
const AgentClaimDetail = lazy(() => import('./pages/agent/AgentClaimDetail'))
const AgentRenewals = lazy(() => import('./pages/agent/AgentRenewals'))
const AgentDocuments = lazy(() => import('./pages/agent/AgentDocuments'))
const AgentPerformance = lazy(() => import('./pages/agent/AgentPerformance'))
const AgentActivity = lazy(() => import('./pages/agent/AgentActivity'))
const AgentProfile = lazy(() => import('./pages/agent/AgentProfile'))
const AgentTasks = lazy(() => import('./pages/agent/AgentTasks'))
const CustomerCompanies = lazy(() => import('./pages/user/CustomerCompanies'))

// ── Customer portal (/user) ──
const CustomerOnboarding = lazy(() => import('./pages/user/CustomerOnboarding'))
const CustomerHome = lazy(() => import('./pages/user/CustomerHome'))
const CustomerPlans = lazy(() => import('./pages/user/CustomerPlans'))
const CustomerApply = lazy(() => import('./pages/user/CustomerApply'))
const CustomerApplications = lazy(() => import('./pages/user/CustomerApplications'))
const CustomerApplicationDetail = lazy(() => import('./pages/user/CustomerApplicationDetail'))
const CustomerPolicies = lazy(() => import('./pages/user/CustomerPolicies'))
const CustomerPolicyDetail = lazy(() => import('./pages/user/CustomerPolicyDetail'))
const CustomerPayments = lazy(() => import('./pages/user/CustomerPayments'))
const CustomerReceipt = lazy(() => import('./pages/user/CustomerReceipt'))
const CustomerClaims = lazy(() => import('./pages/user/CustomerClaims'))
const CustomerClaimNew = lazy(() => import('./pages/user/CustomerClaimNew'))
const CustomerClaimDetail = lazy(() => import('./pages/user/CustomerClaimDetail'))
const CustomerDocuments = lazy(() => import('./pages/user/CustomerDocuments'))
const CustomerRenewals = lazy(() => import('./pages/user/CustomerRenewals'))
const CustomerBeneficiaries = lazy(() => import('./pages/user/CustomerBeneficiaries'))
const CustomerAccount = lazy(() => import('./pages/user/CustomerAccount'))

// Pages are code-split per route so each panel only downloads its own screens.
function PageLoading() {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-busy="true">
      <span className="spinner" aria-label="Loading" />
    </div>
  )
}

// Sends "/" to the signed-in user's own panel, or to sign-in.
function HomeRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return <Navigate to={isAuthenticated ? homeFor(user) : '/login'} replace />
}

// Old single-console URLs (e.g. /customers/123) now live under /admin.
function LegacyAdminRedirect() {
  const { pathname, search } = useLocation()
  const path = pathname === '/dashboard' ? '/admin' : `/admin${pathname}`
  return <Navigate to={path + search} replace />
}

// Conventional dashboard URLs map onto this app's panel roots. Role guards still apply after the redirect.
function CustomerPathRedirect() {
  const { pathname, search } = useLocation()
  const rest = pathname.replace(/^\/customer(\/dashboard)?/, '')
  return <Navigate to={`/user${rest}${search}`} replace />
}

const LEGACY_ADMIN_PATHS = [
  '/dashboard', '/customers/*', '/policies/*', '/policy-types', '/applications', '/premiums', '/payments',
  '/claims/*', '/claim-processing', '/agents/*', '/beneficiaries', '/documents', '/renewals',
  '/insurance-companies', '/reports', '/settings', '/customers', '/policies', '/claims', '/agents',
]

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup-password" element={<SetupPassword />} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/agent/dashboard" element={<Navigate to="/agent" replace />} />
          <Route path="/customer/dashboard" element={<Navigate to="/user" replace />} />
          <Route path="/customer/*" element={<CustomerPathRedirect />} />
          {LEGACY_ADMIN_PATHS.map((p) => <Route key={p} path={p} element={<LegacyAdminRedirect />} />)}

          {/* ADMIN */}
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetails />} />
              <Route path="policies" element={<Policies />} />
              <Route path="policies/:id" element={<PolicyDetails />} />
              <Route path="policy-types" element={<PolicyTypes />} />
              <Route path="applications" element={<Applications />} />
              <Route path="premiums" element={<Premiums />} />
              <Route path="payments" element={<Payments />} />
              <Route path="verifications" element={<Verifications />} />
              <Route path="claims" element={<Claims />} />
              <Route path="claims/:id" element={<ClaimDetails />} />
              <Route path="claim-processing" element={<ClaimProcessing />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/:id" element={<AgentDetails />} />
              <Route path="beneficiaries" element={<Beneficiaries />} />
              <Route path="documents" element={<Documents />} />
              <Route path="renewals" element={<Renewals />} />
              <Route path="insurance-companies" element={<InsuranceCompanies />} />
              <Route path="reports" element={<Reports />} />
              <Route path="access" element={<AccessManagement />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* AGENT */}
          <Route element={<RequireRole role="AGENT" />}>
            <Route path="/agent" element={<AgentLayout />}>
              <Route index element={<AgentWorkspace />} />
              <Route path="customers" element={<AgentCustomers />} />
              <Route path="customers/new" element={<AgentCustomerNew />} />
              <Route path="customers/:id" element={<AgentCustomerDetail />} />
              <Route path="applications" element={<AgentApplications />} />
              <Route path="applications/new" element={<AgentApplicationNew />} />
              <Route path="applications/:id" element={<AgentApplicationDetail />} />
              <Route path="policies" element={<AgentPolicies />} />
              <Route path="policies/:id" element={<AgentPolicyDetail />} />
              <Route path="premiums" element={<AgentPremiums />} />
              <Route path="claims" element={<AgentClaims />} />
              <Route path="claims/:id" element={<AgentClaimDetail />} />
              <Route path="renewals" element={<AgentRenewals />} />
              <Route path="documents" element={<AgentDocuments />} />
              <Route path="performance" element={<AgentPerformance />} />
              <Route path="activity" element={<AgentActivity />} />
              <Route path="profile" element={<AgentProfile />} />
              <Route path="tasks" element={<AgentTasks />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* CUSTOMER */}
          <Route element={<RequireRole role="CUSTOMER" allowIncompleteProfile />}>
            <Route path="/user/onboarding" element={<CustomerOnboarding />} />
          </Route>
          <Route element={<RequireRole role="CUSTOMER" />}>
            <Route path="/user" element={<CustomerLayout />}>
              <Route index element={<CustomerHome />} />
              <Route path="plans" element={<CustomerPlans />} />
              <Route path="companies" element={<CustomerCompanies />} />
              <Route path="apply/:policyTypeId" element={<CustomerApply />} />
              <Route path="applications" element={<CustomerApplications />} />
              <Route path="applications/:id" element={<CustomerApplicationDetail />} />
              <Route path="policies" element={<CustomerPolicies />} />
              <Route path="policies/:id" element={<CustomerPolicyDetail />} />
              <Route path="payments" element={<CustomerPayments />} />
              <Route path="payments/:id/receipt" element={<CustomerReceipt />} />
              <Route path="claims" element={<CustomerClaims />} />
              <Route path="claims/new" element={<CustomerClaimNew />} />
              <Route path="claims/:id" element={<CustomerClaimDetail />} />
              <Route path="documents" element={<CustomerDocuments />} />
              <Route path="renewals" element={<CustomerRenewals />} />
              <Route path="beneficiaries" element={<CustomerBeneficiaries />} />
              <Route path="account" element={<CustomerAccount />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
