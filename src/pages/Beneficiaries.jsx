import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Notice, ConfirmDialog } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { date, fullName } from '../lib/format'

const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other']
const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving Licence']
const EMPTY = { policyId: '', name: '', relationship: RELATIONSHIPS[0], allocationPercentage: '', phone: '', email: '', dateOfBirth: '', idProofType: '', idProofNumber: '', address: '' }

function BeneficiaryModal({ open, editing, policies, allocatedByPolicy, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (!open) return
    action.setError(null)
    setErrors({})
    setForm(editing ? {
      policyId: editing.policyId,
      name: editing.name,
      relationship: editing.relationship,
      allocationPercentage: String(Number(editing.allocationPercentage)),
      phone: editing.phone || '',
      email: editing.email || '',
      dateOfBirth: editing.dateOfBirth ? editing.dateOfBirth.slice(0, 10) : '',
      idProofType: editing.idProofType || '',
      idProofNumber: editing.idProofNumber || '',
      address: editing.address || '',
    } : EMPTY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  // Remaining allocation on the selected policy, excluding the beneficiary being edited
  const others = (allocatedByPolicy[form.policyId] || 0) - (editing && editing.policyId === form.policyId ? Number(editing.allocationPercentage) : 0)
  const remaining = Math.max(0, 100 - others)

  function validate() {
    const e = {}
    if (!form.policyId) e.policyId = 'Select a policy.'
    if (form.name.trim().length < 2) e.name = 'Enter the beneficiary name.'
    const pct = Number(form.allocationPercentage)
    if (!pct || pct < 1 || pct > 100) e.allocationPercentage = 'Enter a share between 1 and 100%.'
    else if (pct > remaining) e.allocationPercentage = `Only ${remaining}% is unallocated on this policy.`
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email or leave blank.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(ev) {
    ev.preventDefault()
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      relationship: form.relationship,
      allocationPercentage: Number(form.allocationPercentage),
      ...(form.phone.trim() && { phone: form.phone.trim() }),
      ...(form.email.trim() && { email: form.email.trim() }),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      ...(form.idProofType && { idProofType: form.idProofType }),
      ...(form.idProofNumber.trim() && { idProofNumber: form.idProofNumber.trim() }),
      ...(form.address.trim() && { address: form.address.trim() }),
    }
    if (editing) await action.run(() => api.put(`/beneficiaries/${editing.id}`, payload))
    else await action.run(() => api.post('/beneficiaries', { ...payload, policyId: form.policyId }))
    onSaved(editing ? `${payload.name} updated.` : `${payload.name} added as a beneficiary.`)
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit beneficiary' : 'Add beneficiary'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="ben-form" loading={action.pending}>{editing ? 'Save changes' : 'Add beneficiary'}</Button>
      </>
    }>
      <form id="ben-form" className="form-grid" onSubmit={submit} noValidate>
        <Select id="ben-policy" className="span-2" label="Policy" value={form.policyId} onChange={set('policyId')} error={errors.policyId}
          disabled={Boolean(editing)} placeholder="Select a policy"
          hint={editing ? 'A beneficiary cannot be moved to another policy.' : undefined}
          options={policies.map((p) => ({ value: p.id, label: `${p.policyNumber} · ${fullName(p.customer)} · ${p.policyType?.name} (${allocatedByPolicy[p.id] || 0}% allocated)` }))} />
        <Input id="ben-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
        <Select id="ben-rel" label="Relationship" value={form.relationship} onChange={set('relationship')} options={RELATIONSHIPS} />
        <Input id="ben-pct" label="Share of benefit (%)" type="number" min="1" max="100" step="0.01" value={form.allocationPercentage}
          onChange={set('allocationPercentage')} error={errors.allocationPercentage}
          hint={form.policyId ? `${remaining}% available on this policy` : undefined} />
        <Input id="ben-dob" label="Date of birth (optional)" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        <Input id="ben-phone" label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} />
        <Input id="ben-email" label="Email (optional)" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Select id="ben-idtype" label="ID proof type (optional)" value={form.idProofType} onChange={set('idProofType')}
          options={[{ value: '', label: 'None' }, ...ID_TYPES.map((t) => ({ value: t, label: t }))]} />
        <Input id="ben-idnum" label="ID proof number (optional)" value={form.idProofNumber} onChange={set('idProofNumber')} />
        <Input id="ben-addr" className="span-2" label="Address (optional)" value={form.address} onChange={set('address')} />
        {action.error && <div className="span-2"><Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice></div>}
      </form>
    </Modal>
  )
}

