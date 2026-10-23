import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, FilePlus2 } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, fullName } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'In progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Withdrawn' },
]

export default function AgentApplications() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [page, setPage] = useState(1)
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setSearch(term.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [term])

  const { data, body, loading, error, reload } = useApi('/agent/applications', { page, limit: 15, status, search })

  return (
    <div className="px-page">
      <PageHead
        eyebrow="My book"
        title="Applications"
        sub="Applications from your customers and those you helped submit. Underwriting decisions are made by administrators."
        actions={<Link to="/agent/applications/new" className="btn btn-primary btn-sm"><FilePlus2 size={15} aria-hidden="true" /> New application</Link>}
      />
      <Panel flush>
        <div className="filters">
          <div className="input-wrapper">
            <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
            <label htmlFor="app-filter" className="sr-only">Search applications</label>
            <input id="app-filter" className="input input-icon-left" placeholder="Application number, customer or plan" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Segmented
            label="Application status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => { setPage(1); setParams(v ? { status: v } : {}) }}
          />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status || search ? 'No applications match these filters.' : 'No applications yet.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className="numeric">Cover requested</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((a) => (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/agent/applications/${a.id}`)}>
                    <td>
                      <Link to={`/agent/applications/${a.id}`} className="table-link" onClick={(e) => e.stopPropagation()}>{a.applicationNumber}</Link>
                      {a.assistedByAgent && <div className="table-subtext">Assisted by you</div>}
                    </td>
                    <td>{fullName(a.customer)}<div className="mono">{a.customer.customerNumber}</div></td>
                    <td>{a.policyType.name}</td>
                    <td className="numeric">{inr(a.requestedCoverage)}</td>
                    <td className="nowrap">{date(a.applicationDate)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                      {a.policy && <div className="mono" style={{ marginTop: 2 }}>{a.policy.policyNumber}</div>}
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
