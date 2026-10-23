import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from '../../context/AuthContext'

function FullPageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-busy="true">
      <span className="spinner" aria-label="Loading your workspace" />
    </div>
  )
}

/**
 * Route guard. UX only: the API enforces the same rules server-side on every request.
 * - signed out           → /login?next=<path>
 * - signed in, wrong role → that user's own home (never shows another role's panel)
 */
export default function RequireRole({ role, allowIncompleteProfile = false }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />
  if (role === 'CUSTOMER' && !user.profileComplete && !allowIncompleteProfile) {
    return <Navigate to="/user/onboarding" replace />
  }
  return <Outlet />
}
