import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, relativeDays, titleCase } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import '../../styles/user.css'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function CustomerPolicies() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, body, loading, error, reload } = useApi('/me/policies', { page, limit: 10, status })

  return (
    <div className="px-page">
      <PageHead
        title="My policies"
        sub="Your cover, policy numbers, policy periods and premiums in one place."
        actions={<Link to="/user/plans" className="btn btn-secondary"><Compass size={15} aria-hidden="true" /> Explore plans</Link>}
      />
      <Panel flush title="Policies" action={<Segmented label="Filter by status" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />}>
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length === 0}
          emptyText={status ? 'No policies with this status.' : 'You have no policies yet. Once an application is approved, your policy appears here.'}
        >
          <div>
            {data?.map((p) => (
              <Link key={p.id} to={`/user/policies/${p.id}`} className="cp-policy">
                <div className="cp-policy-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="cp-policy-name">{p.policyType?.name}</div>
                    <div className="mono">{p.policyNumber}{p.company?.name ? ` · ${p.company.name}` : ''}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="cp-policy-facts">
                  <span>Cover <strong>{inr(p.sumAssured)}</strong></span>
                  <span>Premium <strong>{inr(p.premiumAmount)}</strong> {titleCase(p.premiumFrequency)}</span>
                  <span>
                    {date(p.startDate)} – <strong>{date(p.expiryDate)}</strong>
                    {p.status === 'ACTIVE' && ` (expires ${relativeDays(p.expiryDate)})`}
                  </span>
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
