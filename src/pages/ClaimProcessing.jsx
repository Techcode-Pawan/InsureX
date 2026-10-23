import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, DataState, Pager, Notice, Segmented } from '../components/panel'
import { useApi } from '../lib/useApi'
import { inr, date, relativeDays, fullName } from '../lib/format'
import { ClaimDecisionDialog, ClaimActionButtons } from '../components/claims/ClaimActions'

const STAGES = [
  { value: 'AWAITING_REVIEW', label: 'Awaiting review' },
  { value: 'UNDER_VERIFICATION', label: 'Under verification' },
  { value: 'APPROVED', label: 'Awaiting settlement' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
]

// Stage counts come from the same paginated endpoint (total of a 1-row page), so they match the list exactly.
function useStageTotal(status, rev) {
  const { body } = useApi('/claim-processing', { status, limit: 1, rev })
  return body ? body.total : '—'
}

export default function ClaimProcessing() {
  const [params, setParams] = useSearchParams()
  const [stage, setStage] = useState(params.get('stage') ?? 'AWAITING_REVIEW')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null) // { claim, kind }
  const [message, setMessage] = useState('')
  const [rev, setRev] = useState(0) // bumps after each decision so stage counts refresh
  const { data, body, loading, error, reload } = useApi('/claim-processing', { status: stage || undefined, page, limit: 12 })

  const awaiting = useStageTotal('AWAITING_REVIEW', rev)
  const verifying = useStageTotal('UNDER_VERIFICATION', rev)
  const toSettle = useStageTotal('APPROVED', rev)
  const settled = useStageTotal('SETTLED', rev)

  function changeStage(v) {
    setStage(v)
    setPage(1)
    setParams(v ? { stage: v } : { stage: '' }, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Claim processing" subtitle="Work the claims pipeline: assign an assessor, decide, then record settlement." />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Awaiting review" value={awaiting} foot="Needs an assessor" tone={awaiting > 0 ? 'warn' : ''} />
        <Kpi label="Under verification" value={verifying} foot="Assessor assigned" />
        <Kpi label="Awaiting settlement" value={toSettle} foot="Approved, not yet paid" tone={toSettle > 0 ? 'warn' : ''} />
        <Kpi label="Settled" value={settled} foot="Closed with disbursement" />
      </KpiBand>

      <Panel flush>
        <div className="filters">
          <Segmented label="Processing stage" value={stage} onChange={changeStage} options={STAGES} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No claims at this stage.">
          <ul className="rows">
            {data?.map((p) => {
              const claim = { ...p.claim, assignedAgentId: p.claim.assignedAgentId }
              return (
                <li key={p.id} className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div className="row-main" style={{ minWidth: 240 }}>
                    <div className="row-title">
                      <Link to={`/admin/claims/${claim.id}`} className="table-link">{claim.claimNumber}</Link>
                      {' · '}{fullName(claim.customer)}
                    </div>
                    <div className="row-meta">
                      {claim.claimType} · {claim.policy?.policyNumber} ({claim.policy?.policyType?.name}) · filed {date(claim.claimDate)} ({relativeDays(claim.claimDate)})
                    </div>
                    <div className="row-meta">
                      Assessor: {p.assignedAgent ? fullName(p.assignedAgent) : 'unassigned'} · verification <StatusBadge status={p.verificationStatus} />
                    </div>
                  </div>
                  <div className="row-end" style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                    <div className="row-amount">
                      {inr(claim.claimedAmount)}
                      {claim.approvedAmount !== null && claim.status !== 'REJECTED' && <span className="muted" style={{ fontWeight: 400 }}> · approved {inr(claim.approvedAmount)}</span>}
                    </div>
                    <StatusBadge status={p.processingStatus} />
                    <ClaimActionButtons claim={claim} onAction={(kind) => setDialog({ claim, kind })} />
                  </div>
                </li>
              )
            })}
          </ul>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      {dialog && (
        <ClaimDecisionDialog
          key={`${dialog.claim.id}-${dialog.kind}`}
          claim={dialog.claim}
          kind={dialog.kind}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); setMessage(msg); setRev((r) => r + 1); reload() }}
        />
      )}
    </div>
  )
}