export default function Beneficiaries() {
  const [search, setSearch] = useState('')
  const { data, loading, error, reload } = useApi('/beneficiaries', { search: search.trim() || undefined })
  const all = useApi('/beneficiaries') // unfiltered, for per-policy allocation totals
  const policies = useApi('/policies', { limit: 100 })
  const [modal, setModal] = useState(null) // { editing }
  const [removing, setRemoving] = useState(null)
  const [message, setMessage] = useState('')
  const removeAction = useAction()

  const allocatedByPolicy = useMemo(() => {
    const totals = {}
    for (const b of all.data || []) totals[b.policyId] = (totals[b.policyId] || 0) + Number(b.allocationPercentage)
    return totals
  }, [all.data])

  // Group the (filtered) list by policy so allocation completeness is visible per policy
  const groups = useMemo(() => {
    const map = new Map()
    for (const b of data || []) {
      if (!map.has(b.policyId)) map.set(b.policyId, { policy: b.policy, items: [] })
      map.get(b.policyId).items.push(b)
    }
    return [...map.values()]
  }, [data])

  function refresh(msg) {
    setMessage(msg)
    reload()
    all.reload()
  }

  async function confirmRemove() {
    await removeAction.run(() => api.delete(`/beneficiaries/${removing.id}`))
    setRemoving(null)
    refresh(`${removing.name} was removed from ${removing.policy.policyNumber}.`)
  }

  const openPolicies = (policies.data || []).filter((p) => !['CANCELLED', 'EXPIRED'].includes(p.status))

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        subtitle="Nominees on each policy. Shares on a policy can never total more than 100%."
        actions={<Button icon={Plus} onClick={() => setModal({ editing: null })}>Add beneficiary</Button>}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="ben-search" prefixIcon={Search} aria-label="Search beneficiaries" placeholder="Beneficiary, policy number or policyholder"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={groups.length === 0} emptyText="No beneficiaries match.">
          {groups.map(({ policy, items }) => {
            const total = allocatedByPolicy[policy.id] || 0
            return (
              <section key={policy.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }} aria-label={`Beneficiaries on ${policy.policyNumber}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'var(--color-bg-subtle)', flexWrap: 'wrap' }}>
                  <div>
                    <Link to={`/admin/policies/${policy.id}`} className="table-link" style={{ fontWeight: 600 }}>{policy.policyNumber}</Link>
                    <span className="muted"> · {fullName(policy.customer)} · {policy.policyType?.name}</span>{' '}
                    <StatusBadge status={policy.status} />
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span className="muted">Allocated</span>
                      <strong style={{ color: total === 100 ? 'var(--status-green-text)' : 'var(--status-amber-text)' }}>{total}%</strong>
                    </div>
                    <div className="meter" role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={100} aria-label="Allocated share">
                      <span style={{ width: `${Math.min(100, total)}%`, background: total === 100 ? '#059669' : undefined }} />
                    </div>
                  </div>
                </div>
                <ul className="rows">
                  {items.map((b) => (
                    <li key={b.id} className="row" style={{ flexWrap: 'wrap' }}>
                      <div className="row-main">
                        <div className="row-title">{b.name}</div>
                        <div className="row-meta">
                          {b.relationship}{b.dateOfBirth && ` · born ${date(b.dateOfBirth)}`}{b.phone && ` · ${b.phone}`}{b.email && ` · ${b.email}`}
                        </div>
                      </div>
                      <div className="row-end row-amount">{Number(b.allocationPercentage)}%</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setModal({ editing: b })} aria-label={`Edit ${b.name}`}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(b)} aria-label={`Remove ${b.name}`} style={{ color: '#B91C1C' }}>Remove</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </DataState>
      </Panel>

      <BeneficiaryModal
        open={Boolean(modal)}
        editing={modal?.editing || null}
        policies={openPolicies}
        allocatedByPolicy={allocatedByPolicy}
        onClose={() => setModal(null)}
        onSaved={(msg) => { setModal(null); refresh(msg) }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove beneficiary?"
        confirmLabel="Remove"
        danger
        pending={removeAction.pending}
        error={removeAction.error}
        onClose={() => { setRemoving(null); removeAction.setError(null) }}
        onConfirm={confirmRemove}
      >
        {removing && (
          <p style={{ margin: 0 }}>
            <strong>{removing.name}</strong> ({Number(removing.allocationPercentage)}%) will no longer receive benefits under policy {removing.policy.policyNumber}.
            The share becomes unallocated until reassigned.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
