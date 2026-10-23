import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Wallet, Receipt } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { inr, date, relativeDays, daysUntil, titleCase } from '../../lib/format'
import { PageHead, Panel, Notice, DataState, Pager } from '../../components/panel'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import '../../styles/user.css'

const METHODS = ['UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE'].map((m) => ({ value: m, label: titleCase(m) }))

// Payment status in customer language. A PENDING payment has not been applied to the balance.
function PaymentStatus({ status }) {
  if (status === 'PENDING') return <Badge variant="yellow" dot>Awaiting verification</Badge>
  if (status === 'SUCCESS') return <Badge variant="green" dot>Confirmed</Badge>
  if (status === 'FAILED') return <Badge variant="red" dot>Not verified</Badge>
  return <StatusBadge status={status} />
}

function pendingTotal(premium) {
  return (premium.payments || []).filter((p) => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0)
}

function PayModal({ premium, gateway, onClose, onSubmitted }) {
  const remaining = premium ? Number(premium.remainingBalance) : 0
  const awaiting = premium ? pendingTotal(premium) : 0
  const available = Math.max(0, Math.round((remaining - awaiting) * 100) / 100)
  const [form, setForm] = useState(() => ({ amount: available ? String(available) : '', paymentMethod: 'UPI', transactionReference: '' }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = {}
    const amt = Number(form.amount)
    if (!amt || amt <= 0) v.amount = 'Enter the amount you paid.'
    else if (amt > available) v.amount = `This is more than the outstanding amount (${inr(available, { exact: true })}).`
    const ref = form.transactionReference.trim()
    if (ref.length < 4) v.transactionReference = 'Enter the transaction reference / UTR shown by your bank or UPI app.'
    setErrors(v)
    if (Object.keys(v).length) return
    setPending(true)
    setServerError(null)
    try {
      await api.post('/me/payments', { premiumId: premium.id, amount: amt, paymentMethod: form.paymentMethod, transactionReference: ref })
      onSubmitted()
    } catch (err) {
      setServerError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={Boolean(premium)}
      onClose={pending ? () => {} : onClose}
      title={premium ? `Submit payment · ${premium.premiumNumber}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="pay-form" loading={pending} disabled={available <= 0}>Submit for verification</Button>
        </>
      }
    >
      {premium && (
        <form id="pay-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
          {gateway?.mode !== 'ONLINE' && (
            <Notice tone="warn">
              Online card/UPI checkout is not connected yet. Pay through your own bank or UPI app, then enter the
              transaction reference here. <strong>Your balance updates only after InsureX verifies the payment</strong> against bank records.
            </Notice>
          )}
          <dl className="facts">
            <div><dt>Policy</dt><dd>{premium.policy?.policyNumber}</dd></div>
            <div><dt>Due date</dt><dd>{date(premium.dueDate)}</dd></div>
            <div><dt>Outstanding</dt><dd>{inr(remaining, { exact: true })}</dd></div>
            {awaiting > 0 && <div><dt>Awaiting verification</dt><dd>{inr(awaiting, { exact: true })}</dd></div>}
          </dl>
          {available <= 0 ? (
            <Notice>Payments already submitted for this premium cover the outstanding amount. They are awaiting verification.</Notice>
          ) : (
            <>
              <Input label="Amount paid (₹)" id="pay-amount" type="number" inputMode="decimal" min="1" step="0.01" max={available} value={form.amount} onChange={set('amount')} error={errors.amount} hint={`Up to ${inr(available, { exact: true })}`} />
              <Select label="How did you pay?" id="pay-method" value={form.paymentMethod} onChange={set('paymentMethod')} options={METHODS} />
              <Input label="Transaction reference / UTR" id="pay-ref" value={form.transactionReference} onChange={set('transactionReference')} error={errors.transactionReference} maxLength={64} autoComplete="off" hint="Shown in your bank or UPI app after the transfer completes." />
            </>
          )}
          {serverError && <Notice tone="error">{serverError.message}</Notice>}
        </form>
      )}
    </Modal>
  )
}

export default function CustomerPayments() {
  const [params, setParams] = useSearchParams()
  const [historyPage, setHistoryPage] = useState(1)
  const [flash, setFlash] = useState(null)
  const gateway = useApi('/me/payment-gateway')
  const premiums = useApi('/me/premiums', { limit: 100 })
  const history = useApi('/me/payments', { page: historyPage, limit: 10 })

  const unpaid = useMemo(
    () => (premiums.data || []).filter((p) => p.status !== 'PAID' && Number(p.remainingBalance) > 0)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [premiums.data],
  )
  const totalOutstanding = unpaid.reduce((s, p) => s + Number(p.remainingBalance), 0)
  const overdue = unpaid.filter((p) => p.status === 'OVERDUE')

  const selectedId = params.get('premium')
  const selected = selectedId ? (premiums.data || []).find((p) => p.id === selectedId) : null

  function openPay(p) {
    setParams({ premium: p.id })
  }
  function closePay() {
    setParams({})
  }
  function submitted() {
    closePay()
    setFlash('Payment submitted. It shows as "Awaiting verification" until InsureX confirms it with the bank, usually within 1–2 working days.')
    premiums.reload()
    history.reload()
  }

  return (
    <div className="px-page">
      <PageHead title="Payments" sub="Your premium schedule, what's due next, and every payment you've made." />
      <div className="cp-stack">
        {flash && <Notice tone="ok">{flash}</Notice>}
        {gateway.data && gateway.data.mode !== 'ONLINE' && (
          <Notice>
            <strong>How paying works right now:</strong> online checkout is not connected. Pay through your bank or UPI app,
            then use <em>Submit payment</em> to send us the transaction reference. Nothing is charged from this page, and your
            balance changes only after we verify the payment.
          </Notice>
        )}
        {overdue.length > 0 && (
          <Notice tone="warn">
            {overdue.length === 1 ? 'One premium is' : `${overdue.length} premiums are`} overdue. Paying soon keeps your cover active.
          </Notice>
        )}

        <Panel
          flush
          title="Due and upcoming"
          note={premiums.data ? `${inr(totalOutstanding)} outstanding across ${unpaid.length} installment${unpaid.length === 1 ? '' : 's'}` : undefined}
        >
          <DataState loading={premiums.loading} error={premiums.error} onRetry={premiums.reload} empty={unpaid.length === 0} emptyText="You're all paid up. Nothing is due right now.">
            <div>
              {unpaid.map((p) => {
                const awaiting = pendingTotal(p)
                const d = daysUntil(p.dueDate)
                const paidPct = Math.min(100, (Number(p.paidAmount) / Number(p.amount)) * 100)
                return (
                  <div key={p.id} className="cp-item" style={selectedId === p.id ? { background: '#F5FAFF' } : undefined}>
                    <div className="cp-item-main">
                      <div className="cp-item-title">{p.policy?.policyType?.name} · {p.policy?.policyNumber}</div>
                      <div className="cp-item-meta" style={d < 0 ? { color: 'var(--status-red-text)' } : undefined}>
                        Due {date(p.dueDate)} ({relativeDays(p.dueDate)}) · <span className="mono">{p.premiumNumber}</span>
                      </div>
                      {Number(p.paidAmount) > 0 && (
                        <div style={{ marginTop: 8, maxWidth: 260 }}>
                          <div className="meter" aria-hidden="true"><span style={{ width: `${paidPct}%` }} /></div>
                          <div className="cp-item-meta">{inr(p.paidAmount)} of {inr(p.amount)} paid</div>
                        </div>
                      )}
                      {awaiting > 0 && <div className="cp-item-meta" style={{ color: 'var(--status-amber-text)' }}>{inr(awaiting)} awaiting verification</div>}
                    </div>
                    <div className="cp-item-end">
                      <div style={{ textAlign: 'right' }}>
                        <div className="cp-amount">{inr(p.remainingBalance, { exact: true })}</div>
                        <StatusBadge status={p.status} />
                      </div>
                      {awaiting >= Number(p.remainingBalance)
                        ? <span className="cp-item-meta" style={{ textAlign: 'right' }}>Fully submitted ·<br />awaiting verification</span>
                        : <Button icon={Wallet} onClick={() => openPay(p)}>Submit payment</Button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </DataState>
        </Panel>

        <Panel flush title="Payment history">
          <DataState loading={history.loading} error={history.error} onRetry={history.reload} empty={history.data?.length === 0} emptyText="No payments yet.">
            <div>
              {history.data?.map((pay) => (
                <div key={pay.id} className="cp-item">
                  <div className="cp-item-main">
                    <div className="cp-item-title">{inr(pay.amount, { exact: true })} · {titleCase(pay.paymentMethod)}</div>
                    <div className="cp-item-meta">
                      {date(pay.paymentDate)} · {pay.policy?.policyNumber} · {pay.premium?.premiumNumber} · Ref <span className="mono">{pay.transactionReference}</span>
                    </div>
                    {pay.status === 'FAILED' && pay.notes && <div className="cp-item-meta" style={{ color: 'var(--status-red-text)' }}>{pay.notes}</div>}
                  </div>
                  <div className="cp-item-end">
                    <PaymentStatus status={pay.status} />
                    {pay.status === 'SUCCESS' && (
                      <Link to={`/user/payments/${pay.id}/receipt`} className="btn btn-ghost btn-sm"><Receipt size={15} aria-hidden="true" /> Receipt</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pager body={history.body} page={historyPage} onPage={setHistoryPage} />
          </DataState>
        </Panel>
      </div>

      <PayModal key={selected?.id || 'none'} premium={selected && selected.status !== 'PAID' ? selected : null} gateway={gateway.data} onClose={closePay} onSubmitted={submitted} />
    </div>
  )
}
