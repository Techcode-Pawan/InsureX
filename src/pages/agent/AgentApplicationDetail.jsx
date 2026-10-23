import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const EMPLOYMENT = ['Salaried', 'Self-employed', 'Business owner', 'Retired', 'Student', 'Homemaker', 'Other']

// Edits a PENDING application before underwriting decides (server: PATCH /agent/applications/:id).
function EditApplicationModal({ app, open, onClose, onSaved }) {
  const initial = {
    requestedCoverage: String(Number(app.requestedCoverage)),
    annualIncome: app.annualIncome ? String(Number(app.annualIncome)) : '',
    employmentStatus: app.employmentStatus || '',
    nomineeName: app.nomineeName || '',
    nomineeRelation: app.nomineeRelation || '',
    notes: app.notes || '',
  }
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const action = useAction()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    const cover = Number(form.requestedCoverage)
    if (!(cover > 0)) errs.requestedCoverage = 'Enter a cover amount greater than zero.'
    else if (cover > 1_000_000_000) errs.requestedCoverage = 'Cover cannot exceed ₹100 crore.'
    if (form.annualIncome && !(Number(form.annualIncome) > 0)) errs.annualIncome = 'Income must be a positive amount, or leave it blank.'
    if (form.notes.length > 2000) errs.notes = 'Notes must be under 2000 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const patch = {}
    if (cover !== Number(app.requestedCoverage)) patch.requestedCoverage = cover
    const nullable = (v) => (v.trim() === '' ? null : v.trim())
    if (form.annualIncome !== initial.annualIncome) patch.annualIncome = form.annualIncome ? Number(form.annualIncome) : null
    for (const k of ['employmentStatus', 'nomineeName', 'nomineeRelation', 'notes']) {
      if (form[k] !== initial[k]) patch[k] = nullable(form[k])
    }
    if (!Object.keys(patch).length) { onClose(); return }
    try {
      await action.run(() => api.patch(`/agent/applications/${app.id}`, patch))
      onSaved()
    } catch {
      /* shown in modal */
    }
  }

  return (
    <Modal open={open} onClose={action.pending ? () => {} : onClose} title={`Edit ${app.applicationNumber}`} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button type="submit" form="edit-app" loading={action.pending}>Save changes</Button>
      </>
    }>
      <form id="edit-app" onSubmit={submit} noValidate className="form-grid">
        <div className="span-2"><Notice>Only pending applications can be changed. The plan and customer cannot be changed here; withdraw and resubmit if needed.</Notice></div>
        <Input id="ea-cover" label="Cover requested (₹)" type="number" min="1" inputMode="numeric" value={form.requestedCoverage} onChange={set('requestedCoverage')} error={errors.requestedCoverage} />
        <Input id="ea-income" label="Annual income (₹, optional)" type="number" min="1" inputMode="numeric" value={form.annualIncome} onChange={set('annualIncome')} error={errors.annualIncome} />
        <Select id="ea-emp" label="Employment (optional)" value={form.employmentStatus} onChange={set('employmentStatus')}
          options={[{ value: '', label: 'Not specified' }, ...EMPLOYMENT.map((x) => ({ value: x, label: x }))]} />
        <Input id="ea-nominee" label="Nominee name (optional)" value={form.nomineeName} onChange={set('nomineeName')} maxLength={120} />
        <Input id="ea-rel" label="Nominee relationship (optional)" value={form.nomineeRelation} onChange={set('nomineeRelation')} maxLength={60} />
        <div className="span-2">
          <label htmlFor="ea-notes" className="input-label">Notes for the underwriter (optional)</label>
          <textarea id="ea-notes" className="input" maxLength={2000} value={form.notes} onChange={set('notes')} />
          {errors.notes && <p className="input-error-msg" role="alert">{errors.notes}</p>}
        </div>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.errors?.[0]?.message || action.error.message}</Notice></div>}
      </form>
    </Modal>
  )
}

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'PENDING', label: 'Underwriting review' },
  { key: 'DECIDED', label: 'Decision' },
  { key: 'ISSUED', label: 'Policy issued' },
]

