import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import api from '../services/apiClient'
import { Brand, Notice, LoadingRows } from '../components/panel'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { AuthAside, LOGIN_ROLES } from './Login'

// Landing page for one-time invitation / password reset links issued by an administrator.
// The token is sent to the API in a POST body (never in an API URL) and is single-use.
export default function SetupPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [loadError, setLoadError] = useState(token ? null : 'This link is incomplete. Ask your administrator for a new one.')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    api.post('/auth/password-setup/verify', { token })
      .then((res) => alive && setInfo(res.data.data))
      .catch((err) => alive && setLoadError(err.message))
    return () => { alive = false }
  }, [token])

  const rules = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(password), label: 'a letter' },
    { ok: /\d/.test(password), label: 'a number' },
  ]

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!rules.every((r) => r.ok)) return setError('Password does not meet the requirements.')
    if (password !== confirm) return setError('Passwords do not match.')
    setPending(true)
    try {
      const res = await api.post('/auth/password-setup', { token, password })
      navigate(`/login?role=${res.data.data.role}&notice=password-set`, { replace: true })
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message)
    } finally {
      setPending(false)
    }
  }

  const roleLabel = info && LOGIN_ROLES.find((r) => r.value === info.role)?.label
  const isInvite = info?.purpose === 'INVITE'

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand sub="Insurance Platform" to="/" /></div>
          <h1>{isInvite ? 'Activate your account' : 'Choose a new password'}</h1>
          {!info && !loadError && <LoadingRows rows={2} />}
          {loadError && (
            <>
              <Notice tone="error">{loadError}</Notice>
              <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
            </>
          )}
          {info && (
            <>
              <p className="lead">
                {isInvite ? 'Welcome' : 'Hello'} {info.name}. Set the password for <strong>{info.email}</strong> ({roleLabel} account).
              </p>
              <form className="auth-form" onSubmit={onSubmit} noValidate>
                {error && <Notice tone="error">{error}</Notice>}
                <div>
                  <Input id="sp-password" label="New password" type="password" autoComplete="new-password" prefixIcon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <ul className="pw-rules" aria-label="Password requirements">
                    {rules.map((r) => <li key={r.label} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '•'} {r.label}</li>)}
                  </ul>
                </div>
                <Input id="sp-confirm" label="Confirm password" type="password" autoComplete="new-password" prefixIcon={Lock} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  error={confirm && confirm !== password ? 'Passwords do not match.' : undefined} required />
                <Button type="submit" loading={pending}>{isInvite ? 'Activate account' : 'Save new password'}</Button>
              </form>
              <p className="auth-alt" style={{ fontSize: 12.5 }}>This link works once and expires {new Date(info.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
