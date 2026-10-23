import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { KeyRound, LogOut, RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Panel, Facts, Notice, ConfirmDialog } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import { useAuth } from '../context/AuthContext'
import api from '../services/apiClient'
import { dateTime } from '../lib/format'

function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const action = useAction()
  const set = (k) => (e) => { setDone(false); setForm((f) => ({ ...f, [k]: e.target.value })) }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password.'
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      errs.newPassword = 'Use at least 8 characters with a letter and a number.'
    } else if (form.newPassword === form.currentPassword) errs.newPassword = 'Choose a password you are not currently using.'
    if (form.confirm !== form.newPassword) errs.confirm = 'Passwords do not match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const res = await action.run(() => api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }))
    // The server revokes older tokens; keep this session alive with the token it issued.
    api.setToken(res.data.data.token)
    setForm({ currentPassword: '', newPassword: '', confirm: '' })
    setDone(true)
  }

  return (
    <Panel title="Change password" note="Changing your password signs out every other session.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14, maxWidth: 420 }} noValidate>
        {done && <Notice tone="ok">Password updated. Other sessions have been signed out.</Notice>}
        {action.error && <Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice>}
        <Input id="cp-current" label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
        <Input id="cp-new" label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword}
          hint="At least 8 characters with a letter and a number." />
        <Input id="cp-confirm" label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <div><Button type="submit" icon={KeyRound} loading={action.pending}>Update password</Button></div>
      </form>
    </Panel>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const health = useApi('/health')
  const [confirmOut, setConfirmOut] = useState(false)
  const [pending, setPending] = useState(false)

  // logout() calls POST /api/auth/logout, which revokes every token issued to this login.
  async function signOutEverywhere() {
    setPending(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const h = health.body
  return (
    <div>
      <PageHeader title="Settings" subtitle="Your administrator account and platform status." />
      <div className="px-grid main-side">
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel title="Your account">
            <Facts items={[
              ['Name', user?.name],
              ['Email', user?.email],
              ['Role', 'Administrator'],
              ['Last sign-in', user?.lastLoginAt ? dateTime(user.lastLoginAt) : '—'],
              ['Account created', user?.createdAt ? dateTime(user.createdAt) : '—'],
            ]} />
          </Panel>
          <ChangePassword />
          <Panel title="Sessions" note="Sign-ins expire automatically. Use this if you signed in on a shared or lost device.">
            <Button variant="secondary" icon={LogOut} onClick={() => setConfirmOut(true)}>Sign out of all sessions</Button>
          </Panel>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel title="Platform status" action={<Button size="sm" variant="ghost" icon={RotateCw} onClick={health.reload} loading={health.loading}>Check</Button>}>
            {health.error ? (
              <Notice tone="error">The API could not be reached: {health.error.message}</Notice>
            ) : (
              <Facts items={[
                ['API', h ? (h.status === 'online' ? 'Online' : h.status) : 'Checking…'],
                ['Database', h ? (h.database === 'connected' ? 'Connected' : 'Unreachable') : 'Checking…'],
                ['API version', h?.version],
                ['Checked at', h ? dateTime(h.timestamp) : '—'],
              ]} />
            )}
          </Panel>
          <Panel title="Customer payments">
            <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13.5 }}>
              No online payment gateway is connected unless the server is configured with <span className="mono">PAYMENT_GATEWAY_PROVIDER</span>.
              Until then, customers pay through their own bank or UPI app and submit the transaction reference, and each payment
              must be confirmed by staff in the <Link to="/admin/verifications" className="table-link">verification queue</Link> before it reduces a premium balance.
            </p>
          </Panel>
          <Panel title="Access control">
            <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13.5 }}>
              Staff logins, account deactivation and customer record linking are managed in <Link to="/admin/access" className="table-link">Users &amp; access</Link>.
              New administrators can only be created from the server command line.
            </p>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOut}
        title="Sign out of all sessions?"
        confirmLabel="Sign out everywhere"
        danger
        pending={pending}
        onClose={() => setConfirmOut(false)}
        onConfirm={signOutEverywhere}
      >
        Every browser and device signed in with your account, including this one, will be signed out.
      </ConfirmDialog>
    </div>
  )
}
