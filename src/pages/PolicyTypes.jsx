import { useEffect, useState } from 'react'
import { FilePlus2, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Segmented, Notice, ConfirmDialog } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'

const EMPTY = { typeCode: '', name: '', description: '', coverageDetails: '', eligibility: '', terms: '', status: 'ACTIVE' }
const TEXT_FIELDS = [
  ['description', 'Description', 'What the plan is for, shown to customers.'],
  ['coverageDetails', 'Coverage details', 'What is and is not covered.'],
  ['eligibility', 'Eligibility', 'Who may apply (age, income, health, etc.).'],
  ['terms', 'Terms & conditions', 'Waiting periods, exclusions, renewal terms.'],
]

// Mirrors server policyTypeSchema.
function validate(f) {
  const e = {}
  if (f.typeCode.trim().length < 2) e.typeCode = 'At least 2 characters.'
  if (f.name.trim().length < 2) e.name = 'Required.'
  for (const [k] of TEXT_FIELDS) if (f[k].trim().length < 5) e[k] = 'At least 5 characters.'
  return e
}

function PolicyTypeModal({ open, type, onClose, onSaved }) {
  const isEdit = Boolean(type)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()

  useEffect(() => {
    if (open) {
      setF(type ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, type[k] ?? ''])) : EMPTY)
      setErrors({})
      action.setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type])

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]))
    payload.typeCode = payload.typeCode.toUpperCase()
    try {
      const res = await action.run(() => (isEdit ? api.put(`/policy-types/${type.id}`, payload) : api.post('/policy-types', payload)))
      onSaved(res.data.data)
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  return (
    <Modal open={open} onClose={action.pending ? () => {} : onClose} title={isEdit ? `Edit ${type.name}` : 'New policy type'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button><Button type="submit" form="pt-form" loading={action.pending}>{isEdit ? 'Save changes' : 'Create policy type'}</Button></>}>
      <form id="pt-form" className="form-grid" onSubmit={submit} noValidate>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.message}</Notice></div>}
        <Input id="pt-code" label="Type code" value={f.typeCode} onChange={set('typeCode')} error={errors.typeCode} hint="Short unique code, e.g. HLTH" required />
        <Input id="pt-name" label="Name" value={f.name} onChange={set('name')} error={errors.name} required />
        {TEXT_FIELDS.map(([k, label, help]) => (
          <div key={k} className="span-2">
            <label className="input-label" htmlFor={`pt-${k}`}>{label}</label>
            <textarea id={`pt-${k}`} className={`input ${errors[k] ? 'error' : ''}`} value={f[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={`pt-${k}-help`} />
            <p id={`pt-${k}-help`} className={errors[k] ? 'input-error-msg' : 'field-help'}>{errors[k] || help}</p>
          </div>
        ))}
        <Select id="pt-status" label="Status" value={f.status} onChange={set('status')}
          options={[{ value: 'ACTIVE', label: 'Active — open for applications' }, { value: 'INACTIVE', label: 'Inactive — hidden from customers' }]} />
      </form>
    </Modal>
  )
}

export default function PolicyTypes() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useApi('/policy-types', { status: status || undefined })
  const [editing, setEditing] = useState(undefined)
  const [deleting, setDeleting] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [message, setMessage] = useState('')
  const del = useAction()

  async function doDelete() {
    await del.run(() => api.delete(`/policy-types/${deleting.id}`))
    setMessage(`${deleting.name} deleted.`)
    setDeleting(null)
    reload()
  }

  return (
    <div>
      <PageHeader title="Policy types" subtitle="The product catalogue. Active types are shown to customers and agents when applying."
        actions={<Button icon={FilePlus2} onClick={() => setEditing(null)}>New policy type</Button>} />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush title={data ? `${data.length} policy type${data.length === 1 ? '' : 's'}` : 'Policy types'}
        action={<Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />}>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No policy types.">
          <ul className="rows">
            {data?.map((t) => {
              const open = expanded === t.id
              return (
                <li key={t.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div className="row" style={{ borderTop: 0, flexWrap: 'wrap' }}>
                    <div className="row-main">
                      <div className="row-title">{t.name} <span className="mono" style={{ marginLeft: 6 }}>{t.typeCode}</span></div>
                      <div className="row-meta" style={{ whiteSpace: 'normal' }}>{t.description}</div>
                    </div>
                    <div className="row-end" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="muted" style={{ fontSize: 12.5 }}>{t._count.policies} policies · {t._count.applications} applications</span>
                      <StatusBadge status={t.status} />
                      <Button size="sm" variant="ghost" icon={open ? ChevronUp : ChevronDown} aria-expanded={open} aria-controls={`pt-detail-${t.id}`} onClick={() => setExpanded(open ? null : t.id)}>Details</Button>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(t)}>Edit</Button>
                      <Button size="sm" variant="ghost" icon={Trash2} style={{ color: '#B91C1C' }} onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`} />
                    </div>
                  </div>
                  {open && (
                    <div id={`pt-detail-${t.id}`} className="px-grid cols-3" style={{ padding: '0 18px 16px', fontSize: 13, lineHeight: 1.55 }}>
                      {TEXT_FIELDS.slice(1).map(([k, label]) => (
                        <div key={k}><div className="kpi-label" style={{ marginBottom: 4 }}>{label}</div><div style={{ whiteSpace: 'pre-line' }}>{t[k]}</div></div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </DataState>
      </Panel>

      <PolicyTypeModal open={editing !== undefined} type={editing || null} onClose={() => setEditing(undefined)}
        onSaved={(t) => { setMessage(`${t.name} ${editing ? 'updated' : 'created'}.`); setEditing(undefined); reload() }} />
      <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name || ''}?`} confirmLabel="Delete permanently" danger
        pending={del.pending} error={del.error} onClose={() => { setDeleting(null); del.setError(null) }} onConfirm={doDelete}>
        {deleting && (deleting._count.policies || deleting._count.applications)
          ? <>This type is referenced by {deleting._count.policies} policies and {deleting._count.applications} applications, so the server will refuse to delete it. Set it to Inactive instead to stop new applications.</>
          : <>This permanently removes the policy type from the catalogue. This cannot be undone.</>}
      </ConfirmDialog>
    </div>
  )
}
