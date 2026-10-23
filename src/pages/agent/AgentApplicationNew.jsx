import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, fullName } from '../../lib/format'
import { PageHead, Panel, Notice, Facts, DataState } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const EMPLOYMENT = ['Salaried', 'Self-employed', 'Business owner', 'Retired', 'Student', 'Homemaker', 'Other']

// Mirrors agentApplicationSchema on the server
function validate(f) {
  const e = {}
  if (!f.customerId) e.customerId = 'Select the customer you are applying for.'
  if (!f.policyTypeId) e.policyTypeId = 'Select a plan.'
  const cover = Number(f.requestedCoverage)
  if (!f.requestedCoverage || !Number.isFinite(cover) || cover <= 0) e.requestedCoverage = 'Enter the cover amount in rupees.'
  else if (cover > 1_000_000_000) e.requestedCoverage = 'Cover cannot exceed ₹100 crore.'
  if (f.annualIncome) {
    const inc = Number(f.annualIncome)
    if (!Number.isFinite(inc) || inc <= 0) e.annualIncome = 'Enter a positive amount or leave blank.'
  }
  if (f.nomineeName.length > 120) e.nomineeName = 'Too long.'
  if (f.notes.length > 2000) e.notes = 'Notes are limited to 2000 characters.'
  return e
}

