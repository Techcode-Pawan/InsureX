import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LayoutDashboard, Briefcase, UserRound, ShieldCheck } from 'lucide-react'
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

export const LOGIN_ROLES = [
  { value: 'ADMIN', label: 'Admin', hint: 'Operations console', icon: ShieldCheck },
  { value: 'AGENT', label: 'Agent / Staff', hint: 'Advisor workspace', icon: Briefcase },
  { value: 'CUSTOMER', label: 'Customer', hint: 'My insurance', icon: UserRound },
]
const ROLE_KEY = 'insurex_login_role'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initialRole(params) {
  const fromUrl = String(params.get('role') || '').toUpperCase()
  if (LOGIN_ROLES.some((r) => r.value === fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(ROLE_KEY)
    if (LOGIN_ROLES.some((r) => r.value === saved)) return saved
  } catch { /* storage unavailable */ }
  return 'CUSTOMER'
}

export default function Login() {
  const { login, user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState(() => initialRole(params))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pending, setPending] = useState(false)
  const notice = params.get('notice')
  const roleParam = String(params.get('role') || '').toUpperCase()

  // Links such as /login?role=AGENT (e.g. after activating an account) select that portal.
  useEffect(() => {
    if (LOGIN_ROLES.some((r) => r.value === roleParam)) setRole(roleParam)
  }, [roleParam])

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={homeFor(user)} replace />
  }

  function chooseRole(value) {
    setRole(value)
    setError('')
    try { localStorage.setItem(ROLE_KEY, value) } catch { /* ignore */ }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const fe = {}
    if (!EMAIL_RE.test(email.trim())) fe.email = 'Enter a valid email address.'
    if (!password) fe.password = 'Enter your password.'
    setFieldErrors(fe)
    if (Object.keys(fe).length) return
    setPending(true)
    try {
      // The selected role is only checked by the server against the account's stored role.
      const { user: signedIn } = await login({ email: email.trim(), password, role })
      try { localStorage.setItem(ROLE_KEY, role) } catch { /* ignore */ }
      navigate(safeNext(params.get('next'), signedIn) || homeFor(signedIn), { replace: true })
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
      setPassword('')
    } finally {
      setPending(false)
    }
  }

  const active = LOGIN_ROLES.find((r) => r.value === role)

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand sub="Insurance Platform" to="/" /></div>
          <h1>Sign in</h1>
          <p className="lead">Choose how you use InsureX, then enter your account details.</p>

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <fieldset className="role-pick">
              <legend>Sign in as</legend>
              <div className="role-options">
                {LOGIN_ROLES.map(({ value, label, hint, icon: Icon }) => (
                  <div className="role-option" key={value}>
                    <input type="radio" id={`role-${value}`} name="login-role" value={value} checked={role === value} onChange={() => chooseRole(value)} />
                    <label htmlFor={`role-${value}`}>
                      <span className="role-ico"><Icon size={15} aria-hidden="true" /></span>
                      <strong>{label}</strong>
                      <span className="hint">{hint}</span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>

            {notice === 'password-set' && !error && <Notice tone="ok">Your password is set. Sign in to continue.</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            <Input
              id="login-email"
              label="Email address"
              type="email"
              autoComplete="email"
              prefixIcon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
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
                error={fieldErrors.password}
                required
              />
              <div className="auth-row">
                <button
                  type="button"
                  className="panel-link"
                  style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                  onClick={() => setShow((v) => !v)}
                  aria-controls="login-password"
                  aria-pressed={show}
                >
                  {show ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {show ? 'Hide password' : 'Show password'}
                </button>
                <Link to={`/forgot-password?role=${role}`} className="panel-link">Forgot password?</Link>
              </div>
            </div>
            <Button type="submit" loading={pending}>Sign in as {active.label}</Button>
          </form>

          {role === 'CUSTOMER' ? (
            <p className="auth-alt">New to InsureX? <Link to="/signup">Create a customer account</Link></p>
          ) : (
            <p className="auth-alt" style={{ fontSize: 12.5 }}>
              {role === 'AGENT'
                ? 'Agent and staff accounts are created by an InsureX administrator, who sends you a one-time link to set your password.'
                : 'Administrator accounts are provisioned by your system owner. There is no public admin sign-up.'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