function stepFor(app) {
  if (app.status === 'PENDING') return { current: 'PENDING' }
  if (app.status === 'APPROVED') return { current: 'ISSUED' }
  if (app.status === 'REJECTED') return { current: 'DECIDED', failed: true, failedLabel: 'Not approved' }
  return { current: 'DECIDED', failed: true, failedLabel: 'Withdrawn' }
}

export default function AgentApplicationDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { data: a, loading, error, reload } = useApi(`/agent/applications/${id}`)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!a) {
    return (
      <div className="px-page">
        <Link to="/agent/applications" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} /> Applications</Link>
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      </div>
    )
  }

  const s = stepFor(a)

  return (
    <div className="px-page" style={{ maxWidth: 1000 }}>
      <Link to="/agent/applications" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Applications</Link>
      <PageHead
        eyebrow={a.applicationNumber}
        title={`${a.policyType.name} for ${fullName(a.customer)}`}
        sub={`Submitted ${date(a.applicationDate)}${a.reviewDate ? ` · reviewed ${date(a.reviewDate)}` : ''}`}
        actions={
          <>
            <StatusBadge status={a.status} />
            {a.status === 'PENDING' && (
              <Button size="sm" variant="secondary" icon={Pencil} onClick={() => { setSaved(false); setEditing(true) }}>Edit application</Button>
            )}
          </>
        }
      />

      {saved && <Notice tone="ok" style={{ marginBottom: 16 }}>Application updated. The underwriting team sees the new details immediately.</Notice>}
      {editing && (
        <EditApplicationModal
          app={a}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setSaved(true); reload() }}
        />
      )}

      {location.state?.submitted && (
        <Notice tone="ok" style={{ marginBottom: 16 }}>Application submitted. It is now in the underwriting queue and you'll get a notification when it is decided.</Notice>
      )}

      <Panel title="Progress" className="" >
        <Steps steps={STEPS} current={s.current} failed={s.failed} failedLabel={s.failedLabel} />
        {a.status === 'PENDING' && <p className="field-help" style={{ marginTop: 14 }}>Awaiting an underwriting decision from an administrator. No action is needed from you unless documents are requested.</p>}
        {a.status === 'REJECTED' && a.rejectionReason && (
          <div style={{ marginTop: 14 }}><Notice tone="warn"><strong>Reason given:</strong> {a.rejectionReason}</Notice></div>
        )}
        {a.policy && (
          <div style={{ marginTop: 14 }}>
            <Notice tone="ok">
              Policy <Link to={`/agent/policies/${a.policy.id}`} className="table-link">{a.policy.policyNumber}</Link> was issued from this application.
            </Notice>
          </div>
        )}
      </Panel>

      <div className="px-grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Application">
          <Facts items={[
            ['Plan', `${a.policyType.name} (${a.policyType.typeCode})`],
            ['Cover requested', inr(a.requestedCoverage)],
            ['Annual income', a.annualIncome ? inr(a.annualIncome) : '—'],
            ['Employment', a.employmentStatus || '—'],
            ['Nominee', a.nomineeName ? `${a.nomineeName}${a.nomineeRelation ? ` (${a.nomineeRelation})` : ''}` : '—'],
            ['Submitted via', a.assistedByAgent ? `Agent ${fullName(a.assistedByAgent)}` : 'Customer / office'],
          ]} />
        </Panel>
        <Panel title="Customer">
          <Facts items={[
            ['Name', <Link key="n" to={`/agent/customers/${a.customer.id}`} className="table-link">{fullName(a.customer)}</Link>],
            ['Customer number', <span key="c" className="mono">{a.customer.customerNumber}</span>],
            ['Status', titleCase(a.status)],
          ]} />
          {a.notes && (
            <>
              <h3 className="panel-title" style={{ marginTop: 18, fontSize: 13 }}>Notes</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{a.notes}</p>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
