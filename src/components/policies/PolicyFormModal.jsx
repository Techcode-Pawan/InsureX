import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import {
  FREQUENCY_OPTIONS, POLICY_TYPE_OPTIONS, CUSTOMER_OPTIONS,
  initialPolicyTypes,
} from '../../data/policyData'

function validate(f) {
  const e = {}
  if (!f.customerId) e.customerId = 'Customer is required.'
  if (!f.policyTypeId) e.policyTypeId = 'Policy type is required.'
  if (!f.sumAssured || Number(f.sumAssured) <= 0) e.sumAssured = 'Sum assured must be greater than zero.'
  if (!f.premiumAmount || Number(f.premiumAmount) <= 0) e.premiumAmount = 'Premium amount is required.'
  if (!f.premiumFrequency) e.premiumFrequency = 'Select a frequency.'
  if (!f.startDate) e.startDate = 'Start date is required.'
  if (!f.expiryDate) e.expiryDate = 'Expiry date is required.'
  if (f.startDate && f.expiryDate && f.expiryDate <= f.startDate) e.expiryDate = 'Expiry date must be after start date.'
  return e
}

const EMPTY = {
  customerId: '', policyTypeId: '', sumAssured: '', premiumAmount: '',
  premiumFrequency: 'Annually', startDate: '', expiryDate: '', status: 'active',
}

const STATUS_OPTS = [
  { value: 'active',    label: 'Active' },
  { value: 'pending',   label: 'Pending' },
  { value: 'expired',   label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

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

export default function PolicyFormModal({ open, onClose, onSubmit, editData = null }) {
  const isEdit = !!editData
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editData) {
        setFields({
          customerId: editData.customerId || '',
          policyTypeId: editData.policyTypeId || '',
          sumAssured: editData.sumAssured || '',
          premiumAmount: editData.premiumAmount || '',
          premiumFrequency: editData.premiumFrequency || 'Annually',
          startDate: editData.startDate || '',
          expiryDate: editData.expiryDate || '',
          status: editData.status || 'active',
        })
      } else {
        setFields(EMPTY)
      }
      setErrors({})
    }
  }, [open, editData])

  function set(key, val) {
    setFields(f => {
      const next = { ...f, [key]: val }
      // Auto-fill policy type name when type changes
      return next
    })
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 500))
    const cust = CUSTOMER_OPTIONS.find(c => c.value === fields.customerId)
    const pt = initialPolicyTypes.find(t => t.typeId === fields.policyTypeId)
    onSubmit({
      ...fields,
      customerName: cust?.fullName || '',
      policyType: pt?.name || '',
      sumAssured: Number(fields.sumAssured),
      premiumAmount: Number(fields.premiumAmount),
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Policy' : 'Add New Policy'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Add Policy'}
          </Button>
        </>
      }
    >
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#94A3B8', padding: '7px 11px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        ℹ️ Demo form — data will not be persisted to a database.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
          <Field label="Customer" required error={errors.customerId}>
            <select className={`select${errors.customerId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              value={fields.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">Select customer</option>
              {CUSTOMER_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Policy Type" required error={errors.policyTypeId}>
            <select className={`select${errors.policyTypeId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              value={fields.policyTypeId} onChange={e => set('policyTypeId', e.target.value)}>
              <option value="">Select type</option>
              {POLICY_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Sum Assured (₹)" required error={errors.sumAssured}>
            <input className={`input${errors.sumAssured ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              type="number" min="0" placeholder="25,00,000"
              value={fields.sumAssured} onChange={e => set('sumAssured', e.target.value)} />
          </Field>

          <Field label="Premium Amount (₹)" required error={errors.premiumAmount}>
            <input className={`input${errors.premiumAmount ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              type="number" min="0" placeholder="18,500"
              value={fields.premiumAmount} onChange={e => set('premiumAmount', e.target.value)} />
          </Field>

          <Field label="Premium Frequency" required error={errors.premiumFrequency}>
            <select className={`select${errors.premiumFrequency ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              value={fields.premiumFrequency} onChange={e => set('premiumFrequency', e.target.value)}>
              {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="Status" error={errors.status}>
            <select className="select" style={{ height: 38, fontSize: 13 }}
              value={fields.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Start Date" required error={errors.startDate}>
            <input className={`input${errors.startDate ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              type="date" value={fields.startDate} onChange={e => set('startDate', e.target.value)} />
          </Field>

          <Field label="Expiry Date" required error={errors.expiryDate}>
            <input className={`input${errors.expiryDate ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              type="date" value={fields.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
