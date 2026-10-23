import { useState } from 'react'
import { Download } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/Badge'
import { Panel, DataState, Pager, Notice, ConfirmDialog, Segmented } from '../../components/panel'
import { useApi, useAction } from '../../lib/useApi'
import api from '../../services/apiClient'
import { inr, date, dateTime, fullName, titleCase } from '../../lib/format'

// Customer-submitted payments (PENDING) must be matched against bank records before they
// touch any premium balance. Documents need a final verify/reject decision.
function PaymentQueue() {
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/payments', { status: 'PENDING', page, limit: 10 })
  const [target, setTarget] = useState(null) // { payment, decision }
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState('')
  const action = useAction()

  async function confirm() {
    await action.run(() => api.post(`/admin/payments/${target.payment.id}/verify`, { decision: target.decision, notes: notes.trim() || undefined }))
    setDone(`${target.payment.paymentNumber} ${target.decision === 'SUCCESS' ? 'confirmed and applied to the premium balance' : 'marked as failed'}.`)
    setTarget(null)
    setNotes('')
    reload()
  }

  return (
    <Panel title="Payments awaiting verification" note="Match each reference (UTR) against the bank statement before confirming." flush>
      {done && <div style={{ padding: '12px 18px 0' }}><Notice tone="ok">{done}</Notice></div>}
      <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No customer payments are waiting for verification.">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Payment</th><th scope="col">Customer · policy</th><th scope="col">Method / reference</th>
                <th scope="col">Submitted</th><th scope="col" className="numeric">Amount</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((p) => (
                <tr key={p.id}>
                  <td><span className="mono">{p.paymentNumber}</span><div className="muted" style={{ fontSize: 12 }}>{p.premium?.premiumNumber}</div></td>
                  <td>{fullName(p.policy?.customer)}<div className="muted" style={{ fontSize: 12 }}>{p.policy?.policyNumber}</div></td>
                  <td>{titleCase(p.paymentMethod)}<div className="mono">{p.transactionReference}</div></td>
                  <td className="nowrap">{dateTime(p.paymentDate)}</td>
                  <td className="numeric" style={{ fontWeight: 600 }}>{inr(p.amount, { exact: true })}</td>
                  <td className="nowrap" style={{ textAlign: 'right' }}>
                    <Button size="sm" onClick={() => setTarget({ payment: p, decision: 'SUCCESS' })}>Confirm</Button>{' '}
                    <Button size="sm" variant="secondary" onClick={() => setTarget({ payment: p, decision: 'FAILED' })}>Reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager body={body} page={page} onPage={setPage} />
      </DataState>

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.decision === 'SUCCESS' ? 'Confirm payment received?' : 'Reject this payment?'}
        confirmLabel={target?.decision === 'SUCCESS' ? 'Confirm & apply' : 'Mark as failed'}
        danger={target?.decision === 'FAILED'}
        pending={action.pending}
        error={action.error}
        onClose={() => { setTarget(null); action.setError(null) }}
        onConfirm={confirm}
      >
        {target && (
          <>
            <p style={{ margin: '0 0 10px' }}>
              {target.decision === 'SUCCESS'
                ? <>Only confirm if <strong>{inr(target.payment.amount, { exact: true })}</strong> with reference <span className="mono">{target.payment.transactionReference}</span> appears in the bank statement. The amount will be applied to premium {target.payment.premium?.premiumNumber} and the customer notified.</>
                : <>The premium balance will not change. The customer will be told the payment could not be verified.</>}
            </p>
            <label className="input-label" htmlFor="verify-notes">Note to customer {target.decision === 'FAILED' ? '(recommended)' : '(optional)'}</label>
            <textarea id="verify-notes" className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </>
        )}
      </ConfirmDialog>
    </Panel>
  )
}

function DocumentQueue() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('PENDING')
  const { data, body, loading, error, reload } = useApi('/documents', { status, page, limit: 10 })
  const [target, setTarget] = useState(null)
  const [decision, setDecision] = useState('VERIFIED')
  const [notes, setNotes] = useState('')
  const action = useAction()

  async function save() {
    await action.run(() => api.put(`/documents/${target.id}`, { verificationStatus: decision, verificationNotes: notes.trim() || undefined }))
    setTarget(null)
    setNotes('')
    reload()
  }

  return (
    <Panel
      title="Documents awaiting review"
      note="Open the file, then record a decision. The customer is notified of the outcome."
      action={<Segmented label="Document status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'NEEDS_INFO', label: 'Needs info' }]} />}
      flush
    >
      <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No documents in this state.">
        <ul className="rows">
          {data?.map((d) => (
            <li key={d.id} className="row" style={{ flexWrap: 'wrap' }}>
              <div className="row-main">
                <div className="row-title">{d.name}</div>
                <div className="row-meta">
                  <span className="mono">{d.documentNumber}</span> · {d.documentType} · {fullName(d.customer)}
                  {d.policy && ` · ${d.policy.policyNumber}`}{d.claim && ` · ${d.claim.claimNumber}`} · {date(d.submissionDate)}
                </div>
                {d.verificationNotes && <div className="row-meta" style={{ whiteSpace: 'normal' }}>Note: {d.verificationNotes}</div>}
              </div>
              <div className="row-end" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <StatusBadge status={d.verificationStatus} />
                {d.hasFile
                  ? <Button size="sm" variant="secondary" icon={Download} onClick={() => api.download(`/documents/${d.id}/download`, d.name)}>Open</Button>
                  : <span className="muted" style={{ fontSize: 12 }}>No file</span>}
                <Button size="sm" onClick={() => { setTarget(d); setDecision('VERIFIED') }}>Review</Button>
              </div>
            </li>
          ))}
        </ul>
        <Pager body={body} page={page} onPage={setPage} />
      </DataState>

      <ConfirmDialog
        open={Boolean(target)}
        title={`Review ${target?.documentNumber || ''}`}
        confirmLabel="Save decision"
        danger={decision === 'REJECTED'}
        pending={action.pending}
        error={action.error}
        onClose={() => { setTarget(null); action.setError(null) }}
        onConfirm={save}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Select id="doc-decision" label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)}
            options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'NEEDS_INFO', label: 'Needs more information' }, { value: 'REJECTED', label: 'Rejected' }]} />
          <div>
            <label className="input-label" htmlFor="doc-notes">Note to customer</label>
            <textarea id="doc-notes" className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </ConfirmDialog>
    </Panel>
  )
}

export default function Verifications() {
  return (
    <div>
      <PageHeader title="Verification queue" subtitle="Customer-submitted payments and documents that need a staff decision." />
      <div style={{ display: 'grid', gap: 16 }}>
        <PaymentQueue />
        <DocumentQueue />
      </div>
    </div>
  )
}
