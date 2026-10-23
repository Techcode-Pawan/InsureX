import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserRound, Phone } from 'lucide-react'
import { useAuth, homeFor } from '../context/AuthContext'
import { Brand, Notice } from '../components/panel'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { AuthAside } from './Login'

// Customer self-registration. Agent and admin logins are only created by administrators.
export default function Signup() {
  const { register, user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [pending, setPending] = useState(false)

  if (!isLoading && isAuthenticated && user) return <Navigate to={homeFor(user)} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const rules = [
    { ok: form.password.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(form.password), label: 'a letter' },
    { ok: /\d/.test(form.password), label: 'a number' },
  ]

  function validate() {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit phone number or leave it blank.'
    if (!rules.every((r) => r.ok)) e.password = 'Password does not meet the requirements.'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setPending(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, password: form.password })
      navigate('/user/onboarding', { replace: true })
    } catch (err) {
      setServerError(err.errors?.[0]?.message || err.message)
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
          <h1>Create your account</h1>
          <p className="lead">For policyholders. You'll add your personal details on the next step.</p>
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            {serverError && <Notice tone="error">{serverError}</Notice>}
            <Input id="su-name" label="Full name" autoComplete="name" prefixIcon={UserRound} value={form.name} onChange={set('name')} error={errors.name} required />
            <Input id="su-email" label="Email address" type="email" autoComplete="email" prefixIcon={Mail} value={form.email} onChange={set('email')} error={errors.email} required />
            <Input id="su-phone" label="Mobile number (optional)" type="tel" autoComplete="tel" prefixIcon={Phone} value={form.phone} onChange={set('phone')} error={errors.phone} />
            <div>
              <Input id="su-password" label="Password" type="password" autoComplete="new-password" prefixIcon={Lock} value={form.password} onChange={set('password')} error={errors.password} required />
              <ul className="pw-rules" aria-label="Password requirements">
                {rules.map((r) => <li key={r.label} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '•'} {r.label}</li>)}
              </ul>
            </div>
            <Input id="su-confirm" label="Confirm password" type="password" autoComplete="new-password" prefixIcon={Lock} value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
            <Button type="submit" loading={pending}>Create account</Button>
          </form>
          <p className="auth-alt">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </main>
    </div>
  )
}
