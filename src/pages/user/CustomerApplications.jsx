import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import '../../styles/user.css'

export const APP_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Under review' },
  { key: 'decision', label: 'Decision' },
]

// Maps an application status onto the 3-step tracker.
export function appStepProps(status) {
  if (status === 'PENDING') return { current: 'review' }
  if (status === 'APPROVED') return { current: 'decision', failedLabel: undefined }
  if (status === 'REJECTED') return { current: 'decision', failed: true, failedLabel: 'Not approved' }
  if (status === 'CANCELLED') return { current: 'decision', failed: true, failedLabel: 'Withdrawn' }
  return { current: 'submitted' }
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Not approved' },
]

export default function CustomerApplications() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, body, loading, error, reload } = useApi('/me/applications', { page, limit: 10, status })

  return (
    <div className="px-page">
      <PageHead
        title="My applications"
        sub="Track every application you've submitted, from review to decision."
        actions={<Link to="/user/plans" className="btn btn-primary"><FilePlus2 size={15} aria-hidden="true" /> New application</Link>}
      />
      <Panel
        flush
        title="Applications"
        action={<Segmented label="Filter by status" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />}
      >
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length === 0}
          emptyText={status ? 'No applications with this status.' : "You haven't applied for a plan yet. Explore plans to get started."}
        >
          <div>
            {data?.map((a) => (
              <Link key={a.id} to={`/user/applications/${a.id}`} className="cp-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div className="cp-item-title">{a.policyType?.name}</div>
                    <div className="cp-item-meta">
                      <span className="mono">{a.applicationNumber}</span> · Applied {date(a.applicationDate)} · Cover {inr(a.requestedCoverage)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <Steps steps={APP_STEPS} {...appStepProps(a.status)} />
              </Link>
            ))}
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
