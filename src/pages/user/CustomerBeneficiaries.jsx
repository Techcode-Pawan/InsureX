import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { date } from '../../lib/format'
import { PageHead, Panel, DataState, Notice, ConfirmDialog } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import '../../styles/user.css'

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other relative', 'Other']
const EMPTY = { policyId: '', name: '', relationship: '', allocationPercentage: '', phone: '', email: '', dateOfBirth: '' }
const round2 = (n) => Math.round(n * 100) / 100

// Mirrors server/src/validators/schemas.js selfBeneficiary* (strict) and the 100% allocation rule.
function validate(form, available, isEdit) {
  const e = {}
  if (!isEdit && !form.policyId) e.policyId = 'Choose the policy this beneficiary belongs to.'
  if (form.name.trim().length < 2) e.name = 'Enter the beneficiary\'s full name.'
  if (form.relationship.trim().length < 2) e.relationship = 'Choose the relationship.'
  const pct = Number(form.allocationPercentage)
  if (!form.allocationPercentage || Number.isNaN(pct) || pct < 1 || pct > 100) e.allocationPercentage = 'Enter a share between 1 and 100%.'
  else if (pct > available) e.allocationPercentage = `Only ${available}% of this policy is still unallocated.`
  if (form.phone && form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit phone number or leave it blank.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email or leave it blank.'
  if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) e.dateOfBirth = 'Date of birth cannot be in the future.'
  return e
}

function payload(form, isEdit) {
  const out = {
    name: form.name.trim(),
    relationship: form.relationship.trim(),
    allocationPercentage: Number(form.allocationPercentage),
  }
  if (!isEdit) out.policyId = form.policyId
  if (form.phone.trim()) out.phone = form.phone.trim()
  if (form.email.trim()) out.email = form.email.trim()
  if (form.dateOfBirth) out.dateOfBirth = form.dateOfBirth
  return out
}

function BeneficiaryModal({ open, editing, presetPolicyId, policies, allocatedByPolicy, onClose, onSaved }) {
  const isEdit = Boolean(editing)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()
  const [lastOpen, setLastOpen] = useState(false)

  // Reset the form each time the dialog opens
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setErrors({})
      action.setError(null)
      setForm(editing ? {
        policyId: editing.policy.id,
        name: editing.name || '',
        relationship: editing.relationship || '',
        allocationPercentage: String(Number(editing.allocationPercentage)),
        phone: editing.phone || '',
        email: editing.email || '',
        dateOfBirth: editing.dateOfBirth ? String(editing.dateOfBirth).slice(0, 10) : '',
      } : { ...EMPTY, policyId: presetPolicyId || (policies.length === 1 ? policies[0].id : '') })
    }
  }

  const policyId = form.policyId
  const others = round2((allocatedByPolicy.get(policyId) || 0) - (isEdit ? Number(editing.allocationPercentage) : 0))
  const available = round2(Math.max(0, 100 - others))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = validate(form, available, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const body = payload(form, isEdit)
    const res = await action.run(() => (isEdit ? api.put(`/me/beneficiaries/${editing.id}`, body) : api.post('/me/beneficiaries', body))).catch(() => null)
    if (res) onSaved(isEdit ? `${body.name}'s details were updated.` : `${body.name} was added as a beneficiary.`)
  }

  const serverMsg = action.error && (action.error.errors?.map((x) => x.message).join(' ') || action.error.message)

  return (
    <Modal
      open={open}
      onClose={action.pending ? () => {} : onClose}
      title={isEdit ? `Edit ${editing.name}` : 'Add a beneficiary'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
          <Button type="submit" form="ben-form" loading={action.pending}>{isEdit ? 'Save changes' : 'Add beneficiary'}</Button>
        </>
      }
    >
      <form id="ben-form" onSubmit={submit} className="form-grid" noValidate>
        {isEdit ? (
          <div className="span-2 cp-item-meta">Policy {editing.policy.policyNumber} · {editing.policy.policyType?.name}</div>
        ) : (
          <Select
            id="ben-policy" className="span-2" label="Policy" value={form.policyId} onChange={set('policyId')} error={errors.policyId}
            placeholder="Choose an active policy"
            options={policies.map((p) => ({ value: p.id, label: `${p.policyType?.name} · ${p.policyNumber}` }))}
          />
        )}
        <Input id="ben-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" required />
        <Select id="ben-rel" label="Relationship to you" value={form.relationship} onChange={set('relationship')} error={errors.relationship}
          placeholder="Choose" options={RELATIONSHIPS.includes(form.relationship) || !form.relationship ? RELATIONSHIPS : [form.relationship, ...RELATIONSHIPS]} />
        <Input
          id="ben-pct" label="Share of the benefit (%)" type="number" min="1" max="100" step="0.01" inputMode="decimal"
          value={form.allocationPercentage} onChange={set('allocationPercentage')} error={errors.allocationPercentage}
          hint={policyId ? `${available}% available on this policy` : 'Choose a policy first'} required
        />
        <Input id="ben-dob" label="Date of birth (optional)" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} />
        <Input id="ben-phone" label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Input id="ben-email" label="Email (optional)" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <p className="span-2 field-help" style={{ margin: 0 }}>All beneficiaries on a policy together can receive at most 100% of the benefit.</p>
        {serverMsg && <div className="span-2"><Notice tone="error">{serverMsg}</Notice></div>}
      </form>
    </Modal>
  )
}

