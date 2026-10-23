import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { inr, date, relativeDays, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented, Notice } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'

const STATUS_OPTIONS = [
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'DUE', label: 'Due' },
  { value: 'PARTIALLY_PAID', label: 'Part paid' },
  { value: 'PAID', label: 'Paid' },
  { value: '', label: 'All' },
]

export default function AgentPremiums() {
  const [status, setStatus] = useState('OVERDUE')
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/agent/premiums', { page, limit: 20, status })

  return (
    <div className="px-page">
      <PageHead
        eyebrow="Follow-ups"
        title="Premium dues"
        sub="Installment due dates and payment status across your book, earliest due first. Payments are recorded and verified by the accounts team."
      />
      <Notice style={{ marginBottom: 16 }}>
        You can see whether an installment has been paid, but not bank references or payment details. Ask customers to pay from their InsureX portal or at a branch.
      </Notice>
      <Panel flush>
        <div className="filters">
          <Segmented label="Installment status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status === 'OVERDUE' ? 'No overdue installments in your book.' : 'No installments match this filter.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Policy</th>
                  <th scope="col">Due</th>
                  <th scope="col" className="numeric">Installment</th>
                  <th scope="col" className="numeric">Outstanding</th>
                  <th scope="col">Payments</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => {
                  const latest = p.payments[p.payments.length - 1]
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/agent/customers/${p.policy.customer.id}`} className="table-link">{fullName(p.policy.customer)}</Link>
                      </td>
                      <td>
                        <Link to={`/agent/policies/${p.policy.id}`} className="table-link">{p.policy.policyNumber}</Link>
                        <div className="table-subtext">{p.policy.policyType.name} · <span className="mono">{p.premiumNumber}</span></div>
                      </td>
                      <td className="nowrap">
                        {date(p.dueDate)}
                        {p.status !== 'PAID' && <div className="table-subtext">{relativeDays(p.dueDate)}</div>}
                      </td>
                      <td className="numeric">{inr(p.amount)}</td>
                      <td className="numeric" style={{ fontWeight: p.remainingBalance > 0 ? 600 : 400 }}>{inr(p.remainingBalance)}</td>
                      <td>
                        {latest ? (
                          <>
                            <div className="nowrap">{inr(latest.amount)} on {date(latest.paymentDate)}</div>
                            <div className="table-subtext">{titleCase(latest.status === 'SUCCESS' ? 'confirmed' : latest.status)}{p.payments.length > 1 ? ` · ${p.payments.length} payments` : ''}</div>
                          </>
                        ) : <span className="muted">None yet</span>}
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
