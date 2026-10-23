import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../context/AuthContext'
import { inr, date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function AgentClaims() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setSearch(term.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [term])

  const { data, body, loading, error, reload } = useApi('/agent/claims', { page, limit: 15, status, search })
  const myAgentId = user?.agentProfile?.id

  return (
    <div className="px-page">
      <PageHead
        eyebrow="Follow-ups"
        title="Claims"
        sub="Claims filed by your customers and claims assigned to you for verification. Claim decisions and settlements are made by administrators."
      />
      <Panel flush>
        <div className="filters">
          <div className="input-wrapper">
            <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
            <label htmlFor="claim-filter" className="sr-only">Search claims</label>
            <input id="claim-filter" className="input input-icon-left" placeholder="Claim number, policy or customer" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Segmented label="Claim status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status || search ? 'No claims match these filters.' : 'No claims in your book.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Policy</th>
                  <th scope="col">Filed</th>
                  <th scope="col" className="numeric">Claimed</th>
                  <th scope="col" className="numeric">Approved</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/agent/claims/${c.id}`)}>
                    <td>
                      <Link to={`/agent/claims/${c.id}`} className="table-link" onClick={(e) => e.stopPropagation()}>{c.claimNumber}</Link>
                      <div className="table-subtext">{c.claimType}{c.assignedAgentId && c.assignedAgentId === myAgentId ? ' · assigned to you' : ''}</div>
                    </td>
                    <td>{fullName(c.customer)}</td>
                    <td>{c.policy.policyNumber}<div className="table-subtext">{c.policy.policyType?.name}</div></td>
                    <td className="nowrap">{date(c.claimDate)}</td>
                    <td className="numeric">{inr(c.claimedAmount)}</td>
                    <td className="numeric">{c.approvedAmount != null ? inr(c.approvedAmount) : '—'}</td>
                    <td>
                      <StatusBadge status={c.status} />
                      {c.processingStatus && c.processingStatus !== c.status && <div className="table-subtext">{titleCase(c.processingStatus)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