// Customers manage nominees on their own active policies. The server enforces ownership,
// policy status and the 100% allocation limit.
export default function CustomerBeneficiaries() {
  const bens = useApi('/me/beneficiaries')
  const pols = useApi('/me/policies', { limit: 100 })
  const [modal, setModal] = useState(null) // { editing?, policyId? }
  const [removing, setRemoving] = useState(null)
  const [flash, setFlash] = useState('')
  const remove = useAction()

  const activePolicies = useMemo(() => (pols.data || []).filter((p) => p.status === 'ACTIVE'), [pols.data])
  const allocatedByPolicy = useMemo(() => {
    const m = new Map()
    for (const b of bens.data || []) m.set(b.policy.id, round2((m.get(b.policy.id) || 0) + Number(b.allocationPercentage)))
    return m
  }, [bens.data])

  // Group by policy; include active policies with no beneficiaries so the customer can add one
  const groups = useMemo(() => {
    const g = new Map()
    for (const b of bens.data || []) {
      if (!g.has(b.policy.id)) g.set(b.policy.id, { policy: b.policy, items: [] })
      g.get(b.policy.id).items.push(b)
    }
    for (const p of activePolicies) if (!g.has(p.id)) g.set(p.id, { policy: { id: p.id, policyNumber: p.policyNumber, status: p.status, policyType: p.policyType }, items: [] })
    return [...g.values()]
  }, [bens.data, activePolicies])

  function saved(msg) {
    setModal(null)
    setFlash(msg)
    bens.reload()
  }

  async function confirmRemove() {
    const b = removing
    const ok = await remove.run(() => api.delete(`/me/beneficiaries/${b.id}`)).catch(() => null)
    if (ok) {
      setRemoving(null)
      setFlash(`${b.name} was removed as a beneficiary.`)
      bens.reload()
    }
  }

  const loading = bens.loading || pols.loading
  const canAdd = activePolicies.some((p) => (allocatedByPolicy.get(p.id) || 0) < 100)

  return (
    <div className="px-page" style={{ maxWidth: 880 }}>
      <PageHead
        title="Beneficiaries"
        sub="The people who receive the benefit under each of your policies. You can change them at any time while a policy is active."
        actions={activePolicies.length > 0 && (
          <Button icon={Plus} onClick={() => { setFlash(''); setModal({}) }} disabled={!canAdd} title={canAdd ? undefined : 'Every active policy is already 100% allocated'}>
            Add beneficiary
          </Button>
        )}
      />
      <div className="cp-stack">
        {flash && <Notice tone="ok">{flash}</Notice>}
        <DataState
          loading={loading}
          error={bens.error || pols.error}
          onRetry={() => { bens.reload(); pols.reload() }}
          empty={groups.length === 0}
          emptyText="You don't have an active policy yet. Beneficiaries can be added once a policy is issued."
        >
          {groups.map((g) => {
            const total = allocatedByPolicy.get(g.policy.id) || 0
            const editable = g.policy.status === 'ACTIVE'
            return (
              <Panel
                key={g.policy.id}
                flush
                title={`${g.policy.policyType?.name} · ${g.policy.policyNumber}`}
                action={<Link to={`/user/policies/${g.policy.id}`} className="panel-link">View policy</Link>}
              >
                <div className="cp-alloc">
                  <div className="cp-alloc-row">
                    <span><strong>{total}%</strong> of 100% allocated</span>
                    <span>{total >= 100 ? 'Fully allocated' : `${round2(100 - total)}% unallocated`}</span>
                  </div>
                  <div className={`meter ${total >= 100 ? 'full' : ''}`} role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={100} aria-label="Benefit allocated">
                    <span style={{ width: `${Math.min(100, total)}%` }} />
                  </div>
                  {!editable && <div className="cp-item-meta">This policy is <StatusBadge status={g.policy.status} />; beneficiaries can no longer be changed.</div>}
                </div>
                {g.items.length === 0 ? (
                  <div className="cp-item">
                    <div className="cp-item-main"><div className="cp-item-meta">No beneficiaries yet. If none are named, the benefit is paid according to the policy terms.</div></div>
                    {editable && <Button size="sm" variant="secondary" icon={Plus} onClick={() => { setFlash(''); setModal({ policyId: g.policy.id }) }}>Add</Button>}
                  </div>
                ) : g.items.map((b) => (
                  <div key={b.id} className="cp-item">
                    <div className="cp-item-main">
                      <div className="cp-item-title">{b.name}</div>
                      <div className="cp-item-meta">
                        {b.relationship}{b.dateOfBirth ? ` · born ${date(b.dateOfBirth)}` : ''}{b.phone ? ` · ${b.phone}` : ''}{b.email ? ` · ${b.email}` : ''}
                      </div>
                    </div>
                    <div className="cp-item-end">
                      <span className="cp-amount">{Number(b.allocationPercentage)}%</span>
                      {editable && (
                        <div className="cp-ben-actions">
                          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => { setFlash(''); setModal({ editing: b }) }} aria-label={`Edit ${b.name}`}>Edit</Button>
                          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { setFlash(''); remove.setError(null); setRemoving(b) }} aria-label={`Remove ${b.name}`} style={{ color: '#B91C1C' }}>Remove</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Panel>
            )
          })}
        </DataState>
      </div>

      <BeneficiaryModal
        open={Boolean(modal)}
        editing={modal?.editing}
        presetPolicyId={modal?.policyId}
        policies={activePolicies}
        allocatedByPolicy={allocatedByPolicy}
        onClose={() => setModal(null)}
        onSaved={saved}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name || ''}?`}
        confirmLabel="Remove beneficiary"
        danger
        pending={remove.pending}
        error={remove.error}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
      >
        Their {removing ? Number(removing.allocationPercentage) : 0}% share on policy {removing?.policy.policyNumber} will become unallocated until you add someone else.
      </ConfirmDialog>
    </div>
  )
}
