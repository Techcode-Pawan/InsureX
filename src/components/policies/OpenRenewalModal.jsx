import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Notice, Facts } from '../panel'
import { useAction } from '../../lib/useApi'
import api from '../../services/apiClient'
import { inr, date, titleCase } from '../../lib/format'

const PER_YEAR = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, ANNUALLY: 1 }
const iso = (d) => new Date(d).toISOString().slice(0, 10)

// Opens a renewal for the next term. Defaults: same terms, starting the day the current term ends.
export default function OpenRenewalModal({ policy, onClose, onDone }) {
  const [form, setForm] = useState(null)
  const action = useAction()

  useEffect(() => {
    if (!policy) return
    const start = new Date(policy.expiryDate)
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1)
    setForm({
      newStartDate: iso(start),
      newExpiryDate: iso(end),
      renewalPremium: String(Math.round(Number(policy.premiumAmount) * PER_YEAR[policy.premiumFrequency] * 100) / 100),
      notes: '',
    })
    action.setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy])

  if (!policy || !form) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const invalid = form.newExpiryDate <= form.newStartDate || form.newStartDate < iso(policy.expiryDate) || !(Number(form.renewalPremium) > 0)

  async function submit() {
    await action.run(() => api.post('/renewals', {
      policyId: policy.id,
      newStartDate: form.newStartDate,
      newExpiryDate: form.newExpiryDate,
      renewalPremium: Number(form.renewalPremium),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    }))
    onDone(`Renewal opened for ${policy.policyNumber}. The customer has been notified.`)
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Open renewal · ${policy.policyNumber}`} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button onClick={submit} loading={action.pending} disabled={invalid}>Open renewal</Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 14 }}>
        <Facts items={[
          ['Current expiry', date(policy.expiryDate)],
          ['Current premium', `${inr(policy.premiumAmount)} ${titleCase(policy.premiumFrequency)}`],
        ]} />
        <div className="form-grid">
          <Input id="or-start" label="New term starts" type="date" value={form.newStartDate} onChange={set('newStartDate')}
            error={form.newStartDate < iso(policy.expiryDate) ? 'Cannot start before the current term ends.' : undefined} />
          <Input id="or-end" label="New term ends" type="date" value={form.newExpiryDate} onChange={set('newExpiryDate')}
            error={form.newExpiryDate <= form.newStartDate ? 'Must be after the start date.' : undefined} />
          <Input id="or-prem" className="span-2" label="Renewal premium for the term (₹)" type="number" min="1" step="0.01" value={form.renewalPremium} onChange={set('renewalPremium')}
            hint="Billed as one installment due on the new start date when the renewal is marked renewed." />
          <div className="span-2">
            <label className="input-label" htmlFor="or-notes">Notes (optional)</label>
            <textarea id="or-notes" className="input" maxLength={1000} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}
