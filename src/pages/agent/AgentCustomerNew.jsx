import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../../services/apiClient'
import { useAction } from '../../lib/useApi'
import { PageHead, Panel, Notice } from '../../components/panel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const EMPTY = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '', email: '', phone: '',
  address: '', city: '', state: '', postalCode: '', idProofType: '', idProofLast4: '',
}

const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving Licence']
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']

// Mirrors agentCustomerCreateSchema on the server
function validate(f) {
  const e = {}
  if (!f.firstName.trim()) e.firstName = 'First name is required.'
  if (!f.lastName.trim()) e.lastName = 'Last name is required.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dateOfBirth)) e.dateOfBirth = 'Enter the date of birth.'
  else {
    const age = (Date.now() - new Date(f.dateOfBirth).getTime()) / (365.25 * 86400000)
    if (age < 18 || age > 100) e.dateOfBirth = 'Policyholders must be between 18 and 100 years old.'
  }
  if (!f.gender) e.gender = 'Select a gender.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (f.phone.trim().length < 10 || f.phone.trim().length > 20) e.phone = 'Enter a phone number of 10–20 characters.'
  if (!f.address.trim()) e.address = 'Address is required.'
  if (!f.city.trim()) e.city = 'City is required.'
  if (!f.state.trim()) e.state = 'State is required.'
  if (f.postalCode.trim().length < 4 || f.postalCode.trim().length > 12) e.postalCode = 'Enter a valid postal code.'
  if (!f.idProofType) e.idProofType = 'Select the ID document type.'
  if (!/^[A-Za-z0-9]{4}$/.test(f.idProofLast4.trim())) e.idProofLast4 = 'Enter exactly the last 4 letters or digits.'
  return e
}

export default function AgentCustomerNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()
  const [maxDob] = useState(() => new Date().toISOString().slice(0, 10))

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const field = (k, label, props = {}) => (
    <Input id={`nc-${k}`} label={label} value={form[k]} onChange={set(k)} error={errors[k]} {...props} />
  )

  async function submit(e) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) {
      document.getElementById(`nc-${Object.keys(v)[0]}`)?.focus()
      return
    }
    const payload = Object.fromEntries(Object.entries(form).map(([k, val]) => [k, val.trim()]))
    try {
      const res = await action.run(() => api.post('/agent/customers', payload))
      navigate(`/agent/customers/${res.data.data.id}`, { replace: true })
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  return (
    <div className="px-page" style={{ maxWidth: 860 }}>
      <Link to="/agent/customers" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Customers</Link>
      <PageHead
        eyebrow="My book"
        title="Register a customer"
        sub="The customer will be added to your book. They can later create their own portal login; an administrator links it after verifying their identity."
      />
      <form onSubmit={submit} noValidate className="px-grid">
        <Panel title="Personal details">
          <div className="form-grid">
            {field('firstName', 'First name', { autoComplete: 'off' })}
            {field('lastName', 'Last name', { autoComplete: 'off' })}
            {field('dateOfBirth', 'Date of birth', { type: 'date', max: maxDob })}
            <Select id="nc-gender" label="Gender" placeholder="Select" options={GENDERS} value={form.gender} onChange={set('gender')} error={errors.gender} />
          </div>
        </Panel>

        <Panel title="Contact">
          <div className="form-grid">
            {field('email', 'Email', { type: 'email', inputMode: 'email' })}
            {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', placeholder: '+91 98xxx xxxxx' })}
            {field('address', 'Address', { className: 'span-2' })}
            {field('city', 'City')}
            {field('state', 'State')}
            {field('postalCode', 'Postal code', { inputMode: 'numeric' })}
          </div>
        </Panel>

        <Panel title="Identity document">
          <div className="form-grid">
            <Select id="nc-idProofType" label="ID document type" placeholder="Select" options={ID_TYPES} value={form.idProofType} onChange={set('idProofType')} error={errors.idProofType} />
            {field('idProofLast4', 'Last 4 characters of ID number', { maxLength: 4, autoComplete: 'off', hint: 'Only the last 4 characters are stored, masked as XXXX-XXXX-1234. Never record the full ID number here.' })}
          </div>
        </Panel>

        {action.error && !action.error.errors && <Notice tone="error">{action.error.message}</Notice>}

        <div className="px-actions" style={{ justifyContent: 'flex-end' }}>
          <Link to="/agent/customers" className="btn btn-secondary">Cancel</Link>
          <Button type="submit" loading={action.pending}>Register customer</Button>
        </div>
      </form>
    </div>
  )
}
