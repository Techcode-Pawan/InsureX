import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LayoutDashboard, Briefcase, UserRound } from 'lucide-react'
import { useAuth, homeFor } from '../context/AuthContext'
import { Brand, Notice } from '../components/panel'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

// Only allow redirecting back to an in-app path that belongs to the user's own panel.
function safeNext(next, user) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  const home = homeFor(user)
  const prefix = { ADMIN: '/admin', AGENT: '/agent', CUSTOMER: '/user' }[user.role]
  return next.startsWith(prefix) && !home.endsWith('/onboarding') ? next : null
}

export function AuthAside() {
  return (
    <aside className="auth-aside">
      <div>
        <Brand sub="Insurance Platform" light to="/" />
        <div style={{ marginTop: 56 }}>
          <h2>One platform for policyholders, advisors and operations.</h2>
          <p>Sign in once. InsureX opens the workspace that matches your account, and only the records you are entitled to see.</p>
          <ul className="auth-roles">
            <li>
              <span className="ico"><UserRound size={15} aria-hidden="true" /></span>
              <div><strong>Policyholders</strong><span>Policies, premiums, claims and renewals in one place.</span></div>
            </li>
            <li>
              <span className="ico"><Briefcase size={15} aria-hidden="true" /></span>
              <div><strong>Insurance advisors</strong><span>Your assigned customers, applications and follow-ups.</span></div>
            </li>
            <li>
              <span className="ico"><LayoutDashboard size={15} aria-hidden="true" /></span>
              <div><strong>Operations</strong><span>Underwriting, payments, claims and reporting.</span></div>
            </li>
          </ul>
        </div>
      </div>
      <p className="auth-foot">Access is logged. Sessions expire automatically and end when you sign out.</p>
    </aside>
  )
}

export default function Login() {
  const { login, user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={homeFor(user)} replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setPending(true)
    try {
      const { user: signedIn } = await login({ email: email.trim(), password })
      navigate(safeNext(params.get('next'), signedIn) || homeFor(signedIn), { replace: true })
    } catch (err) {
      setError(err.isNetworkError ? err.message : err.message || 'Sign in failed.')
      setPassword('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand sub="Insurance Platform" to="/" /></div>
          <h1>Sign in</h1>
          <p className="lead">Use the email and password for your InsureX account.</p>

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            {error && <Notice tone="error">{error}</Notice>}
            <Input
              id="login-email"
              label="Email address"
              type="email"
              autoComplete="email"
              prefixIcon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <Input
                id="login-password"
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                prefixIcon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="panel-link"
                style={{ background: 'none', border: 0, cursor: 'pointer', marginTop: 6, padding: 0 }}
                onClick={() => setShow((v) => !v)}
                aria-controls="login-password"
              >
                {show ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {show ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <Button type="submit" loading={pending}>Sign in</Button>
          </form>

          <p className="auth-alt">
            New to InsureX? <Link to="/signup">Create a customer account</Link>
          </p>
          <p className="auth-alt" style={{ marginTop: 8, fontSize: 12.5 }}>
            Advisors and staff receive their login from an InsureX administrator. Forgot your password? Contact InsureX support or your agent; after verifying your identity, an administrator can issue a temporary password.
          </p>
        </div>
      </main>
    </div>
  )
}