export default function AgentApplicationNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [customerSearch, setCustomerSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [form, setForm] = useState({
    customerId: params.get('customerId') || '',
    policyTypeId: '',
    requestedCoverage: '',
    annualIncome: '',
    employmentStatus: '',
    nomineeName: '',
    nomineeRelation: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [chosen, setChosen] = useState(null) // keeps the selected customer visible while the list is filtered
  const action = useAction()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(customerSearch.trim()), 250)
    return () => clearTimeout(t)
  }, [customerSearch])

  const customers = useApi('/agent/customers', { limit: 50, status: 'ACTIVE', search: debounced })
  const prefill = useApi(params.get('customerId') ? `/agent/customers/${params.get('customerId')}` : null)
  const plans = useApi('/catalog/policy-types')

  const customerOptions = useMemo(() => {
    const list = customers.data || []
    const opts = list.map((c) => ({ value: c.id, label: `${fullName(c)} · ${c.customerNumber}` }))
    const p = prefill.data
    if (p && !opts.some((o) => o.value === p.id)) opts.unshift({ value: p.id, label: `${fullName(p)} · ${p.customerNumber}` })
    if (chosen && !opts.some((o) => o.value === chosen.value)) opts.unshift(chosen)
    return opts
  }, [customers.data, prefill.data, chosen])

  const plan = plans.data?.find((p) => p.id === form.policyTypeId)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) {
      document.getElementById(`na-${Object.keys(v)[0]}`)?.focus()
      return
    }
    const payload = {
      customerId: form.customerId,
      policyTypeId: form.policyTypeId,
      requestedCoverage: Number(form.requestedCoverage),
      ...(form.annualIncome && { annualIncome: Number(form.annualIncome) }),
      ...(form.employmentStatus && { employmentStatus: form.employmentStatus }),
      ...(form.nomineeName.trim() && { nomineeName: form.nomineeName.trim() }),
      ...(form.nomineeRelation.trim() && { nomineeRelation: form.nomineeRelation.trim() }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    }
    try {
      const res = await action.run(() => api.post('/agent/applications', payload))
      navigate(`/agent/applications/${res.data.data.id}`, { replace: true, state: { submitted: true } })
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  return (
    <div className="px-page" style={{ maxWidth: 960 }}>
      <Link to="/agent/applications" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Applications</Link>
      <PageHead
        eyebrow="Assist a customer"
        title="New application"
        sub="Submit an application on behalf of a customer in your book. It goes to underwriting for review; you'll be notified of the decision."
      />

      <form onSubmit={submit} noValidate className="px-grid">
        <Panel title="1. Customer">
          <div className="form-grid">
            <Input id="na-customer-search" label="Find customer" placeholder="Type a name or number to narrow the list" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
            <Select
              id="na-customerId"
              label="Customer"
              placeholder={customers.loading ? 'Loading your customers…' : 'Select customer'}
              options={customerOptions}
              value={form.customerId}
              onChange={(e) => {
                const opt = customerOptions.find((o) => o.value === e.target.value)
                setChosen(opt || null)
                setForm((f) => ({ ...f, customerId: e.target.value }))
              }}
              error={errors.customerId}
            />
          </div>
          {customers.error && <div style={{ marginTop: 12 }}><Notice tone="error">{customers.error.message}</Notice></div>}
          {!customers.loading && customerOptions.length === 0 && !debounced && (
            <p className="field-help">No active customers in your book. <Link to="/agent/customers/new" className="table-link">Register a customer</Link> first.</p>
          )}
        </Panel>

        <Panel title="2. Plan">
          <DataState loading={plans.loading} error={plans.error} onRetry={plans.reload} empty={plans.data?.length === 0} emptyText="No plans are currently open for applications.">
            <Select
              id="na-policyTypeId"
              label="Plan"
              placeholder="Select plan"
              options={(plans.data || []).map((p) => ({ value: p.id, label: `${p.name} (${p.typeCode})` }))}
              value={form.policyTypeId}
              onChange={set('policyTypeId')}
              error={errors.policyTypeId}
            />
            {plan && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13.5 }}>{plan.description}</p>
                <Facts items={[
                  ['Coverage', plan.coverageDetails],
                  ['Eligibility', plan.eligibility],
                  ['Key terms', plan.terms],
                ]} />
                <p className="field-help" style={{ marginTop: 10 }}>Confirm the customer meets the eligibility criteria before submitting.</p>
              </div>
            )}
          </DataState>
        </Panel>

        <Panel title="3. Cover & applicant details">
          <div className="form-grid">
            <Input id="na-requestedCoverage" label="Cover amount (₹)" type="number" min="1" step="1000" inputMode="numeric" value={form.requestedCoverage} onChange={set('requestedCoverage')} error={errors.requestedCoverage}
              hint={form.requestedCoverage && !errors.requestedCoverage ? inr(form.requestedCoverage) : 'Sum assured requested by the customer'} />
            <Input id="na-annualIncome" label="Annual income (₹, optional)" type="number" min="1" step="1000" inputMode="numeric" value={form.annualIncome} onChange={set('annualIncome')} error={errors.annualIncome} />
            <Select id="na-employmentStatus" label="Employment (optional)" placeholder="Select" options={EMPLOYMENT} value={form.employmentStatus} onChange={set('employmentStatus')} />
            <div />
            <Input id="na-nomineeName" label="Nominee name (optional)" value={form.nomineeName} onChange={set('nomineeName')} error={errors.nomineeName} />
            <Input id="na-nomineeRelation" label="Nominee relationship (optional)" value={form.nomineeRelation} onChange={set('nomineeRelation')} />
            <div className="span-2">
              <label htmlFor="na-notes" className="input-label">Notes for the underwriter (optional)</label>
              <textarea id="na-notes" className="input" value={form.notes} onChange={set('notes')} maxLength={2000} aria-describedby="na-notes-help" />
              <p id="na-notes-help" className="field-help">Relevant context such as existing cover or medical disclosures the customer has made. Visible to administrators.</p>
            </div>
          </div>
        </Panel>

        {action.error && !action.error.errors && <Notice tone="error">{action.error.message}</Notice>}

        <div className="px-actions" style={{ justifyContent: 'flex-end' }}>
          <Link to="/agent/applications" className="btn btn-secondary">Cancel</Link>
          <Button type="submit" loading={action.pending}>Submit for review</Button>
        </div>
      </form>
    </div>
  )
}
