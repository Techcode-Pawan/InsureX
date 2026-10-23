import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, fullName, titleCase, daysUntil } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function AgentPolicies() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setSearch(term.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [term])

  const { data, body, loading, error, reload } = useApi('/agent/policies', { page, limit: 15, status, search })

  return (
    <div className="px-page">
      <PageHead eyebrow="My book" title="Policies" sub="Policies held by your customers or serviced by you, soonest expiry first." />
      <Panel flush>
        <div className="filters">
          <div className="input-wrapper">
            <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
            <label htmlFor="pol-filter" className="sr-only">Search policies</label>
            <input id="pol-filter" className="input input-icon-left" placeholder="Policy number or customer name" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Segmented label="Policy status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status || search ? 'No policies match these filters.' : 'No policies in your book yet.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Policy</th>
                  <th scope="col">Customer</th>
                  <th scope="col" className="numeric">Sum assured</th>
                  <th scope="col" className="numeric">Premium</th>
                  <th scope="col">Term</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => {
                  const left = daysUntil(p.expiryDate)
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/agent/policies/${p.id}`)}>
                      <td>
                        <Link to={`/agent/policies/${p.id}`} className="table-link" onClick={(e) => e.stopPropagation()}>{p.policyNumber}</Link>
                        <div className="table-subtext">{p.policyType.name}</div>
                      </td>
                      <td>{fullName(p.customer)}<div className="mono">{p.customer.customerNumber}</div></td>
                      <td className="numeric">{inr(p.sumAssured)}</td>
                      <td className="numeric">{inr(p.premiumAmount)}<div className="table-subtext">{titleCase(p.premiumFrequency)}</div></td>
                      <td className="nowrap">
                        {date(p.startDate)} – {date(p.expiryDate)}
                        {p.status === 'ACTIVE' && left >= 0 && left <= 60 && (
                          <div className="table-subtext" style={{ color: 'var(--status-amber-text)' }}>Expires in {left} days</div>
                        )}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
