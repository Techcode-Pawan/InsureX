import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Search, Copy, Check, Eye, Pencil, Power, Link2 } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge, { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, DataState, Segmented, Notice, ConfirmDialog } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { date, dateTime, fullName } from '../lib/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AGENT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'INACTIVE', label: 'Inactive' },
]
const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', city: '', region: '', licenseNumber: '', specialization: '',
  department: '', branch: '', address: '', companyId: '', status: 'ACTIVE', commissionRate: '8', bio: '',
  credentialMode: 'INVITE', temporaryPassword: '',
}

const LOGIN_BADGE = {
  ACTIVE: ['green', 'Can sign in'],
  PENDING_ACTIVATION: ['yellow', 'Pending activation'],
  DISABLED: ['gray', 'Disabled'],
  NONE: ['red', 'No login'],
}
export function LoginBadge({ status }) {
  const [variant, label] = LOGIN_BADGE[status] || LOGIN_BADGE.NONE
  return <Badge variant={variant} dot>{label}</Badge>
}

function fromAgent(a) {
  if (!a) return EMPTY
  return {
    ...EMPTY,
    firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone, city: a.city, region: a.region,
    licenseNumber: a.licenseNumber, specialization: a.specialization, department: a.department || '', branch: a.branch || '',
    address: a.address || '', companyId: a.companyId || '', status: a.status,
    commissionRate: String(Number(a.commissionRate)), bio: a.bio || '',
  }
}

// Mirrors the server agentCreateSchema / agentUpdateSchema.
function validate(f, isEdit) {
  const e = {}
  if (!f.firstName.trim()) e.firstName = 'Required.'
  if (!f.lastName.trim()) e.lastName = 'Required.'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email.'
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'At least 10 digits.'
  if (!f.city.trim()) e.city = 'Required.'
  if (!f.region.trim()) e.region = 'Required.'
  if (f.licenseNumber.trim().length < 3) e.licenseNumber = 'At least 3 characters.'
  if (f.specialization.trim().length < 2) e.specialization = 'Required.'
  const rate = Number(f.commissionRate)
  if (Number.isNaN(rate) || rate < 0 || rate > 50) e.commissionRate = 'Between 0 and 50.'
  if (!isEdit && f.credentialMode === 'PASSWORD') {
    const p = f.temporaryPassword
    if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) e.temporaryPassword = 'At least 8 characters with a letter and a number.'
  }
  return e
}

// Shows a freshly generated one-time link. It is displayed once; only its hash is stored on the server.
export function AccessLinkModal({ link, agentName, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!link) return null
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable: the field can still be selected manually */ }
  }
  const isInvite = link.purpose === 'INVITE'
  return (
    <Modal open onClose={onClose} title={isInvite ? 'Share the activation link' : 'Share the password reset link'} size="md"
      footer={<Button onClick={onClose}>Done</Button>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          {agentName} uses this link to {isInvite ? 'set a password and activate their account' : 'choose a new password'}.
          It works <strong>once</strong> and expires {dateTime(link.expiresAt)}.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" readOnly value={link.url} aria-label="One-time link" onFocus={(e) => e.target.select()} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <Notice tone="warn">
          Email delivery is not configured for this installation, so InsureX has <strong>not</strong> sent this anywhere.
          Share it with them over a trusted channel (in person, phone or your internal chat). It will not be shown again; generate a new one if it is lost.
        </Notice>
      </div>
    </Modal>
  )
}

