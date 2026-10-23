import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Pager, Segmented, Notice } from '../components/panel'
import { useApi } from '../lib/useApi'
import { inr, date, daysUntil, fullName, titleCase } from '../lib/format'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function Policies() {
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('customerId') || undefined
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [policyTypeId, setPolicyTypeId] = useState('')
  const [expiring, setExpiring] = useState(false)
  const [page, setPage] = useState(1)
  const types = useApi('/policy-types')
  const { data, body, loading, error, reload } = useApi('/policies', {
    status, search: search.trim() || undefined, policyTypeId, customerId,
    expiringWithinDays: expiring ? 60 : undefined, page, limit: 15,
  })

  const reset = (fn) => (v) => { fn(v); setPage(1) }

  return (
    <div>
      <PageHeader
        title="Insurance policies"
        subtitle="Every policy in the book. Policies are issued by approving an application in the underwriting queue."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RotateCw} onClick={reload}>Refresh</Button>
            <Link to="/admin/applications" className="btn btn-primary btn-sm">Underwriting queue</Link>
          </>
        }
      />
      {customerId && (
        <div style={{ marginBottom: 12 }}>
          <Notice>Showing policies for one customer. <Link to="/admin/policies" className="table-link">Show all policies</Link></Notice>
        </div>
      )}

      <Panel flush>
        <div className="filters">
          <Input id="pol-search" prefixIcon={Search} placeholder="Policy no., customer or plan" aria-label="Search policies"
            value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
          <Select id="pol-type" aria-label="Filter by plan" value={policyTypeId} onChange={(e) => reset(setPolicyTypeId)(e.target.value)}
            options={[{ value: '', label: 'All plans' }, ...(types.data || []).map((t) => ({ value: t.id, label: t.name }))]} />
          <Segmented label="Filter by status" value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={expiring} onChange={(e) => reset(setExpiring)(e.target.checked)} /> Expiring in 60 days
          </label>
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No policies match these filters.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Policy</th><th scope="col">Policyholder</th><th scope="col">Plan</th>
                  <th scope="col" className="numeric">Sum assured</th><th scope="col" className="numeric">Premium</th>
                  <th scope="col">Term</th><th scope="col">Agent</th><th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => {
                  const left = daysUntil(p.expiryDate)
                  return (
                    <tr key={p.id}>
                      <td><Link className="table-link mono" to={`/admin/policies/${p.id}`}>{p.policyNumber}</Link></td>
                      <td>
                        <Link className="table-link" to={`/admin/customers/${p.customer.id}`}>{fullName(p.customer)}</Link>
                        <div className="muted" style={{ fontSize: 12 }}>{p.customer.customerNumber}</div>
                      </td>
                      <td>{p.policyType.name}{p.company && <div className="muted" style={{ fontSize: 12 }}>{p.company.name}</div>}</td>
                      <td className="numeric">{inr(p.sumAssured)}</td>
                      <td className="numeric">{inr(p.premiumAmount)}<div className="muted" style={{ fontSize: 12 }}>{titleCase(p.premiumFrequency)}</div></td>
                      <td className="nowrap">
                        {date(p.startDate)} – {date(p.expiryDate)}
                        {p.status === 'ACTIVE' && left !== null && left <= 60 && (
                          <div style={{ fontSize: 12, color: left < 0 ? 'var(--status-red-text)' : 'var(--status-amber-text)' }}>
                            {left < 0 ? `Expired ${-left} days ago` : `Expires in ${left} days`}
                          </div>
                        )}
                      </td>
                      <td>{p.agent ? fullName(p.agent) : <span className="muted">—</span>}</td>
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
