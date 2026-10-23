import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, Facts, Notice, DataState, Steps } from '../components/panel'
import { useApi } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, date, dateTime, fullName } from '../lib/format'
import { ClaimDecisionDialog, ClaimActionButtons } from '../components/claims/ClaimActions'
import { CLAIM_STEPS } from '../components/claims/claimRules'

export default function ClaimDetails() {
  const { id } = useParams()
  const { data: claim, loading, error, reload } = useApi(`/claims/${id}`)
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState('')

  const back = <Link to="/admin/claims" className="panel-link"><ArrowLeft size={14} aria-hidden="true" /> All claims</Link>

  if (loading || error) {
    return (
      <div>
        <PageHeader title="Claim" actions={back} />
        <Panel><DataState loading={loading} error={error} onRetry={reload} rows={6} /></Panel>
      </div>
    )
  }

  const proc = claim.processing
  const isRejected = claim.status === 'REJECTED'

  return (
    <div>
      <PageHeader
        title={`Claim ${claim.claimNumber}`}
        breadcrumbExtra={claim.claimNumber}
        subtitle={`${claim.claimType} · filed ${date(claim.claimDate)} by ${fullName(claim.customer)}`}
        actions={back}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <div className="px-grid main-side">
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel title="Status" action={<StatusBadge status={claim.status} />}>
            <Steps steps={CLAIM_STEPS} current={isRejected ? (proc?.assignedAgentId || claim.assignedAgentId ? 'UNDER_REVIEW' : 'PENDING') : claim.status} failed={isRejected} failedLabel="Rejected" />
            <div style={{ marginTop: 18 }}>
              <ClaimActionButtons claim={claim} onAction={setDialog} size="md" />
            </div>
            {isRejected && claim.rejectionReason && (
              <div style={{ marginTop: 14 }}><Notice tone="error">Rejection reason: {claim.rejectionReason}</Notice></div>
            )}
          </Panel>

          <Panel title="Claim details">
            <Facts items={[
              ['Claim type', claim.claimType],
              ['Incident date', date(claim.claimDate)],
              ['Claimed amount', inr(claim.claimedAmount, { exact: true })],
              ['Approved amount', claim.approvedAmount !== null && !isRejected ? inr(claim.approvedAmount, { exact: true }) : '—'],
              ['Sum assured', inr(claim.policy?.sumAssured)],
              ['Assessor', claim.assignedAgent ? `${fullName(claim.assignedAgent)} (${claim.assignedAgent.agentNumber})` : 'Unassigned'],
              claim.status === 'SETTLED' && ['Settled on', date(claim.settlementDate)],
              claim.status === 'SETTLED' && ['Settlement method', claim.settlementMethod],
              claim.status === 'SETTLED' && ['Settlement reference', <span key="ref" className="mono">{claim.settlementTransactionRef}</span>],
            ]} />
            <h3 className="panel-title" style={{ margin: '18px 0 6px' }}>Incident description</h3>
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{claim.incidentDescription}</p>
          </Panel>

          <Panel title="Supporting documents" note="Files submitted for this claim" flush>
            <DataState empty={claim.documents.length === 0} emptyText="No documents have been attached to this claim.">
              <ul className="rows">
                {claim.documents.map((d) => (
                  <li key={d.id} className="row">
                    <div className="row-main">
                      <div className="row-title">{d.name}</div>
                      <div className="row-meta"><span className="mono">{d.documentNumber}</span> · {d.documentType} · {date(d.submissionDate)}</div>
                    </div>
                    <StatusBadge status={d.verificationStatus} />
                    {d.fileUrl
                      ? <Button size="sm" variant="secondary" icon={Download} onClick={() => api.download(`/documents/${d.id}/download`, d.name)}>Open</Button>
                      : <span className="muted" style={{ fontSize: 12 }}>No file</span>}
                  </li>
                ))}
              </ul>
            </DataState>
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <Link to="/admin/documents" className="panel-link">Review documents in the verification queue</Link>
            </div>
          </Panel>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel title="Processing record" note="Internal — not shown to the customer">
            {proc ? (
              <Facts items={[
                ['Processing stage', <StatusBadge key="ps" status={proc.processingStatus} />],
                ['Verification', <StatusBadge key="vs" status={proc.verificationStatus} />],
                ['Documents verified', proc.documentsVerified ? 'Yes' : 'No'],
                ['Opened', dateTime(proc.processingDate)],
                ['Last updated', dateTime(proc.updatedAt)],
                proc.verificationNotes && ['Assessment notes', proc.verificationNotes],
              ]} />
            ) : <p className="muted" style={{ margin: 0 }}>No processing record exists for this claim.</p>}
          </Panel>

          <Panel title="Policyholder">
            <Facts items={[
              ['Name', <Link key="n" to={`/admin/customers/${claim.customer.id}`} className="table-link">{fullName(claim.customer)}</Link>],
              ['Customer no.', <span key="c" className="mono">{claim.customer.customerNumber}</span>],
              ['Phone', claim.customer.phone],
              ['Email', claim.customer.email],
            ]} />
          </Panel>

          <Panel title="Policy">
            <Facts items={[
              ['Policy no.', <Link key="p" to={`/admin/policies/${claim.policy.id}`} className="table-link">{claim.policy.policyNumber}</Link>],
              ['Plan', claim.policy.policyType?.name],
              ['Status', <StatusBadge key="s" status={claim.policy.status} />],
              ['Period', `${date(claim.policy.startDate)} – ${date(claim.policy.expiryDate)}`],
            ]} />
          </Panel>
        </div>
      </div>

      {dialog && (
        <ClaimDecisionDialog
          key={dialog}
          claim={claim}
          kind={dialog}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); setMessage(msg); reload() }}
        />
      )}
    </div>
  )
}
