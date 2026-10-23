import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { inr } from '../../lib/format'
import { PageHead, Panel, Notice, DataState } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import '../../styles/user.css'

const EMPLOYMENT = ['Salaried', 'Self-employed', 'Business owner', 'Retired', 'Student', 'Homemaker', 'Not employed']
const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

export default function CustomerApply() {
  const { policyTypeId } = useParams()
  const navigate = useNavigate()
  const { data: plan, loading, error, reload } = useApi(`/catalog/policy-types/${policyTypeId}`)
  const [form, setForm] = useState({ requestedCoverage: '', annualIncome: '', employmentStatus: '', nomineeName: '', nomineeRelation: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)
  const [agree, setAgree] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = {}
    const cover = Number(form.requestedCoverage)
    if (!cover || cover <= 0) v.requestedCoverage = 'Enter the cover amount you need.'
    else if (cover > 1_000_000_000) v.requestedCoverage = 'Cover above ₹100 crore needs to be arranged with an agent.'
    if (form.annualIncome !== '' && !(Number(form.annualIncome) > 0)) v.annualIncome = 'Enter a positive amount or leave blank.'
    if (form.nomineeName.trim() && !form.nomineeRelation) v.nomineeRelation = 'Select the nominee relationship.'
    if (!agree) v.agree = 'Please confirm the information is accurate.'
    setErrors(v)
    if (Object.keys(v).length) return

    const payload = { policyTypeId, requestedCoverage: cover }
    if (form.annualIncome) payload.annualIncome = Number(form.annualIncome)
    if (form.employmentStatus) payload.employmentStatus = form.employmentStatus
    if (form.nomineeName.trim()) payload.nomineeName = form.nomineeName.trim()
    if (form.nomineeRelation) payload.nomineeRelation = form.nomineeRelation

    setPending(true)
    setServerError(null)
    try {
      const res = await api.post('/me/applications', payload)
      navigate(`/user/applications/${res.data.data.id}`, { replace: true })
    } catch (err) {
      setServerError(err)
    } finally {
      setPending(false)
    }
  }

  const estimate = Number(form.requestedCoverage) > 0 ? Number(form.requestedCoverage) * 0.015 : null

  return (
    <div className="px-page" style={{ maxWidth: 820 }}>
      <Link to="/user/plans" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} aria-hidden="true" /> All plans</Link>
      <DataState loading={loading} error={error} onRetry={reload}>
        {plan && (
          <>
            <PageHead eyebrow="New application" title={plan.name} sub={plan.description} />
            <form onSubmit={submit} noValidate className="cp-stack">
              <Panel title="Before you apply">
                <p className="muted" style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Who can apply</p>
                <p className="muted" style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{plan.eligibility}</p>
              </Panel>

              <Panel title="Cover you need">
                <div className="form-grid">
                  <Input
                    label="Cover amount (₹)"
                    id="apply-cover"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.requestedCoverage}
                    onChange={set('requestedCoverage')}
                    error={errors.requestedCoverage}
                    hint={estimate ? `Indicative premium about ${inr(estimate)} a year. Final premium is set at approval.` : 'The sum assured you would like on the policy.'}
                  />
                  <Input label="Annual income (₹, optional)" id="apply-income" type="number" inputMode="numeric" min="1" value={form.annualIncome} onChange={set('annualIncome')} error={errors.annualIncome} />
                  <Select label="Employment (optional)" id="apply-emp" value={form.employmentStatus} onChange={set('employmentStatus')} options={[{ value: '', label: 'Prefer not to say' }, ...EMPLOYMENT]} />
                </div>
              </Panel>

              <Panel title="Nominee" note="Optional. Who should receive the benefit if something happens to you.">
                <div className="form-grid">
                  <Input label="Nominee name" id="apply-nominee" value={form.nomineeName} onChange={set('nomineeName')} maxLength={120} />
                  <Select label="Relationship" id="apply-rel" value={form.nomineeRelation} onChange={set('nomineeRelation')} error={errors.nomineeRelation} options={[{ value: '', label: 'Select' }, ...RELATIONS]} />
                </div>
              </Panel>

              <div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16 }} aria-describedby={errors.agree ? 'apply-agree-err' : undefined} />
                  <span>I confirm the information above is accurate, and I have read the plan's coverage and terms.</span>
                </label>
                {errors.agree && <p id="apply-agree-err" className="input-error-msg" role="alert">{errors.agree}</p>}
              </div>

              {serverError && <Notice tone="error">{serverError.message}</Notice>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Link to="/user/plans" className="btn btn-secondary">Cancel</Link>
                <Button type="submit" loading={pending}>Submit application</Button>
              </div>
            </form>
          </>
        )}
      </DataState>
    </div>
  )
}
