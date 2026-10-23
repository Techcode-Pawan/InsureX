import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RotateCw, Download, BadgeCheck, Archive, CalendarClock, KeyRound } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { Panel, PanelLink, KpiBand, Kpi, DataState } from '../../components/panel'
import { useApi } from '../../lib/useApi'
import { inr, inrCompact, date, relativeDays, timeAgo, fullName, titleCase } from '../../lib/format'

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

// Fills the last 6 months so months with zero collections show as zero rather than disappearing.
function lastSixMonths(rows = []) {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const row = rows.find((r) => r.month === key)
    out.push({ month: monthLabel(key), amount: row ? Number(row.amount) : 0, payments: row ? row.payments : 0 })
  }
  return out
}

function ChartTip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey}>{p.name}: <strong>{money ? inr(p.value) : p.value}</strong></div>
      ))}
    </div>
  )
}

function exportCsv(d) {
  const m = d.metrics
  const rows = [
    ['Metric', 'Value'],
    ['Registered customers', m.totalCustomers],
    ['Active customers', m.activeCustomers],
    ['Agents (active / total)', `${m.activeAgents} / ${m.totalAgents}`],
    ['Active policies', m.activePolicies],
    ['Pending applications', m.pendingApplications],
    ['Premiums collected (INR)', m.premiumsCollected],
    ['Outstanding premium balance (INR)', m.outstandingBalance],
    ['Outstanding due now (INR)', m.outstandingDueNow],
    ['Overdue installments', m.overduePremiums],
    ['Open claims', m.openClaims],
    ['Open claim exposure (INR)', m.openClaimExposure],
    ['Policies expiring in 60 days', m.upcomingRenewals],
    ['Payments awaiting verification', m.pendingPayments],
    ['Documents awaiting review', m.pendingDocuments],
    [],
    ['Month', 'Premiums collected (INR)', 'Payments'],
    ...lastSixMonths(d.charts.monthlyCollections).map((r) => [r.month, r.amount, r.payments]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `insurex-operations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useApi('/admin/overview')
  const m = data?.metrics

  return (
    <div>
      <PageHeader
        title="Operations overview"
        subtitle={`Live figures from the InsureX database · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RotateCw} onClick={reload} loading={loading}>Refresh</Button>
            <Button variant="secondary" size="sm" icon={Download} disabled={!data} onClick={() => exportCsv(data)}>Export CSV</Button>
          </>
        }
      />

      {error && <DataState error={error} onRetry={reload} />}
      {!error && (
        <>
          <KpiBand cols={4}>
            <Kpi label="Registered customers" to="/admin/customers" value={m ? m.totalCustomers : '—'} foot={m && `${m.activeCustomers} active`} />
            <Kpi label="Agents" to="/admin/agents" value={m ? m.totalAgents : '—'} foot={m && `${m.activeAgents} active`} />
            <Kpi label="Active policies" to="/admin/policies" value={m ? m.activePolicies : '—'} />
            <Kpi label="Pending applications" to="/admin/applications" value={m ? m.pendingApplications : '—'} foot={m && (m.pendingApplications ? 'Awaiting underwriting' : 'Queue clear')} tone={m?.pendingApplications ? 'warn' : ''} />
          </KpiBand>
          <KpiBand cols={4}>
            <Kpi label="Premiums collected" to="/admin/payments" value={m ? inrCompact(m.premiumsCollected) : '—'} foot={m && `${m.paymentsCount} confirmed payments`} />
            <Kpi label="Outstanding premium balance" to="/admin/premiums" value={m ? inrCompact(m.outstandingBalance) : '—'} foot={m && `${inrCompact(m.outstandingDueNow)} due now · ${m.overduePremiums} overdue`} tone={m?.overduePremiums ? 'bad' : ''} />
            <Kpi label="Open claims" to="/admin/claims" value={m ? m.openClaims : '—'} foot={m && `${inrCompact(m.openClaimExposure)} claimed`} />
            <Kpi label="Upcoming renewals" to="/admin/renewals" value={m ? m.upcomingRenewals : '—'} foot={m && `Next 60 days · ${m.openRenewals} renewals open`} />
          </KpiBand>

          <div className="px-grid main-side" style={{ marginBottom: 16 }}>
            <Panel title="Premium collections" note="Confirmed payments, last 6 months">
              {loading && !data ? <div className="skel" style={{ height: 220 }} /> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lastSixMonths(data?.charts.monthlyCollections)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={inrCompact} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<ChartTip money />} cursor={{ fill: '#F5F8FC' }} />
                      <Bar dataKey="amount" name="Collected" fill="#168BFF" radius={[3, 3, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Needs attention" note="Work waiting on operations" flush>
              <ul className="rows">
                {[
                  { to: '/admin/verifications', icon: BadgeCheck, label: 'Payments awaiting verification', value: m?.pendingPayments },
                  { to: '/admin/verifications', icon: Archive, label: 'Documents awaiting review', value: m?.pendingDocuments },
                  { to: '/admin/premiums', icon: CalendarClock, label: 'Overdue premium installments', value: m?.overduePremiums },
                  { to: '/admin/access', icon: KeyRound, label: 'Manage logins & account links', value: null },
                ].map(({ to, icon: Icon, label, value }) => (
                  <li key={label}>
                    <Link to={to} className="row">
                      <Icon size={17} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
                      <div className="row-main"><div className="row-title" style={{ fontWeight: 500 }}>{label}</div></div>
                      {value !== null && <div className="row-end row-amount">{value ?? '—'}</div>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="px-grid cols-2" style={{ marginBottom: 16 }}>
            <Panel title="Application queue" note="Oldest pending first" action={<PanelLink to="/admin/applications">Review all</PanelLink>} flush>
              <DataState loading={loading && !data} empty={data?.queues.applications.length === 0} emptyText="No applications are waiting for review.">
                <ul className="rows">
                  {data?.queues.applications.map((a) => (
                    <li key={a.id} className="row">
                      <div className="row-main">
                        <div className="row-title">{fullName(a.customer)} · {a.policyType.name}</div>
                        <div className="row-meta">
                          <span className="mono">{a.applicationNumber}</span> · submitted {relativeDays(a.applicationDate)}
                          {a.assistedByAgent && ` · via ${fullName(a.assistedByAgent)}`}
                        </div>
                      </div>
                      <div className="row-end row-amount">{inr(a.requestedCoverage)}</div>
                    </li>
                  ))}
                </ul>
              </DataState>
            </Panel>

            <Panel title="Claim queue" note="Open claims, oldest first" action={<PanelLink to="/admin/claim-processing">Process</PanelLink>} flush>
              <DataState loading={loading && !data} empty={data?.queues.claims.length === 0} emptyText="No open claims.">
                <ul className="rows">
                  {data?.queues.claims.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/claims/${c.id}`} className="row">
                        <div className="row-main">
                          <div className="row-title">{fullName(c.customer)} · {c.claimType}</div>
                          <div className="row-meta">
                            <span className="mono">{c.claimNumber}</span> · {date(c.claimDate)} · {c.assignedAgent ? `assessor ${fullName(c.assignedAgent)}` : 'unassigned'}
                          </div>
                        </div>
                        <div className="row-end">
                          <div className="row-amount">{inr(c.claimedAmount)}</div>
                          <StatusBadge status={c.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </DataState>
            </Panel>
          </div>

          <div className="px-grid cols-3" style={{ marginBottom: 16 }}>
            <Panel title="Renewal alerts" note="Active policies expiring within 60 days" action={<PanelLink to="/admin/renewals">Renewals</PanelLink>} flush>
              <DataState loading={loading && !data} empty={data?.queues.renewals.length === 0} emptyText="No policies expire in the next 60 days.">
                <ul className="rows">
                  {data?.queues.renewals.map((p) => (
                    <li key={p.id}>
                      <Link to={`/admin/policies/${p.id}`} className="row">
                        <div className="row-main">
                          <div className="row-title">{p.policyNumber}</div>
                          <div className="row-meta">{fullName(p.customer)} · {p.policyType.name}</div>
                        </div>
                        <div className="row-end" style={{ fontSize: 12.5 }}>
                          <div style={{ fontWeight: 600 }}>{date(p.expiryDate)}</div>
                          <div className={p.openRenewal ? 'muted' : ''} style={p.openRenewal ? undefined : { color: 'var(--status-amber-text)' }}>
                            {p.openRenewal ? `${p.openRenewal.renewalNumber} open` : 'No renewal opened'}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </DataState>
            </Panel>

            <Panel title="Active book by plan" note="Active policies per policy type">
              <DataState loading={loading && !data} empty={data?.charts.policiesByType.every((p) => p.count === 0)} emptyText="No active policies yet.">
                <ul className="rows" style={{ margin: '-4px 0' }}>
                  {data?.charts.policiesByType.map((p) => {
                    const max = Math.max(1, ...data.charts.policiesByType.map((x) => x.count))
                    return (
                      <li key={p.name} style={{ padding: '6px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span>{p.name}</span><span className="num" style={{ fontWeight: 600 }}>{p.count}</span>
                        </div>
                        <div className="meter"><span style={{ width: `${(p.count / max) * 100}%` }} /></div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{inrCompact(p.sumAssured)} sum assured</div>
                      </li>
                    )
                  })}
                </ul>
              </DataState>
            </Panel>

            <Panel title="Claims by status" note="All claims on record">
              <DataState loading={loading && !data} empty={data?.charts.claimsByStatus.length === 0} emptyText="No claims on record.">
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead><tr><th scope="col">Status</th><th scope="col" className="numeric">Claims</th><th scope="col" className="numeric">Claimed</th></tr></thead>
                  <tbody>
                    {data?.charts.claimsByStatus.map((c) => (
                      <tr key={c.status}>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="numeric">{c.count}</td>
                        <td className="numeric">{inrCompact(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataState>
            </Panel>
          </div>

          <Panel title="Recent activity" note="Audit trail of business events across the platform" flush>
            <DataState loading={loading && !data} empty={data?.recentActivity.length === 0} emptyText="No activity has been recorded yet. Events appear here as applications, payments, claims and renewals are processed.">
              <ul className="rows">
                {data?.recentActivity.map((a) => (
                  <li key={a.id} className="row">
                    <div className="row-main">
                      <div className="row-title" style={{ fontWeight: 500, whiteSpace: 'normal' }}>{a.summary}</div>
                      <div className="row-meta">{titleCase(a.action)} · {a.actor?.name ? `${a.actor.name} (${titleCase(a.actorRole)})` : 'System'}</div>
                    </div>
                    <div className="row-end muted" style={{ fontSize: 12 }}>{timeAgo(a.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </>
      )}
    </div>
  )
}
