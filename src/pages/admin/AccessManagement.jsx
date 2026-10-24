import { useState } from 'react'
import { UserPlus, Search } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Panel, DataState, Pager, Notice, ConfirmDialog, Segmented } from '../../components/panel'
import { useApi, useAction } from '../../lib/useApi'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/apiClient'
import { dateTime, fullName } from '../../lib/format'
import { AccessLinkModal } from '../Agents'

const ROLE_VARIANT = { ADMIN: 'purple', AGENT: 'blue', CUSTOMER: 'gray' }

function CreateLoginModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ role: 'AGENT', name: '', email: '', password: '', agentId: '' })
  const agents = useApi(open ? '/agents' : null, { limit: 100 })
  const action = useAction()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const unlinkedAgents = (agents.data || []).filter((a) => !a.userId)

  async function submit(e) {
    e.preventDefault()
    const payload = { role: form.role, name: form.name.trim(), email: form.email.trim(), password: form.password, ...(form.role === 'AGENT' && { agentId: form.agentId }) }
    await action.run(() => api.post('/admin/users', payload))
    onCreated(`Login created for ${payload.email}. Share the temporary password through a secure channel and ask them to change it.`)
    setForm({ role: 'AGENT', name: '', email: '', password: '', agentId: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Create staff login" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="create-login" loading={action.pending}>Create login</Button>
      </>
    }>
      <form id="create-login" onSubmit={submit} className="form-grid">
        <div className="span-2">
          <Notice>Customers create their own accounts. Agent logins must be linked to an existing agent profile; this login will only ever see that agent's assigned customers.</Notice>
        </div>
        <Select id="cl-role" label="Role" value={form.role} onChange={set('role')} options={[{ value: 'AGENT', label: 'Agent' }, { value: 'ADMIN', label: 'Administrator' }]} />
        {form.role === 'AGENT' ? (
          <Select id="cl-agent" label="Agent profile" value={form.agentId} onChange={set('agentId')} placeholder={agents.loading ? 'Loading…' : unlinkedAgents.length ? 'Select profile' : 'No unlinked profiles'} required
            options={unlinkedAgents.map((a) => ({ value: a.id, label: `${fullName(a)} (${a.agentNumber})` }))} />
        ) : <div />}
        <Input id="cl-name" label="Full name" value={form.name} onChange={set('name')} required />
        <Input id="cl-email" label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Input id="cl-pass" className="span-2" label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')}
          hint="At least 8 characters with a letter and a number." required />
        {form.role === 'ADMIN' && <div className="span-2"><Notice tone="warn">Administrators can see and change every record in the system. Grant this only to staff who need it.</Notice></div>}
        {action.error && <div className="span-2"><Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice></div>}
      </form>
    </Modal>
  )
}

