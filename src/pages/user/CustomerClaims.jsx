import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, titleCase } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import '../../styles/user.css'

export const CLAIM_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Under review' },
  { key: 'approved', label: 'Approved' },
  { key: 'settled', label: 'Settled' },
]

export function claimStepProps(status) {
  switch (status) {
    case 'PENDING': return { current: 'submitted' }
    case 'UNDER_REVIEW': return { current: 'review' }
    case 'APPROVED': return { current: 'approved' }
    case 'SETTLED': return { current: 'settled' }
    case 'REJECTED': return { current: 'approved', failed: true, failedLabel: 'Not approved' }
    default: return { current: 'submitted' }
  }
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SETTLED', label: 'Settled' },
]

export default function CustomerClaims() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, body, loading, error, reload } = useApi('/me/claims', { page, limit: 10, status })

  return (
    <div className="px-page">
      <PageHead
        title="Claims"
        sub="File a claim against an active policy and follow it through review and settlement."
        actions={<Link to="/user/claims/new" className="btn btn-primary"><FilePlus2 size={15} aria-hidden="true" /> File a claim</Link>}
      />
      <Panel flush title="My claims" action={<Segmented label="Filter by status" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />}>
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length === 0}
          emptyText={status ? 'No claims with this status.' : "You haven't filed any claims."}
        >
          <div>
            {data?.map((c) => (
              <Link key={c.id} to={`/user/claims/${c.id}`} className="cp-item">
                <div className="cp-item-main">
                  <div className="cp-item-title">{titleCase(c.claimType)} claim</div>
                  <div className="cp-item-meta">
                    <span className="mono">{c.claimNumber}</span> · {c.policy?.policyType?.name} · {c.policy?.policyNumber} · Filed {date(c.claimDate)}
                  </div>
                </div>
                <div className="cp-item-end">
                  <div style={{ textAlign: 'right' }}>
                    <div className="cp-amount">{inr(c.claimedAmount)}</div>
                    {c.approvedAmount != null && c.status !== 'REJECTED' && (
                      <div className="cp-item-meta">Approved {inr(c.approvedAmount)}</div>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
