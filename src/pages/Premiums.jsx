import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Notice, DataState, Pager, Segmented } from '../components/panel'
import RecordPaymentModal from '../components/policies/RecordPaymentModal'
import { useApi } from '../lib/useApi'
import { inr, inrCompact, date, daysUntil, fullName } from '../lib/format'

const FILTERS = [
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'DUE', label: 'Due' },
  { value: 'PARTIALLY_PAID', label: 'Part paid' },
  { value: 'PAID', label: 'Paid' },
  { value: '', label: 'All' },
]

export default function Premiums() {
  const [status, setStatus] = useState('OVERDUE')
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/premiums', { status, page, limit: 20 })
  const overview = useApi('/admin/overview')
  const [paying, setPaying] = useState(null)
  const [message, setMessage] = useState('')
  const m = overview.data?.metrics

  function done(msg) {
    setPaying(null)
    setMessage(msg)
    reload()
    overview.reload()
  }

  return (
    <div>
      <PageHeader
        title="Premium schedule"
        subtitle="Installments billed on every policy, with what remains to be collected. Status moves to overdue automatically after the due date."
        actions={<Button variant="secondary" size="sm" icon={RotateCw} onClick={() => { reload(); overview.reload() }}>Refresh</Button>}
      />

      <KpiBand cols={4}>
        <Kpi label="Outstanding balance" value={m ? inrCompact(m.outstandingBalance) : '—'} foot="All unpaid installments" />
        <Kpi label="Due now" value={m ? inrCompact(m.outstandingDueNow) : '—'} foot="Due date reached" tone={m?.outstandingDueNow ? 'warn' : ''} />
        <Kpi label="Overdue installments" value={m ? m.overduePremiums : '—'} tone={m?.overduePremiums ? 'bad' : ''} />
        <Kpi label="Collected to date" value={m ? inrCompact(m.premiumsCollected) : '—'} to="/admin/payments" foot={m && `${m.paymentsCount} confirmed payments`} />
      </KpiBand>

      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <Panel flush title="Installments" action={<Segmented label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={FILTERS} />}>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status === 'OVERDUE' ? 'No overdue installments.' : 'No installments match this filter.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Installment</th><th scope="col">Policy · customer</th><th scope="col">Due</th>
                  <th scope="col" className="numeric">Amount</th><th scope="col" className="numeric">Paid</th><th scope="col" className="numeric">Outstanding</th>
                  <th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((x) => {
                  const d = daysUntil(x.dueDate)
                  const pending = x.payments?.filter((pay) => pay.status === 'PENDING') || []
                  return (
                    <tr key={x.id} style={x.status === 'OVERDUE' ? { background: '#FFFBFB' } : undefined}>
                      <td className="mono">{x.premiumNumber}</td>
                      <td>
                        <Link className="table-link" to={`/admin/policies/${x.policy.id}`}>{x.policy.policyNumber}</Link>
                        <div className="muted" style={{ fontSize: 12 }}>{fullName(x.policy.customer)} · {x.policy.policyType?.name}</div>
                      </td>
                      <td className="nowrap">
                        {date(x.dueDate)}
                        {x.remainingBalance > 0 && d !== null && (
                          <div style={{ fontSize: 12, color: d < 0 ? 'var(--status-red-text)' : 'var(--color-text-secondary)' }}>
                            {d < 0 ? `${-d} days late` : d === 0 ? 'Due today' : `in ${d} days`}
                          </div>
                        )}
                      </td>
                      <td className="numeric">{inr(x.amount, { exact: true })}</td>
                      <td className="numeric">{inr(x.paidAmount, { exact: true })}</td>
                      <td className="numeric" style={{ fontWeight: 600 }}>{inr(x.remainingBalance, { exact: true })}</td>
                      <td>
                        <StatusBadge status={x.status} />
                        {pending.length > 0 && <div><Link to="/admin/verifications" style={{ fontSize: 12 }} className="table-link">{pending.length} awaiting verification</Link></div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {x.remainingBalance > 0 && <Button size="sm" variant="secondary" onClick={() => setPaying(x)}>Record payment</Button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <RecordPaymentModal premium={paying} onClose={() => setPaying(null)} onDone={done} />
    </div>
  )
}