function LinkCustomerModal({ user, onClose, onDone }) {
  const [search, setSearch] = useState('')
  const results = useApi(user && search.trim().length >= 2 ? '/customers' : null, { search: search.trim(), limit: 8 })
  const [choice, setChoice] = useState(null)
  const action = useAction()

  async function link() {
    await action.run(() => api.patch(`/admin/users/${user.id}`, { linkCustomerId: choice.id }))
    onDone(`${user.email} is now linked to customer ${choice.customerNumber}.`)
  }

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Link login to customer record" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!choice} loading={action.pending} onClick={link}>Link account</Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 12 }}>
        <Notice tone="warn">Only link after verifying the person's identity (e.g. ID document and registered phone). Linking gives this login full access to the customer's policies, payments and claims.</Notice>
        <Input id="lc-search" label="Find customer" prefixIcon={Search} placeholder="Name, customer number or email" value={search} onChange={(e) => { setSearch(e.target.value); setChoice(null) }} />
        <ul className="rows" style={{ border: '1px solid var(--color-border)', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
          {(results.data || []).map((c) => (
            <li key={c.id}>
              <button type="button" className="row" aria-pressed={choice?.id === c.id} onClick={() => setChoice(c)} disabled={Boolean(c.userId)}
                style={choice?.id === c.id ? { background: '#EAF4FF' } : undefined}>
                <div className="row-main">
                  <div className="row-title">{fullName(c)}</div>
                  <div className="row-meta">{c.customerNumber} · {c.email}</div>
                </div>
                {c.userId && <span className="muted" style={{ fontSize: 12 }}>Already linked</span>}
              </button>
            </li>
          ))}
          {results.data?.length === 0 && <li className="row muted">No matching customers.</li>}
        </ul>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [pw, setPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const action = useAction()
  const valid = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw) && pw === confirmPw

  async function submit(e) {
    e.preventDefault()
    if (!valid) return
    await action.run(() => api.post(`/admin/users/${user.id}/reset-password`, { temporaryPassword: pw }))
    setPw('')
    setConfirmPw('')
    onDone(`Temporary password set for ${user.email}. They were signed out everywhere; share the password through a secure channel and ask them to change it after signing in.`)
  }

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Reset password" size="sm" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="reset-pw" disabled={!valid} loading={action.pending}>Set temporary password</Button>
      </>
    }>
      <form id="reset-pw" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <Notice tone="warn">Verify the person's identity before resetting. This signs <strong>{user?.email}</strong> out of every device.</Notice>
        <Input id="rp-new" label="Temporary password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)}
          hint="At least 8 characters with a letter and a number." required />
        <Input id="rp-confirm" label="Confirm password" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
          error={confirmPw && confirmPw !== pw ? 'Passwords do not match.' : undefined} required />
        {action.error && <Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice>}
      </form>
    </Modal>
  )
}

