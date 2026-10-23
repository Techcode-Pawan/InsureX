import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Upload } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { inr, date, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, Notice, DataState, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { CLAIM_STEPS, claimStepProps } from './CustomerClaims'
import { UploadDocumentModal } from './CustomerDocuments'
import '../../styles/user.css'

const STAGE_TEXT = {
  AWAITING_REVIEW: 'Your claim is in the queue for an assessor.',
  UNDER_VERIFICATION: 'An assessor is verifying the details and documents.',
  DOCUMENTS_REQUIRED: 'We need more documents to continue. Please upload them below.',
  APPROVED: 'Your claim has been approved. Settlement is being arranged.',
  REJECTED: 'Your claim was not approved.',
  SETTLED: 'Your claim has been settled.',
}

export default function CustomerClaimDetail() {
  const { id } = useParams()
  const { data: claim, loading, error, reload } = useApi(`/me/claims/${id}`)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [dlError, setDlError] = useState(null)

  async function download(doc) {
    setDlError(null)
    try {
      await api.download(`/me/documents/${doc.id}/download`, doc.name)
    } catch (err) {
      setDlError(err)
    }
  }

  const open = claim && ['PENDING', 'UNDER_REVIEW'].includes(claim.status)

  return (
    <div className="px-page" style={{ maxWidth: 880 }}>
      <Link to="/user/claims" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} aria-hidden="true" /> All claims</Link>
      <DataState loading={loading} error={error} onRetry={reload}>
        {claim && (
          <>
            <PageHead
              eyebrow={claim.claimNumber}
              title={`${titleCase(claim.claimType)} claim`}
              sub={`${claim.policy?.policyType?.name} · Policy ${claim.policy?.policyNumber}`}
              actions={<StatusBadge status={claim.status} />}
            />
            <div className="cp-stack">
              <Panel title="Where your claim is">
                <Steps steps={CLAIM_STEPS} {...claimStepProps(claim.status)} />
                <div style={{ marginTop: 18 }}>
                  {claim.status === 'REJECTED' ? (
                    <Notice tone="error">
                      <strong>This claim was not approved.</strong>
                      {claim.rejectionReason && <div style={{ marginTop: 4 }}>Reason: {claim.rejectionReason}</div>}
                    </Notice>
                  ) : claim.status === 'SETTLED' ? (
                    <Notice tone="ok">
                      Settled on {date(claim.settlementDate)}{claim.settlementMethod ? ` via ${claim.settlementMethod}` : ''}
                      {claim.approvedAmount != null ? ` for ${inr(claim.approvedAmount)}` : ''}.
                    </Notice>
                  ) : (
                    <Notice tone={claim.processing?.processingStatus === 'DOCUMENTS_REQUIRED' ? 'warn' : 'info'}>
                      {STAGE_TEXT[claim.processing?.processingStatus] || 'Your claim has been received.'}
                    </Notice>
                  )}
                </div>
              </Panel>

              <Panel title="Claim details">
                <Facts items={[
                  ['Incident date', date(claim.claimDate)],
                  ['Amount claimed', inr(claim.claimedAmount)],
                  ['Approved amount', claim.approvedAmount != null && claim.status !== 'REJECTED' ? inr(claim.approvedAmount) : '—'],
                  ['Sum assured', inr(claim.policy?.sumAssured)],
                  ['Documents verified', claim.processing ? (claim.processing.documentsVerified ? 'Yes' : 'Not yet') : '—'],
                  ['Last update', date(claim.processing?.updatedAt || claim.updatedAt)],
                ]} />
                <h3 style={{ fontSize: 13, margin: '18px 0 6px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>What happened</h3>
                <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{claim.incidentDescription}</p>
              </Panel>

              <Panel
                flush
                title="Supporting documents"
                note="Bills, reports, photos or other evidence for this claim."
                action={open && <Button size="sm" variant="secondary" icon={Upload} onClick={() => setUploadOpen(true)}>Upload</Button>}
              >
                {dlError && <div style={{ padding: '12px 18px 0' }}><Notice tone="error">{dlError.message}</Notice></div>}
                {claim.documents?.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>No documents attached to this claim yet.</p>
                ) : (
                  <div>
                    {claim.documents.map((d) => (
                      <div key={d.id} className="cp-item">
                        <div className="cp-item-main">
                          <div className="cp-item-title">{d.name}</div>
                          <div className="cp-item-meta">{d.documentType} · Uploaded {date(d.submissionDate)}{d.verificationNotes ? ` · ${d.verificationNotes}` : ''}</div>
                        </div>
                        <div className="cp-item-end">
                          <StatusBadge status={d.verificationStatus} />
                          {d.hasFile && <Button size="sm" variant="ghost" icon={Download} onClick={() => download(d)} aria-label={`Download ${d.name}`}>Download</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <UploadDocumentModal
              open={uploadOpen}
              onClose={() => setUploadOpen(false)}
              onUploaded={() => { setUploadOpen(false); reload() }}
              fixedClaim={{ id: claim.id, claimNumber: claim.claimNumber, policyId: claim.policyId }}
              defaultType="Claim evidence"
            />
          </>
        )}
      </DataState>
    </div>
  )
}
