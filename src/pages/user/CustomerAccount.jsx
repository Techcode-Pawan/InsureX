import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderOpen, RefreshCcw, Heart, Bell, Archive, LogOut, ChevronRight, Phone, Mail, Building2 } from 'lucide-react'
import api from '../../services/apiClient'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../lib/useApi'
import { date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, Notice, DataState } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import '../../styles/user.css'

const CONTACT_FIELDS = ['phone', 'address', 'city', 'state', 'postalCode']

function ContactForm({ profile, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(CONTACT_FIELDS.map((k) => [k, profile[k] || ''])))
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [pending, setPending] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (form.phone.replace(/\D/g, '').length < 10) v.phone = 'Enter a phone number with at least 10 digits.'
    if (!form.address.trim()) v.address = 'Enter your address.'
    if (!form.city.trim()) v.city = 'Enter your city.'
    if (!form.state.trim()) v.state = 'Enter your state.'
    if (form.postalCode.trim().length < 4) v.postalCode = 'Enter a valid postal code.'
    setErrors(v)
    if (Object.keys(v).length) return
    const changed = Object.fromEntries(CONTACT_FIELDS.filter((k) => form[k].trim() !== (profile[k] || '')).map((k) => [k, form[k].trim()]))
    if (!Object.keys(changed).length) { setMsg({ tone: 'info', text: 'No changes to save.' }); return }
    setPending(true)
    setMsg(null)
    try {
      await api.patch('/me/profile', changed)
      setMsg({ tone: 'ok', text: 'Contact details updated.' })
      onSaved()
    } catch (err) {
      setMsg({ tone: 'error', text: err.message })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Input label="Mobile number" id="acc-phone" type="tel" value={form.phone || ''} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
        <Input className="span-2" label="Street address" id="acc-addr" value={form.address || ''} onChange={set('address')} error={errors.address} autoComplete="street-address" />
        <Input label="City" id="acc-city" value={form.city || ''} onChange={set('city')} error={errors.city} />
        <Input label="State" id="acc-state" value={form.state || ''} onChange={set('state')} error={errors.state} />
        <Input label="Postal code" id="acc-pin" value={form.postalCode || ''} onChange={set('postalCode')} error={errors.postalCode} inputMode="numeric" />
      </div>
      {msg && <div style={{ marginTop: 12 }}><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <Button type="submit" loading={pending}>Save contact details</Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [pending, setPending] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (!form.currentPassword) v.currentPassword = 'Enter your current password.'
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      v.newPassword = 'Use at least 8 characters with a letter and a number.'
    }
    if (form.confirm !== form.newPassword) v.confirm = 'Passwords do not match.'
    setErrors(v)
    if (Object.keys(v).length) return
    setPending(true)
    setMsg(null)
    try {
      const res = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      // The server revokes older sessions; keep this one going with the fresh token.
      api.setToken(res.data.data.token)
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setMsg({ tone: 'ok', text: 'Password updated. You have been signed out on other devices.' })
    } catch (err) {
      setMsg({ tone: 'error', text: err.message })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Input className="span-2" label="Current password" id="pw-current" type="password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} autoComplete="current-password" />
        <Input label="New password" id="pw-new" type="password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} autoComplete="new-password" hint="At least 8 characters, with a letter and a number." />
        <Input label="Confirm new password" id="pw-confirm" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
      </div>
      {msg && <div style={{ marginTop: 12 }}><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <Button type="submit" variant="secondary" loading={pending}>Change password</Button>
      </div>
    </form>
  )
}

const LINKS = [
  { to: '/user/applications', label: 'My applications', icon: FolderOpen },
  { to: '/user/renewals', label: 'Renewals', icon: RefreshCcw },
  { to: '/user/beneficiaries', label: 'Beneficiaries', icon: Heart },
  { to: '/user/companies', label: 'Insurers', icon: Building2 },
  { to: '/user/documents', label: 'Documents', icon: Archive },
  { to: '/user/notifications', label: 'Notifications', icon: Bell },
]

export default function CustomerAccount() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: profile, loading, error, reload } = useApi('/me/profile')

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const agent = profile?.assignedAgent

  return (
    <div className="px-page" style={{ maxWidth: 920 }}>
      <PageHead title="Account" sub={user?.email} actions={<Button variant="secondary" icon={LogOut} onClick={signOut}>Sign out</Button>} />
      <div className="px-grid main-side">
        <div className="cp-stack">
          <DataState loading={loading} error={error} onRetry={reload}>
            {profile && (
              <>
                <Panel title="Your details" note="Identity details can only be changed by InsureX support after verification.">
                  <Facts items={[
                    ['Name', fullName(profile)],
                    ['Customer number', profile.customerNumber],
                    ['Date of birth', date(profile.dateOfBirth)],
                    ['Gender', profile.gender],
                    ['Email', profile.email],
                    ['ID on file', `${profile.idProofType} · ${profile.maskedIdProofNumber}`],
                    ['Account status', titleCase(profile.status)],
                    ['Customer since', date(profile.registrationDate)],
                  ]} />
                </Panel>
                <Panel title="Contact details">
                  <ContactForm profile={profile} onSaved={reload} />
                </Panel>
              </>
            )}
          </DataState>
          <Panel title="Password">
            <PasswordForm />
          </Panel>
        </div>

        <div className="cp-stack">
          <Panel title="Your agent">
            {loading ? null : agent ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{fullName(agent)}</div>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{agent.agentNumber}</div>
                {agent.phone && <a href={`tel:${agent.phone}`} className="panel-link" style={{ display: 'flex', marginBottom: 6 }}><Phone size={14} aria-hidden="true" /> {agent.phone}</a>}
                {agent.email && <a href={`mailto:${agent.email}`} className="panel-link" style={{ display: 'flex' }}><Mail size={14} aria-hidden="true" /> {agent.email}</a>}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>No agent is assigned to your account yet. InsureX support can help with any questions.</p>
            )}
          </Panel>
          <Panel flush title="More">
            <ul className="rows">
              {LINKS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="row" style={{ minHeight: 52 }}>
                    <Icon size={18} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
                    <span className="row-main row-title">{label}</span>
                    <ChevronRight size={16} aria-hidden="true" className="muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
