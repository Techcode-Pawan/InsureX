import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Phone } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { inr, date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const STEPS = [
  { key: 'PENDING', label: 'Filed' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SETTLED', label: 'Settled' },
]

export default function AgentClaimDetail() {
  const { id } = useParams()
  const { data: c, loading, error, reload } = useApi(`/agent/claims/${id}`)

  if (!c) {
    return (
      <div className="px-page">
        <Link to="/agent/claims" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} /> Claims</Link>
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      </div>
    )
  }

  const rejected = c.status === 'REJECTED'
  // A rejected claim stops at the review stage
  const current = rejected ? 'UNDER_REVIEW' : c.status

  return (
    <div className="px-page" style={{ maxWidth: 1060 }}>
      <Link to="/agent/claims" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Claims</Link>
      <PageHead
        eyebrow={c.claimNumber}
        title={`${c.claimType} claim`}
        sub={`${fullName(c.customer)} · policy ${c.policy.policyNumber} · filed ${date(c.claimDate)}`}
        actions={<StatusBadge status={c.status} />}
      />

      <Panel title="Progress">
        <Steps steps={STEPS} current={current} failed={rejected} failedLabel="Rejected" />
        {rejected && c.rejectionReason && <div style={{ marginTop: 14 }}><Notice tone="warn"><strong>Reason:</strong> {c.rejectionReason}</Notice></div>}
        <p className="field-help" style={{ marginTop: 14 }}>
          You can follow this claim and help the customer with documents. Approval and settlement are made by administrators.
        </p>
      </Panel>

      <div className="px-grid main-side" style={{ marginTop: 16 }}>
        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel title="Claim">
            <Facts items={[
              ['Claimed amount', inr(c.claimedAmount)],
              ['Approved amount', c.approvedAmount != null ? inr(c.approvedAmount) : '—'],
              ['Incident date', date(c.claimDate)],
              ['Policy', <Link key="p" to={`/agent/policies/${c.policy.id}`} className="table-link">{c.policy.policyNumber}</Link>],
              ['Plan', c.policy.policyType?.name],
              ['Sum assured', inr(c.policy.sumAssured)],
              c.settlementDate && ['Settled on', date(c.settlementDate)],
              c.settlementMethod && ['Settlement method', c.settlementMethod],
            ]} />
            <h3 className="panel-title" style={{ marginTop: 18, fontSize: 13 }}>Incident description</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{c.incidentDescription}</p>
          </Panel>

          <Panel flush title="Supporting documents">
            <DataState empty={c.documents.length === 0} emptyText="No documents attached to this claim yet.">
              <ul className="rows">
                {c.documents.map((d) => (
                  <li key={d.id} className="row">
                    <div className="row-main">
                      <div className="row-title">{d.name}</div>
                      <div className="row-meta">{d.documentType} · {date(d.submissionDate)}</div>
                    </div>
                    <div className="row-end"><StatusBadge status={d.verificationStatus} /></div>
                    {d.hasFile && (
                      <Button variant="ghost" size="icon" aria-label={`Download ${d.name}`} onClick={() => api.download(`/agent/documents/${d.id}/download`, d.name)}>
                        <Download size={16} />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </DataState>
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <Link to={`/agent/documents?upload=1&customerId=${c.customer.id}&claimId=${c.id}`} className="panel-link">Upload a document for this claim</Link>
            </div>
          </Panel>
        </div>

        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel title="Processing">
            {c.processing ? (
              <Facts items={[
                ['Stage', titleCase(c.processing.processingStatus)],
                ['Verification', titleCase(c.processing.verificationStatus)],
                ['Documents verified', c.processing.documentsVerified ? 'Yes' : 'Not yet'],
              ]} />
            ) : <p className="muted" style={{ margin: 0 }}>No processing record.</p>}
            {c.processing?.verificationNotes && (
              <>
                <h3 className="panel-title" style={{ marginTop: 16, fontSize: 13 }}>Assessor notes</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{c.processing.verificationNotes}</p>
              </>
            )}
          </Panel>
          <Panel title="Customer">
            <Facts items={[
              ['Name', <Link key="n" to={`/agent/customers/${c.customer.id}`} className="table-link">{fullName(c.customer)}</Link>],
              ['Customer number', <span key="c" className="mono">{c.customer.customerNumber}</span>],
            ]} />
            {c.customer.phone && (
              <a href={`tel:${c.customer.phone.replace(/\s+/g, '')}`} className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
                <Phone size={14} aria-hidden="true" /> Call {c.customer.phone}
              </a>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