export default function AccessManagement() {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/admin/users', { role, search: search.trim() || undefined, page, limit: 15 })
  const [creating, setCreating] = useState(false)
  const [linking, setLinking] = useState(null)
  const [resetting, setResetting] = useState(null)
  const [resetLink, setResetLink] = useState(null)
  const [confirm, setConfirm] = useState(null) // { user, kind: 'deactivate'|'activate'|'revoke'|'unlink' }
  const [message, setMessage] = useState('')
  const action = useAction()

  // One-time link the user opens to choose their own password (preferred over a temporary password).
  async function issueResetLink(u) {
    try {
      const res = await action.run(() => api.post(`/admin/users/${u.id}/reset-link`))
      setResetLink({ ...res.data.data, name: u.name })
      reload()
    } catch (err) {
      setMessage('')
      action.setError(err)
    }
  }

  async function runConfirm() {
    const { user, kind } = confirm
    if (kind === 'revoke') await action.run(() => api.post(`/admin/users/${user.id}/revoke-sessions`))
    else if (kind === 'unlink') await action.run(() => api.patch(`/admin/users/${user.id}`, { linkCustomerId: null }))
    else await action.run(() => api.patch(`/admin/users/${user.id}`, { isActive: kind === 'activate' }))
    setMessage({ revoke: `All sessions for ${user.email} were signed out.`, unlink: `${user.email} was unlinked from its customer record.`, activate: `${user.email} can sign in again.`, deactivate: `${user.email} was deactivated and signed out.` }[kind])
    setConfirm(null)
    reload()
  }

  const confirmText = confirm && {
    deactivate: ['Deactivate this login?', 'They will be signed out immediately and cannot sign in until reactivated. Their records are kept.', 'Deactivate', true],
    activate: ['Reactivate this login?', 'They will be able to sign in again with their existing password.', 'Reactivate', false],
    revoke: ['Sign out all sessions?', 'Every device signed in with this login will be signed out. Use this if a password may be compromised.', 'Sign out everywhere', true],
    unlink: ['Unlink customer record?', 'This login will lose access to the customer\'s policies and records until linked again.', 'Unlink', true],
  }[confirm.kind]

  return (
    <div>
      <PageHeader
        title="Users & access"
        subtitle="Logins, roles and the customer/agent records each login may act for."
        actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Create staff login</Button>}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}
      {action.error && !confirm && <div style={{ marginBottom: 12 }}><Notice tone="error">{action.error.message}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="ua-search" prefixIcon={Search} placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} aria-label="Search users" />
          <Segmented label="Filter by role" value={role} onChange={(v) => { setRole(v); setPage(1) }}
            options={[{ value: '', label: 'All' }, { value: 'ADMIN', label: 'Admins' }, { value: 'AGENT', label: 'Agents' }, { value: 'CUSTOMER', label: 'Customers' }]} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No logins match.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th scope="col">Login</th><th scope="col">Role</th><th scope="col">Linked record</th><th scope="col">Last sign-in</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {data?.map((u) => (
                  <tr key={u.id}>
                    <td><div style={{ fontWeight: 600 }}>{u.name}</div><div className="muted" style={{ fontSize: 12 }}>{u.email}</div></td>
                    <td><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></td>
                    <td>
                      {u.customer && <>{fullName(u.customer)} <span className="mono">{u.customer.customerNumber}</span></>}
                      {u.agent && <>{fullName(u.agent)} <span className="mono">{u.agent.agentNumber}</span></>}
                      {!u.customer && !u.agent && u.role !== 'ADMIN' && <span style={{ color: 'var(--status-amber-text)', fontSize: 12.5 }}>Not linked</span>}
                      {u.role === 'ADMIN' && <span className="muted">—</span>}
                    </td>
                    <td className="nowrap">{u.lastLoginAt ? dateTime(u.lastLoginAt) : <span className="muted">Never</span>}</td>
                    <td>{!u.isActive ? <Badge variant="gray" dot>Deactivated</Badge>
                      : u.passwordSetupPurpose === 'INVITE' ? <Badge variant="yellow" dot>Pending activation</Badge>
                      : <Badge variant="green" dot>Active</Badge>}</td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      {u.role === 'CUSTOMER' && !u.customer && <Button size="sm" variant="secondary" onClick={() => setLinking(u)}>Link record</Button>}
                      {u.role === 'CUSTOMER' && u.customer && <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, kind: 'unlink' })}>Unlink</Button>}
                      {' '}
                      {u.id !== me?.id && u.isActive && <Button size="sm" variant="ghost" onClick={() => issueResetLink(u)}>Reset link</Button>}
                      {u.id !== me?.id && <Button size="sm" variant="ghost" onClick={() => setResetting(u)}>Temp password</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, kind: 'revoke' })}>Sign out</Button>
                      {u.id !== me?.id && (u.isActive
                        ? <Button size="sm" variant="ghost" style={{ color: '#B91C1C' }} onClick={() => setConfirm({ user: u, kind: 'deactivate' })}>Deactivate</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, kind: 'activate' })}>Reactivate</Button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <CreateLoginModal open={creating} onClose={() => setCreating(false)} onCreated={(msg) => { setCreating(false); setMessage(msg); reload() }} />
      <LinkCustomerModal user={linking} onClose={() => setLinking(null)} onDone={(msg) => { setLinking(null); setMessage(msg); reload() }} />
      <AccessLinkModal link={resetLink} agentName={resetLink?.name} onClose={() => setResetLink(null)} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onDone={(msg) => { setResetting(null); setMessage(msg) }} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmText?.[0]}
        confirmLabel={confirmText?.[2]}
        danger={confirmText?.[3]}
        pending={action.pending}
        error={action.error}
        onClose={() => { setConfirm(null); action.setError(null) }}
        onConfirm={runConfirm}
      >
        <p style={{ margin: 0 }}><strong>{confirm?.user.email}</strong></p>
        <p style={{ margin: '6px 0 0' }}>{confirmText?.[1]}</p>
      </ConfirmDialog>
    </div>
  )
}
