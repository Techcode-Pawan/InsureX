import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CheckCircle2, XCircle, RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Facts, Notice, DataState, Pager, Segmented } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, date, relativeDays, fullName, titleCase } from '../lib/format'

const PER_YEAR = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, ANNUALLY: 1 }
const FREQUENCIES = Object.keys(PER_YEAR).map((v) => ({ value: v, label: titleCase(v) }))
const STATUS_FILTERS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Withdrawn' },
  { value: '', label: 'All' },
]

const today = () => new Date().toISOString().slice(0, 10)
function plusYear(iso) {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
// Default underwriting rule mirrored from the server: 1.5% of cover per year, split by billing frequency.
const defaultInstallment = (cover, freq) => Math.round(((Number(cover) * 0.015) / PER_YEAR[freq]) * 100) / 100

function ApproveModal({ app, onClose, onDone }) {
  const companies = useApi(app ? '/insurance-companies' : null)
  const agents = useApi(app ? '/agents' : null, { status: 'ACTIVE' })
  const [form, setForm] = useState(null)
  const action = useAction()

  useEffect(() => {
    if (!app) return
    const start = today()
    setForm({
      premiumFrequency: 'ANNUALLY',
      premiumAmount: String(defaultInstallment(app.requestedCoverage, 'ANNUALLY')),
      startDate: start,
      expiryDate: plusYear(start),
      companyId: '',
      agentId: app.assistedByAgent?.id || '',
      notes: '',
    })
    action.setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app])

  if (!app || !form) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const installments = PER_YEAR[form.premiumFrequency]
  const annual = Number(form.premiumAmount || 0) * installments
  const invalid = !(Number(form.premiumAmount) > 0) || form.expiryDate <= form.startDate

  async function approve() {
    const payload = {
      premiumFrequency: form.premiumFrequency,
      premiumAmount: Number(form.premiumAmount),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      ...(form.companyId && { companyId: form.companyId }),
      ...(form.agentId && { agentId: form.agentId }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    }
    const res = await action.run(() => api.post(`/applications/${app.id}/approve`, payload))
    const { policy, premiumsScheduled } = res.data.data
    onDone(`Approved ${app.applicationNumber}. Policy ${policy.policyNumber} issued with ${premiumsScheduled} premium installment${premiumsScheduled === 1 ? '' : 's'} scheduled.`)
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Approve ${app.applicationNumber}`} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button icon={CheckCircle2} onClick={approve} loading={action.pending} disabled={invalid}>Approve & issue policy</Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 16 }}>
        <Facts items={[
          ['Applicant', `${fullName(app.customer)} (${app.customer.customerNumber})`],
          ['Plan', app.policyType.name],
          ['Requested cover', inr(app.requestedCoverage)],
          ['Annual income', app.annualIncome ? inr(app.annualIncome) : '—'],
          ['Employment', app.employmentStatus || '—'],
          ['Nominee', app.nomineeName ? `${app.nomineeName}${app.nomineeRelation ? ` (${app.nomineeRelation})` : ''}` : '—'],
        ]} />
        <div className="form-grid">
          <Select id="ap-freq" label="Billing frequency" value={form.premiumFrequency} options={FREQUENCIES}
            onChange={(e) => setForm((f) => ({ ...f, premiumFrequency: e.target.value, premiumAmount: String(defaultInstallment(app.requestedCoverage, e.target.value)) }))} />
          <Input id="ap-amount" label="Premium per installment (₹)" type="number" min="1" step="0.01" value={form.premiumAmount} onChange={set('premiumAmount')}
            hint={`${installments} installment${installments === 1 ? '' : 's'} a year · ${inr(annual)} annually. Default: 1.5% of cover per year.`} />
          <Input id="ap-start" label="Policy start" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input id="ap-exp" label="Policy expiry" type="date" value={form.expiryDate} onChange={set('expiryDate')} error={form.expiryDate <= form.startDate ? 'Expiry must be after start.' : undefined} />
          <Select id="ap-company" label="Insurer (optional)" value={form.companyId} onChange={set('companyId')}
            options={[{ value: '', label: 'Not assigned' }, ...(companies.data || []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select id="ap-agent" label="Servicing agent" value={form.agentId} onChange={set('agentId')}
            hint={app.assistedByAgent ? 'Defaults to the agent who assisted this application.' : 'If left empty, the customer\'s assigned agent is used.'}
            options={[{ value: '', label: 'Use customer\'s assigned agent' }, ...(agents.data || []).map((a) => ({ value: a.id, label: `${fullName(a)} (${a.agentNumber})` }))]} />
          <div className="span-2">
            <label className="input-label" htmlFor="ap-notes">Underwriting note (internal)</label>
            <textarea id="ap-notes" className="input" maxLength={2000} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <Notice>Approval issues the policy and creates its full premium schedule in one transaction. An application can only ever produce one policy.</Notice>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}

function RejectModal({ app, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const action = useAction()
  if (!app) return null
  const tooShort = reason.trim().length < 5

  async function reject() {
    await action.run(() => api.post(`/applications/${app.id}/reject`, { rejectionReason: reason.trim() }))
    onDone(`Rejected ${app.applicationNumber}. The customer has been notified with your reason.`)
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Reject ${app.applicationNumber}?`} size="sm" footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button variant="danger" icon={XCircle} onClick={reject} loading={action.pending} disabled={tooShort}>Reject application</Button>
      </>
    }>
      <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
        {fullName(app.customer)} · {app.policyType.name} · {inr(app.requestedCoverage)}. This decision is final and the reason is shown to the customer.
      </p>
      <label className="input-label" htmlFor="rj-reason">Reason for rejection</label>
      <textarea id="rj-reason" className="input" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} aria-invalid={tooShort} />
      <p className="field-help">At least 5 characters.</p>
      {action.error && <Notice tone="error">{action.error.message}</Notice>}
    </Modal>
  )
}

