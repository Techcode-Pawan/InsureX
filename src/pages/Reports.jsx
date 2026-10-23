import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, RotateCw } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, DataState } from '../components/panel'
import { useApi } from '../lib/useApi'
import { inr, inrCompact, dateTime, titleCase } from '../lib/format'

const AXIS = { fontSize: 12, fill: '#64748B' }

function csvDownload(name, rows) {
  if (!rows?.length) return
  const cols = Object.keys(rows[0])
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
  a.download = `insurex-${name}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function ExportButton({ name, rows }) {
  return (
    <Button size="sm" variant="ghost" icon={Download} disabled={!rows?.length} onClick={() => csvDownload(name, rows)} aria-label={`Export ${name} as CSV`}>
      CSV
    </Button>
  )
}

// Fills all 12 months so empty months render as zero instead of being skipped.
function twelveMonths(rows = []) {
  const out = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const row = rows.find((r) => r.month === key)
    out.push({
      month: key,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      amount: row ? Number(row.amount) : 0,
      payments: row ? row.payments : 0,
    })
  }
  return out
}

function MoneyTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey}>{p.name}: <strong>{inr(p.value)}</strong></div>)}
    </div>
  )
}

export default function Reports() {
  const { data, loading, error, reload } = useApi('/reports/summary')
  const months = twelveMonths(data?.premiumsByMonth)
  const collected12 = months.reduce((s, m) => s + m.amount, 0)
  const annualPremium = (data?.policiesByType || []).reduce((s, p) => s + p.annualPremium, 0)
  const outstanding = (data?.premiumsByStatus || []).reduce((s, p) => s + p.outstanding, 0)
  const settled = (data?.claimsByStatus || []).find((c) => c.status === 'SETTLED')
  const decided = (data?.claimsByStatus || []).filter((c) => ['APPROVED', 'SETTLED', 'REJECTED'].includes(c.status))
  const approvedCount = decided.filter((c) => c.status !== 'REJECTED').reduce((s, c) => s + c.count, 0)
  const decidedCount = decided.reduce((s, c) => s + c.count, 0)
  const empty = loading && !data

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={data ? `Aggregated from the live database · generated ${dateTime(data.generatedAt)}` : 'Aggregated from the live database'}
        actions={<Button variant="secondary" size="sm" icon={RotateCw} loading={loading} onClick={reload}>Refresh</Button>}
      />

      {error ? <Panel><DataState error={error} onRetry={reload} /></Panel> : (
        <>
          <KpiBand cols={4}>
            <Kpi label="Collected, last 12 months" value={data ? inrCompact(collected12) : '—'} foot={data && `${months.reduce((s, m) => s + m.payments, 0)} confirmed payments`} />
            <Kpi label="Annualised premium, active book" value={data ? inrCompact(annualPremium) : '—'} foot="Installment × frequency" />
            <Kpi label="Outstanding premiums" value={data ? inrCompact(outstanding) : '—'} foot="Billed but not yet paid" tone={outstanding > 0 ? 'warn' : ''} />
            <Kpi label="Claims settled" value={data ? inrCompact(settled?.approved || 0) : '—'}
              foot={data && (decidedCount ? `${Math.round((approvedCount / decidedCount) * 100)}% of decided claims approved` : 'No decided claims yet')} />
          </KpiBand>

          <Panel title="Premium collections" note="Confirmed payments per month, last 12 months" action={<ExportButton name="premium-collections" rows={months.map(({ month, amount, payments }) => ({ month, amount, payments }))} />} className="" >
            {empty ? <div className="skel" style={{ height: 260 }} /> : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={inrCompact} tick={AXIS} axisLine={false} tickLine={false} width={56} />
                    <Tooltip content={<MoneyTip />} cursor={{ fill: '#F5F8FC' }} />
                    <Bar dataKey="amount" name="Collected" fill="#168BFF" radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {data && collected12 === 0 && <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>No confirmed payments in the last 12 months.</p>}
          </Panel>

          <div className="px-grid cols-2" style={{ margin: '16px 0' }}>
            <Panel title="Book by policy type" note="Active policies, cover and annualised premium" action={<ExportButton name="policies-by-type" rows={data?.policiesByType} />} flush>
              <DataState loading={empty} empty={data?.policiesByType.length === 0} emptyText="No policy types defined.">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr><th scope="col">Policy type</th><th scope="col" className="numeric">Active</th><th scope="col" className="numeric">All-time</th><th scope="col" className="numeric">Sum assured</th><th scope="col" className="numeric">Annual premium</th></tr></thead>
                    <tbody>
                      {data?.policiesByType.map((p) => (
                        <tr key={p.policyType}>
                          <td>{p.policyType}</td>
                          <td className="numeric">{p.active}</td>
                          <td className="numeric">{p.total}</td>
                          <td className="numeric">{inrCompact(p.sumAssured)}</td>
                          <td className="numeric">{inr(p.annualPremium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataState>
            </Panel>

            <Panel title="Claims by status" note="Claimed versus approved amounts" action={<ExportButton name="claims-by-status" rows={data?.claimsByStatus} />}>
              <DataState loading={empty} empty={data?.claimsByStatus.length === 0} emptyText="No claims on record.">
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data?.claimsByStatus || []).map((c) => ({ ...c, label: titleCase(c.status), approvedShown: c.status === 'REJECTED' ? 0 : c.approved }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={inrCompact} tick={AXIS} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<MoneyTip />} cursor={{ fill: '#F5F8FC' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="claimed" name="Claimed" fill="#061426" radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="approvedShown" name="Approved" fill="#20B8FF" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="rows" style={{ marginTop: 8 }}>
                  {data?.claimsByStatus.map((c) => (
                    <li key={c.status} className="row" style={{ padding: '8px 0' }}>
                      <StatusBadge status={c.status} />
                      <div className="row-main muted" style={{ fontSize: 12.5 }}>{c.count} claim{c.count === 1 ? '' : 's'}</div>
                      <div className="row-end" style={{ fontSize: 12.5 }}>{inr(c.claimed)} claimed</div>
                    </li>
                  ))}
                </ul>
              </DataState>
            </Panel>

            <Panel title="Premium installments by status" note="Billed and outstanding amounts" action={<ExportButton name="premiums-by-status" rows={data?.premiumsByStatus} />} flush>
              <DataState loading={empty} empty={data?.premiumsByStatus.length === 0} emptyText="No premium installments billed yet.">
                <table className="data-table">
                  <thead><tr><th scope="col">Status</th><th scope="col" className="numeric">Installments</th><th scope="col" className="numeric">Billed</th><th scope="col" className="numeric">Outstanding</th></tr></thead>
                  <tbody>
                    {data?.premiumsByStatus.map((p) => (
                      <tr key={p.status}>
                        <td><StatusBadge status={p.status} /></td>
                        <td className="numeric">{p.count}</td>
                        <td className="numeric">{inr(p.billed)}</td>
                        <td className="numeric">{inr(p.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataState>
            </Panel>

            <Panel title="Payments by method" note="Confirmed payments, all time" action={<ExportButton name="payments-by-method" rows={data?.paymentsByMethod} />} flush>
              <DataState loading={empty} empty={data?.paymentsByMethod.length === 0} emptyText="No confirmed payments yet.">
                <table className="data-table">
                  <thead><tr><th scope="col">Method</th><th scope="col" className="numeric">Payments</th><th scope="col" className="numeric">Amount</th></tr></thead>
                  <tbody>
                    {data?.paymentsByMethod.map((p) => (
                      <tr key={p.method}>
                        <td>{titleCase(p.method)}</td>
                        <td className="numeric">{p.count}</td>
                        <td className="numeric">{inr(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataState>
            </Panel>
          </div>

          <Panel title="Agent performance" note="Assigned customers, active policies, approved assisted applications and premium collected on each agent's policies"
            action={<ExportButton name="agent-performance" rows={data?.agentLeaderboard.map(({ id: _id, ...r }) => r)} />} flush>
            <DataState loading={empty} empty={data?.agentLeaderboard.length === 0} emptyText="No agents registered.">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Agent</th><th scope="col">Status</th><th scope="col" className="numeric">Customers</th>
                      <th scope="col" className="numeric">Active policies</th><th scope="col" className="numeric">Approved applications</th>
                      <th scope="col" className="numeric">Premium collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.agentLeaderboard.map((a) => (
                      <tr key={a.id}>
                        <td>{a.firstName} {a.lastName} <span className="mono">{a.agentNumber}</span></td>
                        <td><StatusBadge status={a.status} /></td>
                        <td className="numeric">{a.customers}</td>
                        <td className="numeric">{a.activePolicies}</td>
                        <td className="numeric">{a.approvedApplications}</td>
                        <td className="numeric">{inr(a.premiumCollected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataState>
          </Panel>
        </>
      )}
    </div>
  )
}
