import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Pager, Notice, Segmented } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, date, fullName } from '../lib/format'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'REJECTED', label: 'Rejected' },
]

const CLAIM_TYPES = ['Hospitalization', 'Accident', 'Death', 'Critical Illness', 'Vehicle Damage', 'Theft', 'Property Damage', 'Other']

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Staff-filed claim on behalf of a customer. All business rules are enforced again by the API.
function FileClaimModal({ open, onClose, onCreated }) {
  const [customerSearch, setCustomerSearch] = useState('')
  const [customer, setCustomer] = useState(null)
  const [form, setForm] = useState({ policyId: '', claimType: CLAIM_TYPES[0], claimDate: today(), claimedAmount: '', incidentDescription: '' })
  const [errors, setErrors] = useState({})
  const customers = useApi(open && customerSearch.trim().length >= 2 && !customer ? '/customers' : null, { search: customerSearch.trim(), limit: 8 })
  const policies = useApi(open && customer ? '/policies' : null, { customerId: customer?.id, status: 'ACTIVE', limit: 50 })
  const action = useAction()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const policy = policies.data?.find((p) => p.id === form.policyId)

  useEffect(() => {
    if (!open) {
      setCustomer(null)
      setCustomerSearch('')
      setForm({ policyId: '', claimType: CLAIM_TYPES[0], claimDate: today(), claimedAmount: '', incidentDescription: '' })
      setErrors({})
      action.setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function validate() {
    const e = {}
    if (!customer) e.customer = 'Select the claimant.'
    if (!form.policyId) e.policyId = 'Select an active policy.'
    if (!form.claimDate || form.claimDate > today()) e.claimDate = 'Claim date cannot be in the future.'
    if (policy && form.claimDate && (form.claimDate < policy.startDate.slice(0, 10) || form.claimDate > policy.expiryDate.slice(0, 10))) {
      e.claimDate = `Must be within the policy period (${date(policy.startDate)} – ${date(policy.expiryDate)}).`
    }
    const amt = Number(form.claimedAmount)
    if (!amt || amt <= 0) e.claimedAmount = 'Enter the claimed amount.'
    else if (policy && amt > Number(policy.sumAssured)) e.claimedAmount = `Cannot exceed the sum assured (${inr(policy.sumAssured)}).`
    if (form.incidentDescription.trim().length < 10) e.incidentDescription = 'Describe the incident (at least 10 characters).'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(ev) {
    ev.preventDefault()
    if (!validate()) return
    const res = await action.run(() => api.post('/claims', {
      customerId: customer.id,
      policyId: form.policyId,
      claimType: form.claimType,
      claimDate: form.claimDate,
      claimedAmount: Number(form.claimedAmount),
      incidentDescription: form.incidentDescription.trim(),
    }))
    onCreated(res.data.data)
  }

  return (
    <Modal open={open} onClose={onClose} title="File a claim for a customer" size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="file-claim" loading={action.pending}>File claim</Button>
      </>
    }>
      <form id="file-claim" onSubmit={submit} className="form-grid" noValidate>
        <div className="span-2">
          {customer ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{fullName(customer)}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{customer.customerNumber} · {customer.email}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setCustomer(null); setForm((f) => ({ ...f, policyId: '' })) }}>Change</Button>
            </div>
          ) : (
            <>
              <Input id="fc-customer" label="Claimant" prefixIcon={Search} placeholder="Search by name, customer number or email" value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)} error={errors.customer} />
              {customers.data && (
                <ul className="rows" style={{ border: '1px solid var(--color-border)', borderRadius: 8, marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {customers.data.length === 0 && <li className="row muted">No matching customers.</li>}
                  {customers.data.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="row" onClick={() => setCustomer(c)}>
                        <div className="row-main">
                          <div className="row-title">{fullName(c)}</div>
                          <div className="row-meta">{c.customerNumber} · {c.email}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <Select id="fc-policy" className="span-2" label="Policy" value={form.policyId} onChange={set('policyId')} error={errors.policyId}
          disabled={!customer}
          placeholder={!customer ? 'Select a claimant first' : policies.loading ? 'Loading policies…' : policies.data?.length ? 'Select an active policy' : 'No active policies for this customer'}
          options={(policies.data || []).map((p) => ({ value: p.id, label: `${p.policyNumber} · ${p.policyType?.name} · cover ${inr(p.sumAssured)}` }))} />
        <Select id="fc-type" label="Claim type" value={form.claimType} onChange={set('claimType')} options={CLAIM_TYPES} />
        <Input id="fc-date" label="Incident date" type="date" max={today()} value={form.claimDate} onChange={set('claimDate')} error={errors.claimDate} />
        <Input id="fc-amount" label="Claimed amount (₹)" type="number" min="1" step="0.01" inputMode="decimal" value={form.claimedAmount} onChange={set('claimedAmount')}
          error={errors.claimedAmount} hint={policy ? `Sum assured ${inr(policy.sumAssured)}` : undefined} />
        <div />
        <div className="span-2">
          <label className="input-label" htmlFor="fc-desc">Incident description</label>
          <textarea id="fc-desc" className={`input ${errors.incidentDescription ? 'error' : ''}`} maxLength={5000} value={form.incidentDescription}
            onChange={set('incidentDescription')} aria-invalid={Boolean(errors.incidentDescription)} />
          {errors.incidentDescription && <p className="input-error-msg" role="alert">{errors.incidentDescription}</p>}
        </div>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice></div>}
      </form>
    </Modal>
  )
}

export default function Claims() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [status, setStatus] = useState(params.get('status') || '')
  const [page, setPage] = useState(1)
  const [filing, setFiling] = useState(params.get('action') === 'new')
  const [message, setMessage] = useState('')
  const { data, body, loading, error, reload } = useApi('/claims', { search: search.trim() || undefined, status, page, limit: 15 })

  function changeStatus(v) {
    setStatus(v)
    setPage(1)
    const next = new URLSearchParams(params)
    if (v) next.set('status', v)
    else next.delete('status')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Claims"
        subtitle="Every claim filed against InsureX policies, with its processing stage."
        actions={<Button icon={Plus} onClick={() => setFiling(true)}>File claim</Button>}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="claims-search" prefixIcon={Search} placeholder="Claim number, customer or policy" aria-label="Search claims"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Segmented label="Filter by status" value={status} onChange={changeStatus} options={STATUS_FILTERS} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No claims match these filters.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Policy</th>
                  <th scope="col">Filed</th>
                  <th scope="col">Assessor</th>
                  <th scope="col" className="numeric">Claimed</th>
                  <th scope="col" className="numeric">Approved</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/claims/${c.id}`} className="table-link">{c.claimNumber}</Link>
                      <div className="muted" style={{ fontSize: 12 }}>{c.claimType}</div>
                    </td>
                    <td>
                      <Link to={`/admin/customers/${c.customer?.id}`} className="table-link" style={{ fontWeight: 500 }}>{fullName(c.customer)}</Link>
                      <div className="mono">{c.customer?.customerNumber}</div>
                    </td>
                    <td>
                      <Link to={`/admin/policies/${c.policy?.id}`} className="table-link" style={{ fontWeight: 500 }}>{c.policy?.policyNumber}</Link>
                      <div className="muted" style={{ fontSize: 12 }}>{c.policy?.policyType?.name}</div>
                    </td>
                    <td className="nowrap">{date(c.claimDate)}</td>
                    <td>{c.assignedAgent ? fullName(c.assignedAgent) : <span className="muted">Unassigned</span>}</td>
                    <td className="numeric">{inr(c.claimedAmount)}</td>
                    <td className="numeric">{c.approvedAmount !== null && c.approvedAmount !== undefined && c.status !== 'REJECTED' ? inr(c.approvedAmount) : '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <FileClaimModal
        open={filing}
        onClose={() => setFiling(false)}
        onCreated={(claim) => {
          setFiling(false)
          setMessage(`Claim ${claim.claimNumber} filed and queued for review.`)
          reload()
        }}
      />
    </div>
  )
}
