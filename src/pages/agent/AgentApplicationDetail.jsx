import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'PENDING', label: 'Underwriting review' },
  { key: 'DECIDED', label: 'Decision' },
  { key: 'ISSUED', label: 'Policy issued' },
]

function stepFor(app) {
  if (app.status === 'PENDING') return { current: 'PENDING' }
  if (app.status === 'APPROVED') return { current: 'ISSUED' }
  if (app.status === 'REJECTED') return { current: 'DECIDED', failed: true, failedLabel: 'Not approved' }
  return { current: 'DECIDED', failed: true, failedLabel: 'Withdrawn' }
}

export default function AgentApplicationDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { data: a, loading, error, reload } = useApi(`/agent/applications/${id}`)

  if (!a) {
    return (
      <div className="px-page">
        <Link to="/agent/applications" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} /> Applications</Link>
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      </div>
    )
  }

  const s = stepFor(a)

  return (
    <div className="px-page" style={{ maxWidth: 1000 }}>
      <Link to="/agent/applications" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Applications</Link>
      <PageHead
        eyebrow={a.applicationNumber}
        title={`${a.policyType.name} for ${fullName(a.customer)}`}
        sub={`Submitted ${date(a.applicationDate)}${a.reviewDate ? ` · reviewed ${date(a.reviewDate)}` : ''}`}
        actions={<StatusBadge status={a.status} />}
      />

      {location.state?.submitted && (
        <Notice tone="ok" style={{ marginBottom: 16 }}>Application submitted. It is now in the underwriting queue and you'll get a notification when it is decided.</Notice>
      )}

      <Panel title="Progress" className="" >
        <Steps steps={STEPS} current={s.current} failed={s.failed} failedLabel={s.failedLabel} />
        {a.status === 'PENDING' && <p className="field-help" style={{ marginTop: 14 }}>Awaiting an underwriting decision from an administrator. No action is needed from you unless documents are requested.</p>}
        {a.status === 'REJECTED' && a.rejectionReason && (
          <div style={{ marginTop: 14 }}><Notice tone="warn"><strong>Reason given:</strong> {a.rejectionReason}</Notice></div>
        )}
        {a.policy && (
          <div style={{ marginTop: 14 }}>
            <Notice tone="ok">
              Policy <Link to={`/agent/policies/${a.policy.id}`} className="table-link">{a.policy.policyNumber}</Link> was issued from this application.
            </Notice>
          </div>
        )}
      </Panel>

      <div className="px-grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Application">
          <Facts items={[
            ['Plan', `${a.policyType.name} (${a.policyType.typeCode})`],
            ['Cover requested', inr(a.requestedCoverage)],
            ['Annual income', a.annualIncome ? inr(a.annualIncome) : '—'],
            ['Employment', a.employmentStatus || '—'],
            ['Nominee', a.nomineeName ? `${a.nomineeName}${a.nomineeRelation ? ` (${a.nomineeRelation})` : ''}` : '—'],
            ['Submitted via', a.assistedByAgent ? `Agent ${fullName(a.assistedByAgent)}` : 'Customer / office'],
          ]} />
        </Panel>
        <Panel title="Customer">
          <Facts items={[
            ['Name', <Link key="n" to={`/agent/customers/${a.customer.id}`} className="table-link">{fullName(a.customer)}</Link>],
            ['Customer number', <span key="c" className="mono">{a.customer.customerNumber}</span>],
            ['Status', titleCase(a.status)],
          ]} />
          {a.notes && (
            <>
              <h3 className="panel-title" style={{ marginTop: 18, fontSize: 13 }}>Notes</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{a.notes}</p>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
