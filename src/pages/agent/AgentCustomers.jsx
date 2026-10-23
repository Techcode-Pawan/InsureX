import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { date, fullName } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export default function AgentCustomers() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setSearch(term.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [term])

  const { data, body, loading, error, reload } = useApi('/agent/customers', { page, limit: 15, status, search })

  return (
    <div className="px-page">
      <PageHead
        eyebrow="My book"
        title="Customers"
        sub="Customers assigned to you. Only your own book is visible here."
        actions={<Link to="/agent/customers/new" className="btn btn-primary btn-sm"><UserPlus size={15} aria-hidden="true" /> Register customer</Link>}
      />
      <Panel flush>
        <div className="filters">
          <div className="input-wrapper">
            <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
            <label htmlFor="cust-filter" className="sr-only">Filter customers</label>
            <input id="cust-filter" className="input input-icon-left" placeholder="Name, customer number, email or phone" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Segmented label="Customer status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={search || status ? 'No customers match these filters.' : 'No customers are assigned to you yet. Register a customer to start building your book.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact</th>
                  <th scope="col">City</th>
                  <th scope="col" className="numeric">Active policies</th>
                  <th scope="col" className="numeric">Open applications</th>
                  <th scope="col">Customer since</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/agent/customers/${c.id}`)}>
                    <td>
                      <Link to={`/agent/customers/${c.id}`} className="table-link" onClick={(e) => e.stopPropagation()}>{fullName(c)}</Link>
                      <div className="mono">{c.customerNumber}</div>
                    </td>
                    <td>
                      <div className="nowrap">{c.phone}</div>
                      <div className="table-subtext">{c.email}</div>
                    </td>
                    <td>{c.city}, {c.state}</td>
                    <td className="numeric">{c._count.policies}</td>
                    <td className="numeric">{c._count.applications}</td>
                    <td className="nowrap">{date(c.registrationDate)}</td>
                    <td><StatusBadge status={c.status} /></td>
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
