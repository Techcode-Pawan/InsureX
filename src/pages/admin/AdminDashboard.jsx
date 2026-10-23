import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Download, BadgeCheck, Archive, CalendarClock, KeyRound, X } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { Panel, PanelLink, KpiBand, Kpi, DataState, Notice } from '../../components/panel'
import {
  CHART, STATUS_COLOR, SERIES, axisProps, periodLabel, ChartTooltip, ChartCard,
  DateRangeFilter, rangeForPreset, RefreshBar, StatusLegend,
} from '../../components/charts'
import { useApi } from '../../lib/useApi'
import { inr, inrCompact, date, relativeDays, timeAgo, fullName, titleCase } from '../../lib/format'
import '../../styles/admin.css'

const POLL_MS = 60000

const allZero = (rows, keys) => !rows?.length || rows.every((r) => keys.every((k) => !Number(r[k])))
const sum = (rows, key) => (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0)

function csvCell(c) {
  return `"${String(c ?? '').replace(/"/g, '""')}"`
}

function exportCsv({ overview, analytics, filterLabels }) {
  const k = analytics?.kpis || {}
  const m = overview?.metrics || {}
  const r = analytics?.range || {}
  const rows = [
    ['InsureX operations export', new Date().toISOString()],
    ['Date range', `${r.from} to ${r.to}`, `grouped by ${r.granularity}`, `time zone ${r.timezone}`],
    ['Filters', filterLabels.length ? filterLabels.join('; ') : 'None'],
    [],
    ['Analytics KPI (filters applied)', 'Value'],
    ['Customers', k.customers],
    ['New customers in range', k.newCustomersInRange],
    ['Agents (active / total)', `${k.activeAgents} / ${k.agents}`],
    ['Applications (all)', k.applications],
    ['Applications submitted in range', k.applicationsSubmittedInRange],
    ['Applications pending', k.applicationsPending],
    ['Applications approved', k.applicationsApproved],
    ['Applications rejected', k.applicationsRejected],
    ['Active policies', k.activePolicies],
    ['Policies issued in range', k.policiesIssuedInRange],
    ['Premium due now (INR)', k.premiumsDueNow],
    ['Overdue installments', k.premiumsOverdueCount],
    ['Verified collections in range (INR)', k.verifiedCollectionsInRange],
    ['Payments awaiting verification', k.pendingVerifications],
    ['Amount awaiting verification (INR, not collected)', k.pendingVerificationAmount],
    ['Claims pending / under review', k.claimsPending],
    ['Claims approved', k.claimsApproved],
    ['Claims settled', k.claimsSettled],
    ['Policies expiring in 60 days', k.upcomingRenewals],
    [],
    ['Operational queue metric (unfiltered)', 'Value'],
    ['Payments awaiting verification', m.pendingPayments],
    ['Documents awaiting review', m.pendingDocuments],
    ['Open renewals', m.openRenewals],
    [],
    ['Period', 'Applications submitted', 'Approved', 'Rejected', 'Policies issued', 'Verified collections (INR)', 'Pending submissions (INR)', 'Billed due (INR)', 'New customers'],
    ...(analytics?.series.applications || []).map((a, i) => {
      const s = analytics.series
      return [a.period, a.submitted, a.approved, a.rejected, s.policiesIssued[i]?.issued, s.collections[i]?.verified, s.collections[i]?.pending, s.collections[i]?.billed, s.customerGrowth[i]?.registered]
    }),
    [],
    ['Agent', 'Customers', 'Applications', 'Approved', 'Policies issued', 'Verified collections (INR)'],
    ...(analytics?.breakdowns.agentPerformance || []).map((a) => [`${a.firstName} ${a.lastName} (${a.agentNumber})`, a.customers, a.applications, a.approved, a.policiesIssued, a.collections]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `insurex-operations-${r.from || 'export'}-to-${r.to || ''}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function FilterSelect({ id, label, value, onChange, options, loading }) {
  return (
    <div className="dash-filter">
      <label htmlFor={id} className="dash-filter-label">{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function StatusDonut({ rows, valueKey = 'count' }) {
  const data = rows.map((r) => ({ ...r, label: titleCase(r.status) }))
  return (
    <PieChart>
      <Pie data={data} dataKey={valueKey} nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>
        {data.map((r) => <Cell key={r.status} fill={STATUS_COLOR[r.status] || CHART.slate} />)}
      </Pie>
      <Tooltip content={<ChartTooltip labelFormatter={() => 'Status'} />} />
    </PieChart>
  )
}

export default function AdminDashboard() {
  const [range, setRange] = useState(() => rangeForPreset('6m'))
  const [agentId, setAgentId] = useState('')
  const [policyTypeId, setPolicyTypeId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [todayLabel] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))

  const overview = useApi('/admin/overview', {}, { pollMs: POLL_MS })
  const analytics = useApi('/admin/analytics', {
    from: range.from, to: range.to, granularity: range.granularity,
    agentId: agentId || undefined, policyTypeId: policyTypeId || undefined, companyId: companyId || undefined,
  }, { pollMs: POLL_MS })
  const agents = useApi('/agents')
  const policyTypes = useApi('/policy-types')
  const companies = useApi('/insurance-companies')

  const o = overview.data
  const a = analytics.data
  const k = a?.kpis
  const gran = a?.range.granularity || range.granularity
  const aLoading = analytics.loading && !a

  const agentOptions = useMemo(() => (agents.data || []).map((x) => ({ value: x.id, label: `${fullName(x)} (${x.agentNumber})` })), [agents.data])
  const typeOptions = useMemo(() => (policyTypes.data || []).map((x) => ({ value: x.id, label: x.name })), [policyTypes.data])
  const companyOptions = useMemo(() => (companies.data || []).map((x) => ({ value: x.id, label: x.name })), [companies.data])

  const filterLabels = [
    agentId && `Agent: ${agentOptions.find((x) => x.value === agentId)?.label || agentId}`,
    policyTypeId && `Policy type: ${typeOptions.find((x) => x.value === policyTypeId)?.label || policyTypeId}`,
    companyId && `Insurer: ${companyOptions.find((x) => x.value === companyId)?.label || companyId}`,
  ].filter(Boolean)
  const clearFilters = () => { setAgentId(''); setPolicyTypeId(''); setCompanyId('') }

  const series = a?.series
  const bd = a?.breakdowns
  const xTick = (v) => periodLabel(v, gran)
  const tipLabel = (v) => periodLabel(v, gran)

  const lastUpdated = [overview.lastUpdated, analytics.lastUpdated].filter(Boolean).sort((x, y) => y - x)[0] || null
  const refreshAll = () => { overview.reload(); analytics.reload() }
  const maxCollections = Math.max(1, ...(bd?.agentPerformance || []).map((x) => Number(x.collections)))

  return (
    <div className="admin-dash">
      <PageHeader
        title="Operations overview"
        subtitle={`Live figures from the InsureX database · ${todayLabel}`}
        actions={
          <>
            <RefreshBar lastUpdated={lastUpdated} refreshing={overview.refreshing || analytics.refreshing} onRefresh={refreshAll} pollMs={POLL_MS} />
            <Button variant="secondary" size="sm" icon={Download} disabled={!a || !o} onClick={() => exportCsv({ overview: o, analytics: a, filterLabels })}>Export CSV</Button>
          </>
        }
      />

      {/* ── Filters (drive the analytics section only) ── */}
      <section className="dash-filters panel" aria-label="Analytics filters">
        <DateRangeFilter value={range} onChange={setRange} idPrefix="admin-range" />
        <div className="dash-filter-row">
          <FilterSelect id="f-agent" label="Agent" value={agentId} onChange={setAgentId} options={agentOptions} loading={agents.loading} />
          <FilterSelect id="f-type" label="Policy type" value={policyTypeId} onChange={setPolicyTypeId} options={typeOptions} loading={policyTypes.loading} />
          <FilterSelect id="f-company" label="Insurer" value={companyId} onChange={setCompanyId} options={companyOptions} loading={companies.loading} />
          {filterLabels.length > 0 && (
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
        <p className="dash-filter-note">
          Filters apply to the KPIs and charts below. An agent filter covers that agent's book: their assigned customers and the records linked to them.
          {' '}The insurer filter applies to policies, payments and claims (applications have no insurer until approved).
        </p>
      </section>

      {analytics.error && !a && <DataState error={analytics.error} onRetry={analytics.reload} />}

      {/* ── KPIs: current position ── */}
      <h2 className="dash-section-label">Current position <span>as of now{filterLabels.length ? ' · filters applied' : ''}</span></h2>
      <KpiBand cols={6}>
        <Kpi label="Total customers" to="/admin/customers" value={k ? k.customers : '—'} />
        <Kpi label="Agents" to="/admin/agents" value={k ? k.agents : '—'} foot={k && `${k.activeAgents} active`} />
        <Kpi label="Total applications" to="/admin/applications" value={k ? k.applications : '—'} foot={k && `${k.applicationsRejected} rejected`} />
        <Kpi label="Pending applications" to="/admin/applications" value={k ? k.applicationsPending : '—'} tone={k?.applicationsPending ? 'warn' : ''} foot={k && (k.applicationsPending ? 'Awaiting underwriting' : 'Queue clear')} />
        <Kpi label="Approved applications" to="/admin/applications" value={k ? k.applicationsApproved : '—'} />
        <Kpi label="Active policies" to="/admin/policies" value={k ? k.activePolicies : '—'} foot={k && `${inrCompact(k.activeSumAssured)} cover`} />
      </KpiBand>
      <KpiBand cols={5}>
        <Kpi label="Premium amount due" to="/admin/premiums" value={k ? inrCompact(k.premiumsDueNow) : '—'} tone={k?.premiumsOverdueCount ? 'bad' : ''} foot={k && `${k.premiumsDueNowCount} installments due · ${k.premiumsOverdueCount} overdue`} />
        <Kpi label="Payments awaiting verification" to="/admin/verifications" value={k ? k.pendingVerifications : '—'} tone={k?.pendingVerifications ? 'warn' : ''} foot={k && `${inr(k.pendingVerificationAmount)} not yet collected`} />
        <Kpi label="Pending claims" to="/admin/claims" value={k ? k.claimsPending : '—'} foot={k && `${inrCompact(k.claimsPendingAmount)} claimed`} />
        <Kpi label="Approved & settled claims" to="/admin/claims" value={k ? k.claimsApproved + k.claimsSettled : '—'} foot={k && `${k.claimsApproved} approved · ${k.claimsSettled} settled`} />
        <Kpi label="Upcoming renewals" to="/admin/renewals" value={k ? k.upcomingRenewals : '—'} foot={k && `Expiring in 60 days · ${k.renewalsOverdue} overdue`} tone={k?.renewalsOverdue ? 'bad' : ''} />
      </KpiBand>

      {/* ── KPIs: selected period ── */}
      <h2 className="dash-section-label">Selected period <span>{a ? `${date(a.range.from)} – ${date(a.range.to)}` : '…'}</span></h2>
      <KpiBand cols={4}>
        <Kpi label="Verified premium collections" to="/admin/payments" value={k ? inrCompact(k.verifiedCollectionsInRange) : '—'} foot={k && `${k.verifiedPaymentsInRange} confirmed payments · pending excluded`} />
        <Kpi label="Applications submitted" value={k ? k.applicationsSubmittedInRange : '—'} />
        <Kpi label="Policies issued" value={k ? k.policiesIssuedInRange : '—'} />
        <Kpi label="New customers" value={k ? k.newCustomersInRange : '—'} />
      </KpiBand>

      {/* ── Charts ── */}
      <div className="chart-grid" style={{ marginBottom: 16 }}>
        <ChartCard className="span-8" title="Application trends" note="Submitted by application date; approvals and rejections by decision date"
          loading={aLoading} error={analytics.error && !a ? analytics.error : null} empty={allZero(series?.applications, ['submitted', 'approved', 'rejected'])}
          emptyText="No applications were submitted or decided in this period.">
          <BarChart data={series?.applications} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={xTick} {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip labelFormatter={tipLabel} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="submitted" name="Submitted" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="approved" name="Approved" fill={CHART.green} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="rejected" name="Rejected" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-4" title="Payment status" note="Payments submitted or recorded in this period"
          loading={aLoading} empty={!bd?.paymentStatus?.length} emptyText="No payments in this period." height={180}
          footer={bd?.paymentStatus?.length ? <StatusLegend rows={bd.paymentStatus} /> : null}>
          <StatusDonut rows={bd?.paymentStatus || []} />
        </ChartCard>

        <ChartCard className="span-8" title="Premium collections" note="Verified (confirmed) payments vs. installments billed due. Pending submissions shown separately and not counted as collected."
          loading={aLoading} empty={allZero(series?.collections, ['verified', 'pending', 'billed'])} emptyText="No payments or due installments in this period.">
          <ComposedChart data={series?.collections} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={xTick} {...axisProps} />
            <YAxis tickFormatter={inrCompact} width={56} {...axisProps} />
            <Tooltip content={<ChartTooltip money labelFormatter={tipLabel} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="verified" name="Verified collections" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="pending" name="Awaiting verification" fill={CHART.amber} radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Line dataKey="billed" name="Billed due" stroke={CHART.navy} strokeWidth={2} dot={false} type="monotone" />
          </ComposedChart>
        </ChartCard>

        <ChartCard className="span-4" title="Claims by status" note="Claims filed in this period"
          loading={aLoading} empty={!bd?.claimsByStatus?.length} emptyText="No claims filed in this period." height={180}
          footer={bd?.claimsByStatus?.length ? <StatusLegend rows={bd.claimsByStatus} /> : null}>
          <StatusDonut rows={bd?.claimsByStatus || []} />
        </ChartCard>

        <ChartCard className="span-6" title="Policies issued" note="By policy creation (issue) date"
          loading={aLoading} empty={allZero(series?.policiesIssued, ['issued'])} emptyText="No policies were issued in this period.">
          <LineChart data={series?.policiesIssued} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={xTick} {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip labelFormatter={tipLabel} />} />
            <Line dataKey="issued" name="Policies issued" stroke={CHART.primary} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
          </LineChart>
        </ChartCard>

        <ChartCard className="span-6" title="Claims trend" note="Claims by incident/claim date and their current outcome"
          loading={aLoading} empty={allZero(series?.claims, ['filed'])} emptyText="No claims were filed in this period.">
          <BarChart data={series?.claims} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={xTick} {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip labelFormatter={tipLabel} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="filed" name="Filed" fill={CHART.slate} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="approvedOrSettled" name="Approved / settled" fill={CHART.green} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="rejected" name="Rejected" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-6" title="Portfolio by policy type" note="Current active policies"
          loading={aLoading} empty={!bd?.portfolioByPolicyType?.length} emptyText="No active policies match these filters.">
          <BarChart data={bd?.portfolioByPolicyType} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" width={120} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F8FC' }} />
            <Bar dataKey="policies" name="Active policies" fill={CHART.primary} radius={[0, 3, 3, 0]} maxBarSize={22} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-6" title="Portfolio by insurer" note="Current active policies by insurance company"
          loading={aLoading} empty={!bd?.portfolioByCompany?.length} emptyText="No active policies match these filters.">
          <BarChart data={bd?.portfolioByCompany} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" width={140} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F8FC' }} />
            <Bar dataKey="policies" name="Active policies" fill={CHART.cyan} radius={[0, 3, 3, 0]} maxBarSize={22} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-8" title="Upcoming renewals" note="Active policies expiring in the next 6 months; ‘needs attention’ = no renewal opened yet"
          loading={aLoading} empty={allZero(bd?.upcomingRenewalsByMonth, ['expiring'])} emptyText="No active policies expire in the next 6 months.">
          <BarChart data={bd?.upcomingRenewalsByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={(v) => periodLabel(v, 'month')} {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip labelFormatter={(v) => periodLabel(v, 'month')} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="expiring" name="Expiring" fill={CHART.cyan} radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="needsAttention" name="Needs attention" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-4" title="Renewal status" note={k ? `${k.renewalsOpen} open · ${k.renewalsCompleted} completed · ${k.renewalsOverdue} overdue/lapsed` : 'All renewal records'}
          loading={aLoading} empty={!bd?.renewalsByStatus?.length} emptyText="No renewal records yet." height={180}
          footer={bd?.renewalsByStatus?.length ? <StatusLegend rows={bd.renewalsByStatus} /> : null}>
          <StatusDonut rows={bd?.renewalsByStatus || []} />
        </ChartCard>

        <ChartCard className="span-6" title="Customer growth" note="New customer registrations"
          loading={aLoading} empty={allZero(series?.customerGrowth, ['registered'])} emptyText="No new customers registered in this period."
          footer={series ? `${sum(series.customerGrowth, 'registered')} new in period · ${k?.customers ?? '—'} total` : null}>
          <AreaChart data={series?.customerGrowth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.18} />
                <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={xTick} {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip labelFormatter={tipLabel} />} />
            <Area dataKey="registered" name="New customers" stroke={CHART.primary} strokeWidth={2} fill="url(#growthFill)" type="monotone" />
          </AreaChart>
        </ChartCard>

        <ChartCard className="span-6" title="Applications by policy type" note="Applications submitted in this period and their current status"
          loading={aLoading} empty={!bd?.applicationsByPolicyType?.length} emptyText="No applications were submitted in this period.">
          <BarChart data={bd?.applicationsByPolicyType} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="approved" name="Approved" stackId="s" fill={SERIES[3]} maxBarSize={36} />
            <Bar dataKey="pending" name="Pending" stackId="s" fill={CHART.amber} maxBarSize={36} />
            <Bar dataKey="rejected" name="Rejected" stackId="s" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartCard>
      </div>

      {/* ── Agent performance ── */}
      <Panel title="Agent performance" note="Applications assisted, approvals and policies issued in the selected period; verified collections on each agent's policies (pending payments excluded)" flush className="dash-block">
        <DataState loading={aLoading} error={analytics.error && !a ? analytics.error : null} onRetry={analytics.reload}
          empty={!bd?.agentPerformance?.length} emptyText="No agents match these filters.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col" className="numeric">Customers</th>
                  <th scope="col" className="numeric">Applications</th>
                  <th scope="col" className="numeric">Approved</th>
                  <th scope="col" className="numeric">Policies issued</th>
                  <th scope="col" className="numeric">Verified collections</th>
                  <th scope="col"><span className="sr-only">Share of collections</span></th>
                </tr>
              </thead>
              <tbody>
                {bd?.agentPerformance?.map((ag) => (
                  <tr key={ag.id}>
                    <td>
                      <Link to={`/admin/agents/${ag.id}`} className="table-link">{ag.firstName} {ag.lastName}</Link>
                      <div className="muted" style={{ fontSize: 12 }}>{ag.agentNumber} · {titleCase(ag.status)}</div>
                    </td>
                    <td className="numeric">{ag.customers}</td>
                    <td className="numeric">{ag.applications}</td>
                    <td className="numeric">{ag.approved}</td>
                    <td className="numeric">{ag.policiesIssued}</td>
                    <td className="numeric" style={{ fontWeight: 600 }}>{inr(ag.collections)}</td>
                    <td style={{ width: 140 }}>
                      <div className="meter" aria-hidden="true"><span style={{ width: `${(Number(ag.collections) / maxCollections) * 100}%` }} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Panel>

      {/* ── Operational queues (live, not filtered) ── */}
      <h2 className="dash-section-label">Work queues <span>live · not affected by the filters above</span></h2>
      {overview.error && !o && <DataState error={overview.error} onRetry={overview.reload} />}

      <div className="px-grid cols-2" style={{ marginBottom: 16 }}>
        <Panel title="Needs attention" note="Work waiting on operations" flush>
          <ul className="rows">
            {[
              { to: '/admin/verifications', icon: BadgeCheck, label: 'Payments awaiting verification', value: o?.metrics.pendingPayments },
              { to: '/admin/verifications', icon: Archive, label: 'Documents awaiting review', value: o?.metrics.pendingDocuments },
              { to: '/admin/premiums', icon: CalendarClock, label: 'Overdue premium installments', value: o?.metrics.overduePremiums },
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

        <Panel title="Payments awaiting verification" note="Customer-submitted references, oldest first" action={<PanelLink to="/admin/verifications">Verify</PanelLink>} flush>
          <DataState loading={overview.loading && !o} empty={o?.queues.payments.length === 0} emptyText="No customer payments are waiting for verification.">
            <ul className="rows">
              {o?.queues.payments.map((p) => (
                <li key={p.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{fullName(p.policy?.customer)} · {p.policy?.policyNumber}</div>
                    <div className="row-meta"><span className="mono">{p.paymentNumber}</span> · {titleCase(p.paymentMethod)} · submitted {relativeDays(p.paymentDate)}</div>
                  </div>
                  <div className="row-end row-amount">{inr(p.amount)}</div>
                </li>
              ))}
            </ul>
          </DataState>
        </Panel>
      </div>

      <div className="px-grid cols-2" style={{ marginBottom: 16 }}>
        <Panel title="Application queue" note="Oldest pending first" action={<PanelLink to="/admin/applications">Review all</PanelLink>} flush>
          <DataState loading={overview.loading && !o} empty={o?.queues.applications.length === 0} emptyText="No applications are waiting for review.">
            <ul className="rows">
              {o?.queues.applications.map((ap) => (
                <li key={ap.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{fullName(ap.customer)} · {ap.policyType.name}</div>
                    <div className="row-meta">
                      <span className="mono">{ap.applicationNumber}</span> · submitted {relativeDays(ap.applicationDate)}
                      {ap.assistedByAgent && ` · via ${fullName(ap.assistedByAgent)}`}
                    </div>
                  </div>
                  <div className="row-end row-amount">{inr(ap.requestedCoverage)}</div>
                </li>
              ))}
            </ul>
          </DataState>
        </Panel>

        <Panel title="Claim queue" note="Open claims, oldest first" action={<PanelLink to="/admin/claim-processing">Process</PanelLink>} flush>
          <DataState loading={overview.loading && !o} empty={o?.queues.claims.length === 0} emptyText="No open claims.">
            <ul className="rows">
              {o?.queues.claims.map((c) => (
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

      <div className="px-grid cols-2">
        <Panel title="Renewal alerts" note="Active policies expiring within 60 days" action={<PanelLink to="/admin/renewals">Renewals</PanelLink>} flush>
          <DataState loading={overview.loading && !o} empty={o?.queues.renewals.length === 0} emptyText="No policies expire in the next 60 days.">
            <ul className="rows">
              {o?.queues.renewals.map((p) => (
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

        <Panel title="Recent activity" note="Audit trail of business events across the platform" flush>
          <DataState loading={overview.loading && !o} empty={o?.recentActivity.length === 0} emptyText="No activity has been recorded yet. Events appear here as applications, payments, claims and renewals are processed.">
            <ul className="rows">
              {o?.recentActivity.map((ev) => (
                <li key={ev.id} className="row">
                  <div className="row-main">
                    <div className="row-title" style={{ fontWeight: 500, whiteSpace: 'normal' }}>{ev.summary}</div>
                    <div className="row-meta">{titleCase(ev.action)} · {ev.actor?.name ? `${ev.actor.name} (${titleCase(ev.actorRole)})` : 'System'}</div>
                  </div>
                  <div className="row-end muted" style={{ fontSize: 12 }}>{timeAgo(ev.createdAt)}</div>
                </li>
              ))}
            </ul>
          </DataState>
        </Panel>
      </div>

      {analytics.error && a && (
        <div style={{ marginTop: 12 }}><Notice tone="warn">Latest refresh failed ({analytics.error.message}). Showing the last loaded figures.</Notice></div>
      )}
    </div>
  )
}
