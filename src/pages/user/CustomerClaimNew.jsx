import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { inr, date } from '../../lib/format'
import { PageHead, Panel, Notice, DataState, Facts } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { UploadDocumentModal } from './CustomerDocuments'
import '../../styles/user.css'

const CLAIM_TYPES = ['Hospitalisation', 'Accident', 'Death', 'Critical illness', 'Vehicle damage', 'Theft', 'Property damage', 'Other']
const today = () => new Date().toISOString().slice(0, 10)

export default function CustomerClaimNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: policies, loading, error, reload } = useApi('/me/policies', { status: 'ACTIVE', limit: 50 })
  const [form, setForm] = useState({ policyId: params.get('policy') || '', claimType: '', claimDate: '', claimedAmount: '', incidentDescription: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploads, setUploads] = useState([])

  const policy = useMemo(() => policies?.find((p) => p.id === form.policyId), [policies, form.policyId])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function validate() {
    const e = {}
    if (!policy) e.policyId = 'Choose the policy you are claiming under.'
    if (!form.claimType) e.claimType = 'Choose a claim type.'
    if (!form.claimDate) e.claimDate = 'Enter the date of the incident.'
    else if (form.claimDate > today()) e.claimDate = 'The incident date cannot be in the future.'
    else if (policy && (form.claimDate < policy.startDate.slice(0, 10) || form.claimDate > policy.expiryDate.slice(0, 10))) {
      e.claimDate = `The incident must fall within the policy period (${date(policy.startDate)} – ${date(policy.expiryDate)}).`
    }
    const amt = Number(form.claimedAmount)
    if (!amt || amt <= 0) e.claimedAmount = 'Enter the amount you are claiming.'
    else if (policy && amt > Number(policy.sumAssured)) e.claimedAmount = `This exceeds your sum assured of ${inr(policy.sumAssured)}.`
    if (form.incidentDescription.trim().length < 10) e.incidentDescription = 'Please describe what happened (at least 10 characters).'
    return e
  }

  async function submit(e) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length) return
    setPending(true)
    setServerError(null)
    try {
      const res = await api.post('/me/claims', {
        policyId: form.policyId,
        claimType: form.claimType,
        claimDate: form.claimDate,
        claimedAmount: Number(form.claimedAmount),
        incidentDescription: form.incidentDescription.trim(),
      })
      setCreated(res.data.data)
    } catch (err) {
      setServerError(err)
    } finally {
      setPending(false)
    }
  }

  if (created) {
    return (
      <div className="px-page" style={{ maxWidth: 720 }}>
        <PageHead eyebrow={created.claimNumber} title="Claim submitted" sub="We've registered your claim and will notify you as it moves through review." />
        <div className="cp-stack">
          <Notice tone="ok">
            Claim <strong>{created.claimNumber}</strong> is now awaiting review. Adding supporting documents (bills, reports, photos) helps us assess it faster.
          </Notice>
          <Panel
            flush
            title="Supporting documents"
            action={<Button size="sm" variant="secondary" icon={Upload} onClick={() => setUploadOpen(true)}>Upload</Button>}
          >
            {uploads.length === 0 ? (
              <p className="muted" style={{ padding: 18, margin: 0 }}>No documents added yet. You can also add them later from the claim page.</p>
            ) : (
              <div>
                {uploads.map((d) => (
                  <div key={d.id} className="cp-item">
                    <CheckCircle2 size={18} aria-hidden="true" style={{ color: 'var(--status-green-text)' }} />
                    <div className="cp-item-main"><div className="cp-item-title">{d.name}</div><div className="cp-item-meta">{d.documentType} · awaiting verification</div></div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Link to="/user/claims" className="btn btn-secondary">All claims</Link>
            <Button onClick={() => navigate(`/user/claims/${created.id}`)}>Track this claim</Button>
          </div>
        </div>
        <UploadDocumentModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={(doc) => { setUploadOpen(false); setUploads((u) => [...u, doc]) }}
          fixedClaim={{ id: created.id, claimNumber: created.claimNumber, policyId: form.policyId }}
          defaultType="Claim evidence"
        />
      </div>
    )
  }

  return (
    <div className="px-page" style={{ maxWidth: 760 }}>
      <Link to="/user/claims" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} aria-hidden="true" /> Claims</Link>
      <PageHead title="File a claim" sub="Tell us what happened. Claims can be filed against active policies for incidents within the policy period." />
      <DataState loading={loading} error={error} onRetry={reload} empty={policies?.length === 0} emptyText="You don't have an active policy to claim against. Once a policy is issued, you can file claims here.">
        <form onSubmit={submit} noValidate className="cp-stack">
          <Panel title="Policy">
            <Select
              label="Policy"
              id="claim-policy"
              value={form.policyId}
              onChange={set('policyId')}
              error={errors.policyId}
              placeholder="Select an active policy"
              options={(policies || []).map((p) => ({ value: p.id, label: `${p.policyType?.name} · ${p.policyNumber}` }))}
            />
            {policy && (
              <div style={{ marginTop: 14 }}>
                <Facts items={[
                  ['Sum assured', inr(policy.sumAssured)],
                  ['Policy period', `${date(policy.startDate)} – ${date(policy.expiryDate)}`],
                ]} />
              </div>
            )}
          </Panel>

          <Panel title="Incident">
            <div className="form-grid">
              <Select label="Claim type" id="claim-type" value={form.claimType} onChange={set('claimType')} error={errors.claimType} placeholder="Select type" options={CLAIM_TYPES} />
              <Input label="Date of incident" id="claim-date" type="date" max={today()} value={form.claimDate} onChange={set('claimDate')} error={errors.claimDate} />
              <Input
                label="Amount claimed (₹)"
                id="claim-amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={form.claimedAmount}
                onChange={set('claimedAmount')}
                error={errors.claimedAmount}
                hint={policy ? `Up to ${inr(policy.sumAssured)}` : undefined}
              />
              <div className="span-2">
                <label htmlFor="claim-desc" className="input-label">What happened?</label>
                <textarea
                  id="claim-desc"
                  className={`input ${errors.incidentDescription ? 'error' : ''}`}
                  value={form.incidentDescription}
                  onChange={set('incidentDescription')}
                  maxLength={5000}
                  aria-invalid={!!errors.incidentDescription}
                  aria-describedby="claim-desc-help"
                />
                <p id="claim-desc-help" className={errors.incidentDescription ? 'input-error-msg' : 'field-help'} role={errors.incidentDescription ? 'alert' : undefined}>
                  {errors.incidentDescription || 'Include where and how it happened, and any reference numbers (hospital, police, garage).'}
                </p>
              </div>
            </div>
          </Panel>

          {serverError && <Notice tone="error">{serverError.message}</Notice>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Link to="/user/claims" className="btn btn-secondary">Cancel</Link>
            <Button type="submit" loading={pending}>Submit claim</Button>
          </div>
        </form>
      </DataState>
    </div>
  )
}
