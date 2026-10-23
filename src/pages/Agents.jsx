import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Search } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, DataState, Segmented, Notice, ConfirmDialog } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { date, fullName } from '../lib/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AGENT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'INACTIVE', label: 'Inactive' },
]
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', city: '', region: '', licenseNumber: '', specialization: '', companyId: '', status: 'ACTIVE', commissionRate: '8', bio: '' }

function fromAgent(a) {
  if (!a) return EMPTY
  return {
    firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone, city: a.city, region: a.region,
    licenseNumber: a.licenseNumber, specialization: a.specialization, companyId: a.companyId || '', status: a.status,
    commissionRate: String(Number(a.commissionRate)), bio: a.bio || '',
  }
}

// Mirrors server agentSchema.
function validate(f) {
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
  return e
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

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone.trim(),
      city: f.city.trim(), region: f.region.trim(), licenseNumber: f.licenseNumber.trim(), specialization: f.specialization.trim(),
      status: f.status, commissionRate: Number(f.commissionRate),
      ...(f.companyId && { companyId: f.companyId }),
      ...(f.bio.trim() && { bio: f.bio.trim() }),
    }
    try {
      const res = await action.run(() => (isEdit ? api.put(`/agents/${agent.id}`, payload) : api.post('/agents', payload)))
      onSaved(res.data.data)
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  return (
    <Modal open={open} onClose={action.pending ? () => {} : onClose} title={isEdit ? `Edit ${agent.agentNumber}` : 'Add agent'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button><Button type="submit" form="agent-form" loading={action.pending}>{isEdit ? 'Save changes' : 'Add agent'}</Button></>}>
      <form id="agent-form" className="form-grid" onSubmit={submit} noValidate>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.message}</Notice></div>}
        <Input id="af-first" label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} required />
        <Input id="af-last" label="Last name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} required />
        <Input id="af-email" label="Work email" type="email" value={f.email} onChange={set('email')} error={errors.email} required />
        <Input id="af-phone" label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} required />
        <Input id="af-city" label="City" value={f.city} onChange={set('city')} error={errors.city} required />
        <Input id="af-region" label="Region" value={f.region} onChange={set('region')} error={errors.region} required />
        <Input id="af-license" label="Licence number" value={f.licenseNumber} onChange={set('licenseNumber')} error={errors.licenseNumber} required />
        <Input id="af-spec" label="Specialisation" value={f.specialization} onChange={set('specialization')} error={errors.specialization} placeholder="e.g. Health, Life, Motor" required />
        <Select id="af-company" label="Insurance company" value={f.companyId} onChange={set('companyId')}
          options={[{ value: '', label: 'Not tied to a company' }, ...(companies.data || []).map((c) => ({ value: c.id, label: c.name }))]} />
        <Input id="af-rate" label="Commission rate (%)" type="number" min="0" max="50" step="0.1" value={f.commissionRate} onChange={set('commissionRate')} error={errors.commissionRate} />
        <Select id="af-status" label="Status" value={f.status} onChange={set('status')} options={AGENT_STATUSES} />
        <div />
        <div className="span-2">
          <label className="input-label" htmlFor="af-bio">Bio (optional)</label>
          <textarea id="af-bio" className="input" maxLength={2000} value={f.bio} onChange={set('bio')} />
        </div>
        {isEdit && agent.status !== 'INACTIVE' && f.status === 'INACTIVE' && (
          <div className="span-2"><Notice tone="warn">Setting this agent to Inactive also disables their login and signs them out. Their assigned customers stay assigned until you reassign them.</Notice></div>
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
  const [deactivating, setDeactivating] = useState(null)
  const [message, setMessage] = useState('')
  const action = useAction()

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, reload } = useApi('/agents', { search: query || undefined, status: status || undefined })
  const all = useApi('/agents')
  const counts = (all.data || []).reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {})
  const withLogin = (all.data || []).filter((a) => a.userId).length

  async function deactivate() {
    await action.run(() => api.put(`/agents/${deactivating.id}`, { status: 'INACTIVE' }))
    setMessage(`${fullName(deactivating)} is now inactive and their login has been disabled.`)
    setDeactivating(null)
    reload(); all.reload()
  }

  return (
    <div>
      <PageHeader title="Agents" subtitle="Advisor profiles, their book of customers and portal access."
        actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Add agent</Button>} />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Agents on record" value={all.data ? all.data.length : '—'} />
        <Kpi label="Active" value={all.data ? counts.ACTIVE || 0 : '—'} foot={all.data && `${counts.ON_LEAVE || 0} on leave · ${counts.INACTIVE || 0} inactive`} />
        <Kpi label="With a login" value={all.data ? withLogin : '—'} foot={all.data && (all.data.length - withLogin ? `${all.data.length - withLogin} without access` : 'All provisioned')} tone={all.data && all.data.length - withLogin ? 'warn' : ''} to="/admin/access" />
        <Kpi label="Assigned customers" value={all.data ? all.data.reduce((s, a) => s + a._count.assignedCustomers, 0) : '—'} />
      </KpiBand>

      <Panel flush>
        <div className="filters">
          <Input id="agent-filter" prefixIcon={Search} placeholder="Name, agent no., licence, city" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search agents" />
          <Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...AGENT_STATUSES]} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No agents match.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Agent</th><th scope="col">Region</th><th scope="col">Company</th><th scope="col">Specialisation</th>
                  <th scope="col" className="numeric">Customers</th><th scope="col" className="numeric">Policies</th><th scope="col" className="numeric">Claims</th>
                  <th scope="col">Login</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/admin/agents/${a.id}`} className="table-link" style={{ fontWeight: 600 }}>{fullName(a)}</Link><div className="mono">{a.agentNumber}</div></td>
                    <td>{a.region}<div className="muted" style={{ fontSize: 12 }}>{a.city}</div></td>
                    <td>{a.company?.name || <span className="muted">—</span>}</td>
                    <td>{a.specialization}</td>
                    <td className="numeric">{a._count.assignedCustomers}</td>
                    <td className="numeric">{a._count.policies}</td>
                    <td className="numeric">{a._count.claims}</td>
                    <td>{a.userId ? 'Yes' : <span style={{ color: 'var(--status-amber-text)', fontSize: 12.5 }}>None</span>}</td>
                    <td><StatusBadge status={a.status} /><div className="muted" style={{ fontSize: 12 }}>since {date(a.joiningDate)}</div></td>
                    <td style={{ textAlign: 'right' }}>
                      {a.status !== 'INACTIVE' && <Button size="sm" variant="ghost" style={{ color: '#B91C1C' }} onClick={() => setDeactivating(a)}>Deactivate</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Panel>

      <AgentFormModal open={creating} agent={null} onClose={() => setCreating(false)}
        onSaved={(a) => { setCreating(false); setMessage(`${fullName(a)} added as ${a.agentNumber}. Create a login for them under Users & Access.`); reload(); all.reload() }} />
      <ConfirmDialog open={Boolean(deactivating)} title={`Deactivate ${deactivating ? fullName(deactivating) : ''}?`} confirmLabel="Deactivate" danger
        pending={action.pending} error={action.error} onClose={() => { setDeactivating(null); action.setError(null) }} onConfirm={deactivate}>
        Their login will be disabled and any active sessions ended. {deactivating?._count.assignedCustomers
          ? <strong>{deactivating._count.assignedCustomers} assigned customer(s) will remain assigned to them until you reassign them.</strong>
          : 'They have no assigned customers.'} Records they handled are kept.
      </ConfirmDialog>
    </div>
  )
}