export function AgentFormModal({ open, agent, onClose, onSaved }) {
  const isEdit = Boolean(agent)
  const companies = useApi(open ? '/insurance-companies' : null)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()

  useEffect(() => {
    if (open) { setF(fromAgent(agent)); setErrors({}); action.setError(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agent])

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))
  const opt = (v) => (v.trim() ? v.trim() : undefined)

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone.trim(),
      city: f.city.trim(), region: f.region.trim(), licenseNumber: f.licenseNumber.trim(), specialization: f.specialization.trim(),
      status: f.status, commissionRate: Number(f.commissionRate),
      department: opt(f.department), branch: opt(f.branch), address: opt(f.address), bio: opt(f.bio),
      ...(f.companyId ? { companyId: f.companyId } : isEdit ? { companyId: null } : {}),
      ...(!isEdit && { credentialMode: f.credentialMode }),
      ...(!isEdit && f.credentialMode === 'PASSWORD' && { temporaryPassword: f.temporaryPassword }),
    }
    try {
      const res = await action.run(() => (isEdit ? api.put(`/agents/${agent.id}`, payload) : api.post('/agents', payload)))
      onSaved(res.data.data)
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  return (
    <Modal open={open} onClose={action.pending ? () => {} : onClose} title={isEdit ? `Edit ${agent.agentNumber}` : 'Add new agent'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button><Button type="submit" form="agent-form" loading={action.pending}>{isEdit ? 'Save changes' : 'Create agent'}</Button></>}>
      <form id="agent-form" className="form-grid" onSubmit={submit} noValidate>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.message}</Notice></div>}
        {!isEdit && (
          <div className="span-2">
            <Notice>The agent ID is generated automatically and the login is always created with the <strong>Agent</strong> role. This form cannot create administrators.</Notice>
          </div>
        )}
        <Input id="af-first" label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="off" required />
        <Input id="af-last" label="Last name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="off" required />
        <Input id="af-email" label="Work email (sign-in email)" type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="off" required />
        <Input id="af-phone" label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} required />
        <Input id="af-dept" label="Department (optional)" value={f.department} onChange={set('department')} error={errors.department} placeholder="e.g. Retail, Corporate" />
        <Input id="af-branch" label="Branch (optional)" value={f.branch} onChange={set('branch')} error={errors.branch} placeholder="e.g. Pune Central" />
        <Input id="af-city" label="City" value={f.city} onChange={set('city')} error={errors.city} required />
        <Input id="af-region" label="Region" value={f.region} onChange={set('region')} error={errors.region} required />
        <Input id="af-address" className="span-2" label="Office address (optional)" value={f.address} onChange={set('address')} error={errors.address} />
        <Input id="af-license" label="Licence number" value={f.licenseNumber} onChange={set('licenseNumber')} error={errors.licenseNumber} required />
        <Input id="af-spec" label="Specialisation" value={f.specialization} onChange={set('specialization')} error={errors.specialization} placeholder="e.g. Health, Life, Motor" required />
        <Select id="af-company" label="Insurance company" value={f.companyId} onChange={set('companyId')}
          options={[{ value: '', label: 'Not tied to a company' }, ...(companies.data || []).map((c) => ({ value: c.id, label: c.name }))]} />
        <Input id="af-rate" label="Commission rate (%)" type="number" min="0" max="50" step="0.1" value={f.commissionRate} onChange={set('commissionRate')} error={errors.commissionRate} />
        <Select id="af-status" label="Account status" value={f.status} onChange={set('status')} options={AGENT_STATUSES} />
        <div />
        <div className="span-2">
          <label className="input-label" htmlFor="af-bio">Bio (optional)</label>
          <textarea id="af-bio" className="input" maxLength={2000} value={f.bio} onChange={set('bio')} />
        </div>

        {!isEdit && (
          <fieldset className="span-2" style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', margin: 0 }}>
            <legend className="input-label" style={{ padding: '0 4px' }}>Login credentials</legend>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, cursor: 'pointer' }}>
                <input type="radio" name="cred" value="INVITE" checked={f.credentialMode === 'INVITE'} onChange={set('credentialMode')} style={{ marginTop: 3 }} />
                <span><strong>Invitation link (recommended).</strong> You get a one-time link (valid 72 hours) for the agent to choose their own password. Status stays <em>Pending activation</em> until they use it.</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, cursor: 'pointer' }}>
                <input type="radio" name="cred" value="PASSWORD" checked={f.credentialMode === 'PASSWORD'} onChange={set('credentialMode')} style={{ marginTop: 3 }} />
                <span><strong>Set a temporary password.</strong> The agent can sign in immediately; ask them to change it from their profile.</span>
              </label>
              {f.credentialMode === 'PASSWORD' && (
                <Input id="af-temp" label="Temporary password" type="password" autoComplete="new-password" value={f.temporaryPassword} onChange={set('temporaryPassword')}
                  error={errors.temporaryPassword} hint="At least 8 characters with a letter and a number. Stored only as a secure hash." />
              )}
            </div>
          </fieldset>
        )}
        {isEdit && agent.status !== 'INACTIVE' && f.status === 'INACTIVE' && (
          <div className="span-2"><Notice tone="warn">Setting this agent to Inactive also disables their login and signs them out. Their assigned customers stay assigned until you reassign them.</Notice></div>
        )}
        {isEdit && agent.status === 'INACTIVE' && f.status !== 'INACTIVE' && (
          <div className="span-2"><Notice>Reactivating restores this agent's login with their existing password.</Notice></div>
        )}
      </form>
    </Modal>
  )
}

