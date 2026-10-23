import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Notice, Facts } from '../panel'
import { useAction } from '../../lib/useApi'
import api from '../../services/apiClient'
import { inr, date } from '../../lib/format'

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'NET_BANKING', label: 'Net banking' },
  { value: 'DEBIT_CARD', label: 'Debit card' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'CHEQUE', label: 'Cheque (cleared)' },
]

// Staff entry for money that has ALREADY been received and confirmed (bank statement, cleared cheque).
// It is applied to the premium balance immediately, so it must never be used for unverified claims of payment.
export default function RecordPaymentModal({ premium, policyNumber, onClose, onDone }) {
  const [form, setForm] = useState({ amount: '', paymentMethod: 'BANK_TRANSFER', transactionReference: '', notes: '' })
  const action = useAction()

  useEffect(() => {
    if (premium) {
      setForm({ amount: String(premium.remainingBalance), paymentMethod: 'BANK_TRANSFER', transactionReference: '', notes: '' })
      action.setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premium])

  if (!premium) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const amount = Number(form.amount)
  const amountError = !(amount > 0) ? 'Enter an amount.' : amount > Number(premium.remainingBalance) ? `Cannot exceed the outstanding ${inr(premium.remainingBalance, { exact: true })}.` : undefined
  const refError = form.transactionReference.trim().length < 4 ? 'Reference / UTR of at least 4 characters.' : undefined

  async function submit() {
    await action.run(() => api.post('/payments', {
      premiumId: premium.id,
      amount,
      paymentMethod: form.paymentMethod,
      transactionReference: form.transactionReference.trim(),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    }))
    onDone(`Recorded ${inr(amount, { exact: true })} against ${premium.premiumNumber}.`)
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Record payment · ${premium.premiumNumber}`} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button onClick={submit} loading={action.pending} disabled={Boolean(amountError || refError)}>Record confirmed payment</Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 14 }}>
        <Facts items={[
          ['Policy', policyNumber || premium.policy?.policyNumber],
          ['Due date', date(premium.dueDate)],
          ['Installment', inr(premium.amount, { exact: true })],
          ['Outstanding', inr(premium.remainingBalance, { exact: true })],
        ]} />
        <Notice tone="warn">Only record money that has already reached InsureX's account. The balance updates immediately and the customer is notified.</Notice>
        <div className="form-grid">
          <Input id="rp-amount" label="Amount received (₹)" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} error={form.amount ? amountError : undefined} />
          <Select id="rp-method" label="Method" value={form.paymentMethod} onChange={set('paymentMethod')} options={METHODS} />
          <Input id="rp-ref" className="span-2" label="Transaction reference / UTR" value={form.transactionReference} onChange={set('transactionReference')} error={form.transactionReference ? refError : undefined} />
          <div className="span-2">
            <label className="input-label" htmlFor="rp-notes">Internal note (optional)</label>
            <textarea id="rp-notes" className="input" maxLength={500} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}
