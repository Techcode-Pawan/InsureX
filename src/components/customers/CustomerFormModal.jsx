import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Notice } from '../panel'
import api from '../../services/apiClient'

// Mirrors server customerSchema (server/src/validators/schemas.js).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID']
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const EMPTY = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '', email: '', phone: '',
  address: '', city: '', state: '', postalCode: '', idProofType: '', idLast4: '', status: 'ACTIVE',
}

function fromCustomer(c) {
  if (!c) return EMPTY
  return {
    firstName: c.firstName || '', lastName: c.lastName || '',
    dateOfBirth: c.dateOfBirth ? String(c.dateOfBirth).slice(0, 10) : '',
    gender: c.gender || '', email: c.email || '', phone: c.phone || '', address: c.address || '',
    city: c.city || '', state: c.state || '', postalCode: c.postalCode || '',
    idProofType: c.idProofType || '', idLast4: (c.maskedIdProofNumber || '').slice(-4), status: c.status || 'ACTIVE',
  }
}

function validate(f) {
  const e = {}
  if (!f.firstName.trim()) e.firstName = 'Required.'
  if (!f.lastName.trim()) e.lastName = 'Required.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dateOfBirth)) e.dateOfBirth = 'Required.'
  else if (new Date(f.dateOfBirth) > new Date()) e.dateOfBirth = 'Cannot be in the future.'
  if (!f.gender) e.gender = 'Required.'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email.'
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'At least 10 digits.'
  if (!f.address.trim()) e.address = 'Required.'
  if (!f.city.trim()) e.city = 'Required.'
  if (!f.state.trim()) e.state = 'Required.'
  if (f.postalCode.trim().length < 4) e.postalCode = 'Enter a valid postal code.'
  if (!f.idProofType) e.idProofType = 'Required.'
  if (!/^[A-Za-z0-9]{4}$/.test(f.idLast4)) e.idLast4 = 'Exactly the last 4 characters.'
  return e
}

/** Create (customer = null) or edit an existing customer. Calls onSaved(savedCustomer). */
export default function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const isEdit = Boolean(customer)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setF(fromCustomer(customer))
      setErrors({})
      setServerError(null)
    }
  }, [open, customer])

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const { idLast4, ...rest } = f
    const payload = {
      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
      maskedIdProofNumber: `XXXX-XXXX-${idLast4.toUpperCase()}`,
    }
    setPending(true)
    setServerError(null)
    try {
      const res = isEdit ? await api.put(`/customers/${customer.id}`, payload) : await api.post('/customers', payload)
      onSaved(res.data.data)
    } catch (err) {
      setServerError(err)
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={isEdit ? `Edit ${customer.customerNumber}` : 'Register customer'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="customer-form" loading={pending}>{isEdit ? 'Save changes' : 'Register customer'}</Button>
        </>
      }
    >
      <form id="customer-form" className="form-grid" onSubmit={submit} noValidate>
        {serverError && <div className="span-2"><Notice tone="error">{serverError.message}</Notice></div>}
        <Input id="cf-first" label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} required />
        <Input id="cf-last" label="Last name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} required />
        <Input id="cf-dob" label="Date of birth" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} required />
        <Select id="cf-gender" label="Gender" value={f.gender} onChange={set('gender')} placeholder="Select" options={GENDERS} error={errors.gender} required />
        <Input id="cf-email" label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} required />
        <Input id="cf-phone" label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} required />
        <Input id="cf-address" className="span-2" label="Address" value={f.address} onChange={set('address')} error={errors.address} required />
        <Input id="cf-city" label="City" value={f.city} onChange={set('city')} error={errors.city} required />
        <Input id="cf-state" label="State" value={f.state} onChange={set('state')} error={errors.state} required />
        <Input id="cf-postal" label="Postal code" value={f.postalCode} onChange={set('postalCode')} error={errors.postalCode} required />
        <Select id="cf-status" label="Status" value={f.status} onChange={set('status')} options={STATUSES} />
        <Select id="cf-idtype" label="ID proof type" value={f.idProofType} onChange={set('idProofType')} placeholder="Select" options={ID_TYPES} error={errors.idProofType} required />
        <Input id="cf-idlast4" label="ID number — last 4 characters" maxLength={4} value={f.idLast4} onChange={set('idLast4')} error={errors.idLast4}
          hint="Only the last 4 characters are stored. Never record the full ID number." required />
        {isEdit && customer.userId && (
          <div className="span-2"><Notice tone="warn">This customer has a portal login. Changing the email here does not change their sign-in email.</Notice></div>
        )}
      </form>
    </Modal>
  )
}