export default function Agents() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [link, setLink] = useState(null) // { url, expiresAt, purpose, name }
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const action = useAction()

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, reload } = useApi('/agents', { search: query || undefined, status: status || undefined })
  const all = useApi('/agents')
  const counts = (all.data || []).reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {})
  const pending = (all.data || []).filter((a) => a.loginStatus === 'PENDING_ACTIVATION').length
  const noLogin = (all.data || []).filter((a) => a.loginStatus === 'NONE').length
  const refresh = () => { reload(); all.reload() }

  async function toggle() {
    const next = toggling.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'
    await action.run(() => api.put(`/agents/${toggling.id}`, { status: next }))
    setMessage(next === 'INACTIVE'
      ? `${fullName(toggling)} is now inactive. Their login is disabled and active sessions were ended.`
      : `${fullName(toggling)} is active again and can sign in with their existing password.`)
    setToggling(null)
    refresh()
  }

  async function issueLink(a) {
    setFailure('')
    try {
      const res = await action.run(() => api.post(`/agents/${a.id}/access-link`))
      setLink({ ...res.data.data, name: fullName(a) })
      refresh()
    } catch (err) {
      setFailure(err.message)
    }
  }

  const deactivating = toggling && toggling.status !== 'INACTIVE'

  return (
    <div>
      <PageHeader title="Agent management" subtitle="Create agent accounts, manage their access and see each agent's book of customers."
        actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Add new agent</Button>} />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}
      {failure && <div style={{ marginBottom: 12 }}><Notice tone="error">{failure}</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Total agents" value={all.data ? all.data.length : '—'} foot={all.data && `${counts.ON_LEAVE || 0} on leave`} />
        <Kpi label="Active agents" value={all.data ? counts.ACTIVE || 0 : '—'} />
        <Kpi label="Inactive agents" value={all.data ? counts.INACTIVE || 0 : '—'} foot="Login disabled" />
        <Kpi label="Pending activation" value={all.data ? pending : '—'} foot={all.data && (noLogin ? `${noLogin} without any login` : 'Invitation not yet used')} tone={pending || noLogin ? 'warn' : ''} />
      </KpiBand>

      <Panel flush>
        <div className="filters">
          <Input id="agent-filter" prefixIcon={Search} placeholder="Search name, email or agent ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search agents" />
          <Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...AGENT_STATUSES]} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={query || status ? 'No agents match your search.' : 'No agents yet. Use “Add new agent” to create the first one.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Agent</th><th scope="col">Contact</th><th scope="col">Department · Branch</th>
                  <th scope="col" className="numeric">Customers</th><th scope="col" className="numeric">Policies</th>
                  <th scope="col">Login</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/admin/agents/${a.id}`} className="table-link" style={{ fontWeight: 600 }}>{fullName(a)}</Link><div className="mono">{a.agentNumber}</div></td>
                    <td>{a.email}<div className="muted" style={{ fontSize: 12 }}>{a.phone}</div></td>
                    <td>{a.department || <span className="muted">—</span>}<div className="muted" style={{ fontSize: 12 }}>{a.branch || a.region}</div></td>
                    <td className="numeric">{a._count.assignedCustomers}</td>
                    <td className="numeric">{a._count.policies}</td>
                    <td><LoginBadge status={a.loginStatus} />{a.login?.lastLoginAt && <div className="muted" style={{ fontSize: 12 }}>last {date(a.login.lastLoginAt)}</div>}</td>
                    <td><StatusBadge status={a.status} /><div className="muted" style={{ fontSize: 12 }}>since {date(a.joiningDate)}</div></td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      <Link to={`/admin/agents/${a.id}`} className="btn btn-ghost btn-sm" aria-label={`View ${fullName(a)}`}><Eye size={15} aria-hidden="true" /> View</Link>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(a)} aria-label={`Edit ${fullName(a)}`}>Edit</Button>
                      {a.status !== 'INACTIVE' && (a.loginStatus === 'PENDING_ACTIVATION' || a.loginStatus === 'NONE') && (
                        <Button size="sm" variant="ghost" icon={Link2} onClick={() => issueLink(a)} disabled={action.pending}>{a.loginStatus === 'NONE' ? 'Create login' : 'New link'}</Button>
                      )}
                      <Button size="sm" variant="ghost" icon={Power} style={a.status === 'INACTIVE' ? undefined : { color: '#B91C1C' }} onClick={() => setToggling(a)}>
                        {a.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Panel>

      <AgentFormModal open={creating} agent={null} onClose={() => setCreating(false)}
        onSaved={(a) => {
          setCreating(false)
          setMessage(a.invitation
            ? `${fullName(a)} was created as ${a.agentNumber}. Share the activation link so they can set their password.`
            : `${fullName(a)} was created as ${a.agentNumber} and can sign in now with the temporary password you set.`)
          if (a.invitation) setLink({ ...a.invitation, name: fullName(a) })
          refresh()
        }} />
      <AgentFormModal open={Boolean(editing)} agent={editing} onClose={() => setEditing(null)}
        onSaved={(a) => { setEditing(null); setMessage(`${fullName(a)} (${a.agentNumber}) was updated.`); refresh() }} />
      <AccessLinkModal link={link} agentName={link?.name} onClose={() => setLink(null)} />
      <ConfirmDialog open={Boolean(toggling)} title={`${deactivating ? 'Deactivate' : 'Reactivate'} ${toggling ? fullName(toggling) : ''}?`}
        confirmLabel={deactivating ? 'Deactivate' : 'Reactivate'} danger={deactivating}
        pending={action.pending} error={action.error} onClose={() => { setToggling(null); action.setError(null) }} onConfirm={toggle}>
        {deactivating ? (
          <>Their login will be disabled and any active sessions ended. {toggling?._count.assignedCustomers
            ? <strong>{toggling._count.assignedCustomers} assigned customer(s) will remain assigned to them until you reassign them.</strong>
            : 'They have no assigned customers.'} No records are deleted.</>
        ) : (
          <>Their login will be re-enabled and they can sign in with their existing password.</>
        )}
      </ConfirmDialog>
    </div>
  )
}
