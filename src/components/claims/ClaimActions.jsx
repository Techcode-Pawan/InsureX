// Claim decision workflow shared by the admin claim detail page and the processing queue.
// The API re-validates every transition; these controls only offer the valid ones.
import { useState } from 'react'
import { UserCheck, CheckCircle2, XCircle, Banknote } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Notice, ConfirmDialog } from '../panel'
import { useApi, useAction } from '../../lib/useApi'
import api from '../../services/apiClient'
import { inr, fullName, titleCase } from '../../lib/format'
import { availableClaimActions, SETTLEMENT_METHODS } from './claimRules'

/**
 * Decision dialogs for a claim (assign assessor, approve, reject, settle).
 * `kind` selects the dialog; `onDone(message)` runs after a successful transition.
 */
export function ClaimDecisionDialog({ claim, kind, onClose, onDone }) {
  const agents = useApi(kind === 'assign' ? '/agents' : null, { status: 'ACTIVE' })
  const action = useAction()
  const [agentId, setAgentId] = useState(claim?.assignedAgentId || '')
  const [approvedAmount, setApprovedAmount] = useState(claim ? String(Number(claim.claimedAmount)) : '')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [settle, setSettle] = useState(() => ({ settlementMethod: SETTLEMENT_METHODS[0], transactionRef: '', settlementDate: new Date().toISOString().slice(0, 10) }))
  const [localError, setLocalError] = useState('')

  if (!claim || !kind) return null

  const cfg = {
    assign: { title: `Assign assessor to ${claim.claimNumber}`, label: 'Assign & start review', danger: false },
    approve: { title: `Approve ${claim.claimNumber}?`, label: 'Approve claim', danger: false },
    reject: { title: `Reject ${claim.claimNumber}?`, label: 'Reject claim', danger: true },
    settle: { title: `Record settlement for ${claim.claimNumber}`, label: 'Record settlement', danger: false },
  }[kind]

  async function confirm() {
    setLocalError('')
    let path
    let payload
    if (kind === 'assign') {
      if (!agentId) return setLocalError('Select an assessor.')
      path = 'assign'
      payload = { agentId }
    } else if (kind === 'approve') {
      const amt = Number(approvedAmount)
      if (!amt || amt <= 0) return setLocalError('Enter the approved amount.')
      if (amt > Number(claim.claimedAmount)) return setLocalError(`Cannot exceed the claimed amount (${inr(claim.claimedAmount)}).`)
      path = 'approve'
      payload = { approvedAmount: amt, ...(notes.trim() && { notes: notes.trim() }) }
    } else if (kind === 'reject') {
      if (reason.trim().length < 5) return setLocalError('Give the customer a clear reason (at least 5 characters).')
      path = 'reject'
      payload = { rejectionReason: reason.trim() }
    } else {
      if (settle.transactionRef.trim().length < 4) return setLocalError('Enter the disbursement transaction reference.')
      path = 'settle'
      payload = { settlementMethod: settle.settlementMethod, transactionRef: settle.transactionRef.trim(), settlementDate: settle.settlementDate || undefined }
    }
    await action.run(() => api.post(`/claims/${claim.id}/${path}`, payload))
    onDone({
      assign: `${claim.claimNumber} assigned for review.`,
      approve: `${claim.claimNumber} approved for ${inr(payload.approvedAmount)}.`,
      reject: `${claim.claimNumber} rejected. The customer has been notified.`,
      settle: `${claim.claimNumber} marked settled.`,
    }[kind])
  }

  const activeAgents = agents.data || []

  return (
    <ConfirmDialog
      open
      title={cfg.title}
      confirmLabel={cfg.label}
      danger={cfg.danger}
      pending={action.pending}
      error={action.error}
      onClose={onClose}
      onConfirm={confirm}
    >
      <div style={{ display: 'grid', gap: 12, color: 'var(--color-text-primary)' }}>
        <div className="muted">
          {fullName(claim.customer)} · {claim.claimType} · claimed <strong style={{ color: 'var(--color-text-primary)' }}>{inr(claim.claimedAmount)}</strong>
        </div>
        {kind === 'assign' && (
          <Select id="cd-agent" label="Assessor (active agents)" value={agentId} onChange={(e) => setAgentId(e.target.value)}
            placeholder={agents.loading ? 'Loading agents…' : activeAgents.length ? 'Select an agent' : 'No active agents'}
            options={activeAgents.map((a) => ({ value: a.id, label: `${fullName(a)} · ${a.agentNumber} · ${a.region}` }))} />
        )}
        {kind === 'approve' && (
          <>
            <Input id="cd-amount" label="Approved amount (₹)" type="number" min="1" step="0.01" max={Number(claim.claimedAmount)}
              value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} hint={`Up to ${inr(claim.claimedAmount)}`} />
            <div>
              <label className="input-label" htmlFor="cd-notes">Assessment notes (internal)</label>
              <textarea id="cd-notes" className="input" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </>
        )}
        {kind === 'reject' && (
          <div>
            <label className="input-label" htmlFor="cd-reason">Reason shown to the customer</label>
            <textarea id="cd-reason" className="input" maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="field-help">Rejection is final. The customer is notified with this reason.</p>
          </div>
        )}
        {kind === 'settle' && (
          <>
            <Notice>Record the settlement only after the disbursement has been made. Approved amount: <strong>{inr(claim.approvedAmount)}</strong>.</Notice>
            <div className="form-grid">
              <Select id="cd-method" label="Method" value={settle.settlementMethod} onChange={(e) => setSettle((s) => ({ ...s, settlementMethod: e.target.value }))} options={SETTLEMENT_METHODS} />
              <Input id="cd-sdate" label="Settlement date" type="date" value={settle.settlementDate} onChange={(e) => setSettle((s) => ({ ...s, settlementDate: e.target.value }))} />
              <Input id="cd-ref" className="span-2" label="Transaction reference / UTR" value={settle.transactionRef} onChange={(e) => setSettle((s) => ({ ...s, transactionRef: e.target.value }))} />
            </div>
          </>
        )}
        {localError && <Notice tone="error">{localError}</Notice>}
      </div>
    </ConfirmDialog>
  )
}

export function ClaimActionButtons({ claim, onAction, size = 'sm' }) {
  const can = availableClaimActions(claim.status)
  if (!can.assign && !can.settle) return <span className="muted" style={{ fontSize: 12.5 }}>No actions — {titleCase(claim.status)}</span>
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {can.assign && <Button size={size} variant="secondary" icon={UserCheck} onClick={() => onAction('assign')}>{claim.assignedAgentId ? 'Reassign' : 'Assign'}</Button>}
      {can.approve && <Button size={size} icon={CheckCircle2} onClick={() => onAction('approve')}>Approve</Button>}
      {can.reject && <Button size={size} variant="secondary" icon={XCircle} onClick={() => onAction('reject')} style={{ color: '#B91C1C' }}>Reject</Button>}
      {can.settle && <Button size={size} icon={Banknote} onClick={() => onAction('settle')}>Record settlement</Button>}
    </div>
  )
}
