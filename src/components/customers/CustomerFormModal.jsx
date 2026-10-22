import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// ── Validation helpers ─────────────────────────────────────────
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE   = /^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/
const POSTAL_RE  = /^\d{6}$/
const DOB_MAX    = new Date()

function validate(fields) {
  const e = {}
  if (!fields.firstName?.trim())  e.firstName  = 'First name is required.'
  if (!fields.lastName?.trim())   e.lastName   = 'Last name is required.'
  if (!fields.dateOfBirth)        e.dateOfBirth = 'Date of birth is required.'
  else if (new Date(fields.dateOfBirth) > DOB_MAX) e.dateOfBirth = 'Date of birth cannot be in the future.'
  if (!fields.gender)             e.gender     = 'Please select a gender.'
  if (!fields.email?.trim())      e.email      = 'Email is required.'
  else if (!EMAIL_RE.test(fields.email)) e.email = 'Enter a valid email address.'
  if (!fields.phone?.trim())      e.phone      = 'Phone number is required.'
  else if (!PHONE_RE.test(fields.phone)) e.phone = 'Enter a valid Indian mobile number (e.g. +91 98201 34567).'
  if (!fields.address?.trim())    e.address    = 'Address is required.'
  if (!fields.city?.trim())       e.city       = 'City is required.'
  if (!fields.state?.trim())      e.state      = 'State is required.'
  if (!fields.postalCode?.trim()) e.postalCode = 'Postal code is required.'
  else if (!POSTAL_RE.test(fields.postalCode)) e.postalCode = 'Enter a valid 6-digit postal code.'
  if (!fields.idProofType)        e.idProofType = 'ID proof type is required.'
  if (!fields.maskedIdProofNumber?.trim()) e.maskedIdProofNumber = 'ID proof number is required.'
  return e
}

const EMPTY_FORM = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  email: '', phone: '', address: '', city: '', state: '', postalCode: '',
  idProofType: '', maskedIdProofNumber: '', status: 'active',
}

const GENDER_OPTIONS   = ['Male', 'Female', 'Other', 'Prefer not to say']
const ID_PROOF_OPTIONS = ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Other']
const STATUS_OPTIONS   = [
  { value: 'active',               label: 'Active' },
  { value: 'inactive',             label: 'Inactive' },
  { value: 'pending_verification', label: 'Pending Verification' },
]
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
]

// ── Shared field renderer ──────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#172033', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p role="alert" style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>}
    </div>
  )
}

function Inp({ error, ...props }) {
  return (
    <input
      className={`input${error ? ' error' : ''}`}
      style={{ height: 38, fontSize: 13 }}
      {...props}
    />
  )
}

function Sel({ error, children, ...props }) {
  return (
    <select
      className={`select${error ? ' error' : ''}`}
      style={{ height: 38, fontSize: 13 }}
      {...props}
    >
      {children}
    </select>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: '#168BFF', padding: '4px 0', borderBottom: '1px solid #EFF6FF', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ── CustomerFormModal ─────────────────────────────────────────
export default function CustomerFormModal({ open, onClose, onSubmit, editData = null }) {
  const isEdit = !!editData
  const [fields, setFields] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Populate on edit
  useEffect(() => {
    if (open) {
      setFields(editData ? { ...EMPTY_FORM, ...editData } : EMPTY_FORM)
      setErrors({})
    }
  }, [open, editData])

  function set(key, val) {
    setFields(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600)) // simulate network
    onSubmit(fields)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Customer' : 'Add New Customer'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </Button>
        </>
      }
    >
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#94A3B8', padding: '7px 11px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        ℹ️ Demo form — data will not be persisted to a database.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Section A: Personal */}
        <SectionLabel>A · Personal Information</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 20 }}>
          <Field label="First Name" required error={errors.firstName}>
            <Inp placeholder="Arjun" value={fields.firstName} onChange={e => set('firstName', e.target.value)} error={errors.firstName} />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <Inp placeholder="Mehta" value={fields.lastName} onChange={e => set('lastName', e.target.value)} error={errors.lastName} />
          </Field>
          <Field label="Date of Birth" required error={errors.dateOfBirth}>
            <Inp type="date" value={fields.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} error={errors.dateOfBirth} />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <Sel value={fields.gender} onChange={e => set('gender', e.target.value)} error={errors.gender}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </Sel>
          </Field>
          <Field label="Status" error={errors.status}>
            <Sel value={fields.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Sel>
          </Field>
        </div>

        {/* Section B: Contact */}
        <SectionLabel>B · Contact Information</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 20 }}>
          <Field label="Email Address" required error={errors.email}>
            <Inp type="email" placeholder="arjun@email.com" value={fields.email} onChange={e => set('email', e.target.value)} error={errors.email} />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <Inp type="tel" placeholder="+91 98201 34567" value={fields.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} />
          </Field>
          <Field label="Address" required error={errors.address} >
            <div style={{ gridColumn: '1/-1' }}>
              <Inp placeholder="14, Shivaji Nagar" value={fields.address} onChange={e => set('address', e.target.value)} error={errors.address} style={{ height: 38, fontSize: 13, width: '100%' }} />
            </div>
          </Field>
          <Field label="City" required error={errors.city}>
            <Inp placeholder="Pune" value={fields.city} onChange={e => set('city', e.target.value)} error={errors.city} />
          </Field>
          <Field label="State" required error={errors.state}>
            <Sel value={fields.state} onChange={e => set('state', e.target.value)} error={errors.state}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
          </Field>
          <Field label="Postal Code" required error={errors.postalCode}>
            <Inp placeholder="411005" maxLength={6} value={fields.postalCode} onChange={e => set('postalCode', e.target.value)} error={errors.postalCode} />
          </Field>
        </div>

        {/* Section C: ID */}
        <SectionLabel>C · Identification Information</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
          <Field label="ID Proof Type" required error={errors.idProofType}>
            <Sel value={fields.idProofType} onChange={e => set('idProofType', e.target.value)} error={errors.idProofType}>
              <option value="">Select type</option>
              {ID_PROOF_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </Field>
          <Field label="ID Proof Number" required error={errors.maskedIdProofNumber}>
            <Inp placeholder="XXXX-XXXX-4521" value={fields.maskedIdProofNumber} onChange={e => set('maskedIdProofNumber', e.target.value)} error={errors.maskedIdProofNumber} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
