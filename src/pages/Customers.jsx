import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { UserPlus, Search } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Pager, Segmented, Notice } from '../components/panel'
import CustomerFormModal from '../components/customers/CustomerFormModal'
import { useApi } from '../lib/useApi'
import { date, fullName } from '../lib/format'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export default function Customers() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [query, setQuery] = useState(params.get('search') || '')
  const [status, setStatus] = useState('')
  const [unassigned, setUnassigned] = useState(false)
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(params.get('action') === 'new')
  const [message, setMessage] = useState('')

  // Debounce search input before querying the server
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, body, loading, error, reload } = useApi('/customers', {
    page, limit: 15, search: query || undefined, status: status || undefined, unassigned: unassigned ? 'true' : undefined,
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Every policyholder record in the database, with servicing agent and portal access."
        actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Register customer</Button>}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="cust-search" prefixIcon={Search} placeholder="Name, customer no., email, phone, city" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
          <Segmented label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_FILTERS} />
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={unassigned} onChange={(e) => { setUnassigned(e.target.checked); setPage(1) }} />
            No servicing agent
          </label>
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={query || status || unassigned ? 'No customers match these filters.' : 'No customers registered yet.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact</th>
                  <th scope="col">City</th>
                  <th scope="col">Servicing agent</th>
                  <th scope="col" className="numeric">Policies</th>
                  <th scope="col" className="numeric">Applications</th>
                  <th scope="col" className="numeric">Claims</th>
                  <th scope="col">Portal</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/customers/${c.id}`} className="table-link" style={{ fontWeight: 600 }}>{fullName(c)}</Link>
                      <div className="mono">{c.customerNumber}</div>
                    </td>
                    <td>{c.email}<div className="muted" style={{ fontSize: 12 }}>{c.phone}</div></td>
                    <td>{c.city}</td>
                    <td>{c.assignedAgent ? <>{fullName(c.assignedAgent)}<div className="mono">{c.assignedAgent.agentNumber}</div></> : <span style={{ color: 'var(--status-amber-text)', fontSize: 12.5 }}>Unassigned</span>}</td>
                    <td className="numeric">{c._count.policies}</td>
                    <td className="numeric">{c._count.applications}</td>
                    <td className="numeric">{c._count.claims}</td>
                    <td>{c.userId ? 'Linked' : <span className="muted">None</span>}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="nowrap">{date(c.registrationDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <CustomerFormModal
        open={creating}
        customer={null}
        onClose={() => { setCreating(false); if (params.get('action')) setParams({}) }}
        onSaved={(c) => { setCreating(false); setMessage(`${fullName(c)} registered as ${c.customerNumber}.`); reload() }}
      />
    </div>
  )
}
