import { useState } from 'react'
import { Lock, Mail, Phone, MapPin, KeyRound } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { useAuth } from '../../context/AuthContext'
import { date, fullName, initials, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice } from '../../components/panel'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'

const LockedLabel = () => <span className="ag-lock"><Lock size={11} aria-hidden="true" /> Managed by admin</span>

function ContactForm({ profile, onSaved, savedMessage }) {
  // Re-mounted (via key) whenever the saved profile changes, so initial state is always current.
  const [form, setForm] = useState({ phone: profile.phone || '', city: profile.city || '', bio: profile.bio || '' })
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(savedMessage || '')
  const action = useAction()

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSaved('') }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (form.phone.trim().replace(/\D/g, '').length < 10) errs.phone = 'Enter a phone number with at least 10 digits.'
    if (!form.city.trim()) errs.city = 'City is required.'
    if (form.bio.length > 1000) errs.bio = 'Keep the bio under 1000 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    // Send only what changed
    const patch = {}
    for (const k of ['phone', 'city', 'bio']) if (form[k].trim() !== (profile[k] || '')) patch[k] = form[k].trim()
    if (!Object.keys(patch).length) { setSaved('Nothing to update.'); return }
    try {
      const res = await action.run(() => api.patch('/agent/profile', patch))
      onSaved(res.data.data, 'Contact details saved.')
    } catch {
      /* shown below */
    }
  }

  return (
    <form onSubmit={submit} noValidate className="form-grid">
      <Input id="ap-phone" label="Phone" type="tel" prefixIcon={Phone} value={form.phone} onChange={set('phone')} error={errors.phone} />
      <Input id="ap-city" label="City" prefixIcon={MapPin} value={form.city} onChange={set('city')} error={errors.city} />
      <div className="span-2">
        <label htmlFor="ap-bio" className="input-label">Short bio</label>
        <textarea id="ap-bio" className="input" maxLength={1000} value={form.bio} onChange={set('bio')} placeholder="How you help customers — shown to administrators." />
        <p className="field-help">{form.bio.length}/1000 characters</p>
        {errors.bio && <p className="input-error-msg" role="alert">{errors.bio}</p>}
      </div>
      {action.error && <div className="span-2"><Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice></div>}
      {saved && !action.error && <div className="span-2"><Notice tone="ok">{saved}</Notice></div>}
      <div className="span-2"><Button type="submit" loading={action.pending}>Save contact details</Button></div>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const action = useAction()
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setDone(false) }
  const rules = [
    { ok: form.newPassword.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(form.newPassword), label: 'a letter' },
    { ok: /\d/.test(form.newPassword), label: 'a number' },
  ]

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password.'
    if (!rules.every((r) => r.ok)) errs.newPassword = 'Password does not meet the requirements.'
    if (form.newPassword === form.currentPassword && form.newPassword) errs.newPassword = 'Choose a password different from the current one.'
    if (form.confirm !== form.newPassword) errs.confirm = 'Passwords do not match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      const res = await action.run(() => api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }))
      api.setToken(res.data.data.token) // keep this session; all other sessions are signed out by the server
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setDone(true)
    } catch {
      /* shown below */
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
      <Input id="pw-current" label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <div>
        <Input id="pw-new" label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} />
        <ul className="pw-rules" aria-label="Password requirements">
          {rules.map((r) => <li key={r.label} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '•'} {r.label}</li>)}
        </ul>
      </div>
      <Input id="pw-confirm" label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      {action.error && <Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice>}
      {done && <Notice tone="ok">Password changed. You stay signed in here; any other devices have been signed out.</Notice>}
      <div><Button type="submit" icon={KeyRound} loading={action.pending}>Change password</Button></div>
    </form>
  )
}

export default function AgentProfile() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi('/agent/profile')
  const [updated, setUpdated] = useState(null) // latest saved copy; takes precedence over the fetched one
  const [savedMessage, setSavedMessage] = useState('')
  const profile = updated || data

  return (
    <div className="px-page" style={{ maxWidth: 1000 }}>
      <PageHead title="Profile & settings" sub="Your advisor profile, contact details and sign-in security." />
      {!profile ? (
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      ) : (
        <>
          <div className="ag-profile-head">
            <span className="ag-avatar" aria-hidden="true">{initials(fullName(profile))}</span>
            <div style={{ minWidth: 0 }}>
              <h2 className="ag-profile-name">{fullName(profile)}</h2>
              <p className="ag-profile-meta">
                {profile.agentNumber} · {profile.specialization} · {profile.region}{profile.company ? ` · ${profile.company.name}` : ''}
              </p>
              <div style={{ marginTop: 6 }}><StatusBadge status={profile.status} /></div>
            </div>
            <dl className="ag-profile-stats">
              <div><dt>Customers</dt><dd>{profile._count.assignedCustomers}</dd></div>
              <div><dt>Policies</dt><dd>{profile._count.policies}</dd></div>
              <div><dt>Rating</dt><dd>{Number(profile.rating).toFixed(1)}</dd></div>
            </dl>
          </div>

          <div className="px-grid cols-2" style={{ alignItems: 'start' }}>
            <Panel title="Contact details" note="You can update how customers and staff reach you.">
              <ContactForm
                key={`${profile.phone}|${profile.city}|${profile.bio}`}
                profile={profile}
                savedMessage={savedMessage}
                onSaved={(p, msg) => { setUpdated(p); setSavedMessage(msg) }}
              />
            </Panel>

            <Panel title="Sign-in & security" note={`Signed in as ${user?.email || profile.email}`}>
              <PasswordForm />
            </Panel>
          </div>

          <div style={{ marginTop: 16 }}>
            <Panel title="Licensing & assignment" action={<LockedLabel />} note="These details are maintained by an InsureX administrator. Contact them if anything is incorrect.">
              <Facts items={[
                ['Agent number', <span key="n" className="mono">{profile.agentNumber}</span>],
                ['Email', <span key="e"><Mail size={12} aria-hidden="true" style={{ verticalAlign: -1 }} /> {profile.email}</span>],
                ['Licence number', <span key="l" className="mono">{profile.licenseNumber}</span>],
                ['Specialization', profile.specialization],
                ['Region', profile.region],
                ['Insurer', profile.company?.name || '—'],
                ['Status', titleCase(profile.status)],
                ['Joined', date(profile.joiningDate)],
                ['Commission rate', `${Number(profile.commissionRate)}%`],
              ]} />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
