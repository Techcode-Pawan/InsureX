import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Facts, Notice, DataState, Segmented } from '../components/panel'
import OpenRenewalModal from '../components/policies/OpenRenewalModal'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, date, daysUntil, fullName, titleCase } from '../lib/format'

const OPEN = ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD']
const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'RENEWED', label: 'Renewed' },
  { value: 'LAPSED', label: 'Lapsed' },
  { value: '', label: 'All' },
]

// What each decision does, shown to the reviewer before they confirm.
const EFFECTS = {
  RENEWED: 'The policy expiry moves to the end of the new term, the policy becomes active, and the renewal premium is billed as one installment due on the new start date. This cannot be undone.',
  LAPSED: 'The renewal closes and the policy is marked expired. The customer will need a new application for cover. This cannot be undone.',
  GRACE_PERIOD: 'The renewal stays open while the customer is within the grace period.',
  OVERDUE: 'Flags the renewal as overdue; it stays open for processing.',
}

function ProcessModal({ renewal, onClose, onDone }) {
  const [status, setStatus] = useState('RENEWED')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const action = useAction()
  if (!renewal) return null
  const final = status === 'RENEWED' || status === 'LAPSED'

  async function submit() {
    await action.run(() => api.put(`/renewals/${renewal.id}`, {
      status,
      ...(paymentMethod.trim() && { paymentMethod: paymentMethod.trim() }),
      ...(paymentReference.trim() && { paymentReference: paymentReference.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    }))
    onDone(`${renewal.renewalNumber} marked ${titleCase(status).toLowerCase()}.`)
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Process ${renewal.renewalNumber}`} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button variant={status === 'LAPSED' ? 'danger' : 'primary'} onClick={submit} loading={action.pending}>
          {status === 'RENEWED' ? 'Mark renewed' : status === 'LAPSED' ? 'Mark lapsed' : 'Update status'}
        </Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 14 }}>
        <Facts items={[
          ['Policy', renewal.policy.policyNumber],
          ['Policyholder', fullName(renewal.policy.customer)],
          ['Current expiry', date(renewal.previousExpiryDate)],
          ['New term', `${date(renewal.newStartDate)} – ${date(renewal.newExpiryDate)}`],
          ['Renewal premium', inr(renewal.renewalPremium)],
        ]} />
        <Select id="rn-status" label="Decision" value={status} onChange={(e) => setStatus(e.target.value)} options={[
          { value: 'RENEWED', label: 'Renewed' },
          { value: 'GRACE_PERIOD', label: 'In grace period' },
          { value: 'OVERDUE', label: 'Overdue' },
          { value: 'LAPSED', label: 'Lapsed' },
        ].filter((o) => o.value !== renewal.status)} />
        <Notice tone={final ? 'warn' : 'info'}>{EFFECTS[status]}</Notice>
        {status === 'RENEWED' && (
          <div className="form-grid">
            <Input id="rn-method" label="Payment method (optional)" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} maxLength={40} />
            <Input id="rn-ref" label="Payment reference (optional)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} maxLength={64} />
          </div>
        )}
        <div>
          <label className="input-label" htmlFor="rn-notes">Notes (optional)</label>
          <textarea id="rn-notes" className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}

export default function Renewals() {
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const renewals = useApi('/renewals', { status: filter === 'open' ? undefined : filter, search: search.trim() || undefined })
  const expiring = useApi('/policies', { status: 'ACTIVE', expiringWithinDays: 60, limit: 100 })
  const allOpen = useApi('/renewals', {})
  const [processing, setProcessing] = useState(null)
  const [opening, setOpening] = useState(null)
  const [message, setMessage] = useState('')

  const list = (renewals.data || []).filter((r) => filter !== 'open' || OPEN.includes(r.status))
  const openPolicyIds = new Set((allOpen.data || []).filter((r) => OPEN.includes(r.status)).map((r) => r.policyId))
  const opportunities = (expiring.data || []).filter((p) => !openPolicyIds.has(p.id))
  const openCount = (allOpen.data || []).filter((r) => OPEN.includes(r.status)).length

  function refresh() {
    renewals.reload()
    expiring.reload()
    allOpen.reload()
  }
  function done(msg) {
    setProcessing(null)
    setOpening(null)
    setMessage(msg)
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Policy renewals"
        subtitle="Open renewals awaiting a decision, and active policies approaching expiry without one."
        actions={<Button variant="secondary" size="sm" icon={RotateCw} onClick={refresh}>Refresh</Button>}
      />

      <KpiBand cols={3}>
        <Kpi label="Open renewals" value={allOpen.data ? openCount : '—'} />
        <Kpi label="Expiring in 60 days" value={expiring.body?.total ?? '—'} foot="Active policies" />
        <Kpi label="No renewal opened" value={expiring.data ? opportunities.length : '—'} tone={opportunities.length ? 'warn' : ''} foot="Need follow-up" />
      </KpiBand>

      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <div className="px-grid main-side">
        <Panel flush title="Renewals">
          <div className="filters">
            <Input id="rn-search" prefixIcon={Search} placeholder="Renewal no., policy or customer" aria-label="Search renewals" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Segmented label="Filter renewals" value={filter} onChange={setFilter} options={FILTERS} />
          </div>
          <DataState loading={renewals.loading} error={renewals.error} onRetry={renewals.reload} empty={list.length === 0} emptyText="No renewals match.">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th scope="col">Renewal</th><th scope="col">Policy · customer</th><th scope="col">New term</th><th scope="col" className="numeric">Premium</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td><span className="mono">{r.renewalNumber}</span>{r.notes && <div className="muted" style={{ fontSize: 12, maxWidth: 220, whiteSpace: 'normal' }}>{r.notes}</div>}</td>
                      <td>
                        <Link className="table-link" to={`/admin/policies/${r.policy.id}`}>{r.policy.policyNumber}</Link>
                        <div className="muted" style={{ fontSize: 12 }}>{fullName(r.policy.customer)} · {r.policy.policyType?.name}</div>
                      </td>
                      <td className="nowrap">{date(r.newStartDate)} – {date(r.newExpiryDate)}</td>
                      <td className="numeric">{inr(r.renewalPremium)}</td>
                      <td><StatusBadge status={r.status} />{r.renewalDate && <div className="muted" style={{ fontSize: 12 }}>{date(r.renewalDate)}</div>}</td>
                      <td style={{ textAlign: 'right' }}>{OPEN.includes(r.status) && <Button size="sm" onClick={() => setProcessing(r)}>Process</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </Panel>

        <Panel flush title="Expiring without a renewal" note="Active policies ending in the next 60 days">
          <DataState loading={expiring.loading || allOpen.loading} error={expiring.error || allOpen.error} onRetry={refresh} empty={opportunities.length === 0} emptyText="Every policy expiring soon already has a renewal open.">
            <ul className="rows">
              {opportunities.map((p) => {
                const d = daysUntil(p.expiryDate)
                return (
                  <li key={p.id} className="row">
                    <div className="row-main">
                      <div className="row-title"><Link className="table-link" to={`/admin/policies/${p.id}`}>{p.policyNumber}</Link></div>
                      <div className="row-meta">{fullName(p.customer)} · {p.policyType.name}</div>
                      <div className="row-meta" style={{ color: d <= 15 ? 'var(--status-red-text)' : 'var(--status-amber-text)' }}>Expires {date(p.expiryDate)} ({d} days)</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setOpening(p)}>Open renewal</Button>
                  </li>
                )
              })}
            </ul>
          </DataState>
        </Panel>
      </div>

      <ProcessModal key={processing?.id} renewal={processing} onClose={() => setProcessing(null)} onDone={done} />
      {opening && <OpenRenewalModal policy={opening} onClose={() => setOpening(null)} onDone={done} />}
    </div>
  )
}