export default function Applications() {
  const [status, setStatus] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const params = useMemo(() => ({ status, search: search.trim() || undefined, page, limit: 15 }), [status, search, page])
  const { data, body, loading, error, reload } = useApi('/applications', params)
  const counts = {
    PENDING: useApi('/applications', { status: 'PENDING', limit: 1 }),
    APPROVED: useApi('/applications', { status: 'APPROVED', limit: 1 }),
    REJECTED: useApi('/applications', { status: 'REJECTED', limit: 1 }),
  }
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [message, setMessage] = useState('')

  // Approve needs full applicant detail (income, nominee) that the list omits.
  async function openApprove(row) {
    const res = await api.get(`/applications/${row.id}`)
    setApproving(res.data.data)
  }

  function done(msg) {
    setApproving(null)
    setRejecting(null)
    setMessage(msg)
    reload()
    Object.values(counts).forEach((c) => c.reload())
  }

  return (
    <div>
      <PageHeader
        title="Underwriting queue"
        subtitle="Review insurance applications. Approval issues the policy and its premium schedule atomically."
        actions={<Button variant="secondary" size="sm" icon={RotateCw} onClick={reload}>Refresh</Button>}
      />

      <KpiBand cols={3}>
        <Kpi label="Awaiting decision" value={counts.PENDING.body?.total ?? '—'} tone={counts.PENDING.body?.total ? 'warn' : ''} foot="Pending applications" />
        <Kpi label="Approved" value={counts.APPROVED.body?.total ?? '—'} foot="Policies issued from applications" />
        <Kpi label="Rejected" value={counts.REJECTED.body?.total ?? '—'} />
      </KpiBand>

      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="app-search" prefixIcon={Search} placeholder="Application no., customer or plan" aria-label="Search applications"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Segmented label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_FILTERS} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status === 'PENDING' ? 'No applications are waiting for review.' : 'No applications match these filters.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Application</th><th scope="col">Applicant</th><th scope="col">Plan</th>
                  <th scope="col" className="numeric">Requested cover</th><th scope="col">Submitted</th><th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="mono">{a.applicationNumber}</span>
                      {a.assistedByAgent && <div className="muted" style={{ fontSize: 12 }}>via {fullName(a.assistedByAgent)}</div>}
                    </td>
                    <td>
                      <Link className="table-link" to={`/admin/customers/${a.customer.id}`}>{fullName(a.customer)}</Link>
                      <div className="muted" style={{ fontSize: 12 }}>{a.customer.customerNumber}</div>
                    </td>
                    <td>{a.policyType.name}</td>
                    <td className="numeric">{inr(a.requestedCoverage)}</td>
                    <td className="nowrap">{date(a.applicationDate)}<div className="muted" style={{ fontSize: 12 }}>{relativeDays(a.applicationDate)}</div></td>
                    <td>
                      <StatusBadge status={a.status} />
                      {a.policy && <div><Link className="table-link" style={{ fontSize: 12 }} to={`/admin/policies/${a.policy.id}`}>{a.policy.policyNumber}</Link></div>}
                    </td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      {a.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => openApprove(a)}>Approve</Button>{' '}
                          <Button size="sm" variant="secondary" onClick={() => setRejecting(a)}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <ApproveModal app={approving} onClose={() => setApproving(null)} onDone={done} />
      <RejectModal key={rejecting?.id || 'none'} app={rejecting} onClose={() => setRejecting(null)} onDone={done} />
    </div>
  )
}
