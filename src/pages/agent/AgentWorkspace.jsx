import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  Users, FolderOpen, CheckCircle2, Shield, RefreshCcw, Phone, UserPlus, FilePlus2, Upload, Clock3,
  Wallet, BadgeCheck, AlertCircle, MapPin, Building2, CalendarDays,
} from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, inrCompact, date, relativeDays, daysUntil, fullName, timeAgo, titleCase } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Panel, PanelLink, DataState, Notice, ConfirmDialog } from '../../components/panel'
import {
  ChartCard, ChartTooltip, CHART, STATUS_COLOR, axisProps, periodLabel, DateRangeFilter, rangeForPreset, RefreshBar, StatusLegend,
} from '../../components/charts'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const POLL_MS = 60000
const STATUS_ORDER = { OVERDUE: 0, GRACE_PERIOD: 1, PARTIALLY_PAID: 2, DUE: 3 }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function KpiCard({ icon: Icon, tone = '', label, value, foot, footTone = '', to, scope, loading }) {
  return (
    <Link to={to} className={`ag-kpi ${loading ? 'skeleton' : ''}`}>
      {scope && <span className="ag-kpi-scope">{scope}</span>}
      <div className="ag-kpi-top">
        <span className="ag-kpi-label">{label}</span>
        <span className={`ag-kpi-icon ${tone}`} aria-hidden="true"><Icon size={16} /></span>
      </div>
      {loading ? <div className="ag-kpi-value skel" aria-hidden="true">&nbsp;</div> : <div className="ag-kpi-value">{value}</div>}
      {foot && <div className={`ag-kpi-foot ${footTone}`}>{loading ? ' ' : foot}</div>}
    </Link>
  )
}

const sumOf = (rows, key) => (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0)

export default function AgentWorkspace() {
  const { user } = useAuth()
  const [range, setRange] = useState(() => rangeForPreset('6m'))
  const overview = useApi('/agent/overview', {}, { pollMs: POLL_MS })
  const analytics = useApi('/agent/analytics', { from: range.from, to: range.to, granularity: range.granularity }, { pollMs: POLL_MS })
  const [renewTarget, setRenewTarget] = useState(null)
  const [flash, setFlash] = useState(null)
  const action = useAction()
  // Computed once per visit (render must stay pure)
  const [today] = useState(() => ({
    label: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    greeting: greeting(),
  }))

  const data = overview.data
  const a = analytics.data
  const k = a?.kpis
  const gran = a?.range.granularity || range.granularity
  const profile = data?.profile
  const followUps = [...(data?.followUpPremiums || [])].sort(
    (x, y) => (STATUS_ORDER[x.status] ?? 9) - (STATUS_ORDER[y.status] ?? 9) || new Date(x.dueDate) - new Date(y.dueDate)
  )
  const kpiLoading = analytics.loading && !a

  function refreshAll() {
    overview.reload()
    analytics.reload()
  }

  async function openRenewal() {
    try {
      await action.run(() => api.post('/agent/renewals', { policyId: renewTarget.id }))
      setFlash(`Renewal opened for ${renewTarget.policyNumber}. An administrator will process it.`)
      setRenewTarget(null)
      refreshAll()
    } catch {
      /* error shown in dialog */
    }
  }

  const series = a?.series
  const bd = a?.breakdowns
  const lastUpdated = [overview.lastUpdated, analytics.lastUpdated].filter(Boolean).sort((x, y) => x - y)[0] || null
  const fmtPeriod = (p) => periodLabel(p, gran)
  const rangeText = a ? `${date(a.range.from)} – ${date(a.range.to)}` : 'selected period'

  return (
    <div className="px-page">
      <header className="ag-hero">
        <div>
          <p className="ag-hero-eyebrow">{today.label}</p>
          <h1>{today.greeting}, {profile?.firstName || user?.name?.split(' ')[0] || ''}</h1>
          <p className="ag-hero-sub">
            {profile ? (
              <>
                <span>{profile.agentNumber}</span>
                <span><MapPin size={13} aria-hidden="true" /> {profile.region}</span>
                <span>{profile.specialization}</span>
                {profile.company && <span><Building2 size={13} aria-hidden="true" /> {profile.company.name}</span>}
              </>
            ) : 'Your book of business at a glance.'}
          </p>
        </div>
        <div className="ag-quick">
          <Link to="/agent/customers/new" className="btn btn-secondary btn-sm"><UserPlus size={15} aria-hidden="true" /> Register customer</Link>
          <Link to="/agent/applications/new" className="btn btn-primary btn-sm"><FilePlus2 size={15} aria-hidden="true" /> New application</Link>
          <Link to="/agent/documents?upload=1" className="btn btn-secondary btn-sm"><Upload size={15} aria-hidden="true" /> Upload document</Link>
        </div>
      </header>

      <div className="ag-toolbar">
        <DateRangeFilter value={range} onChange={setRange} idPrefix="agent-range" />
        <RefreshBar lastUpdated={lastUpdated} refreshing={overview.refreshing || analytics.refreshing} onRefresh={refreshAll} pollMs={POLL_MS} />
      </div>

      {flash && <Notice tone="ok" style={{ marginBottom: 16 }}>{flash}</Notice>}
      {(analytics.error || overview.error) && (
        <Notice tone="error" style={{ marginBottom: 16 }}>
          {(analytics.error || overview.error).message}{' '}
          <button type="button" className="panel-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={refreshAll}>Retry</button>
        </Notice>
      )}

      {/* ── KPIs: every figure is computed server-side for this agent's book only ── */}
      <div className="ag-kpis">
        <KpiCard loading={kpiLoading} icon={Users} label="Assigned customers" value={k?.customers}
          foot={k && `${k.newCustomersInRange} new in range`} to="/agent/customers" />
        <KpiCard loading={kpiLoading} icon={FolderOpen} tone="navy" label="Applications handled" value={k?.applications}
          foot={k && `${k.applicationsSubmittedInRange} submitted in range`} to="/agent/applications" />
        <KpiCard loading={kpiLoading} icon={Clock3} tone="amber" label="Awaiting action" value={k?.applicationsPending}
          foot="Pending underwriting decision" footTone={k?.applicationsPending ? 'warn' : ''} to="/agent/applications?status=PENDING" />
        <KpiCard loading={kpiLoading} icon={CheckCircle2} tone="green" label="Approved applications" value={k?.applicationsApproved}
          foot={k && `${k.applicationsRejected} rejected overall`} to="/agent/applications?status=APPROVED" />
        <KpiCard loading={kpiLoading} icon={Shield} tone="cyan" label="Active policies managed" value={k?.activePolicies}
          foot={k && `${inrCompact(k.activeSumAssured)} total cover`} to="/agent/policies" />
        <KpiCard loading={kpiLoading} icon={Wallet} tone={k?.premiumsOverdueCount ? 'red' : 'amber'} label="Premiums due" value={k && inrCompact(k.premiumsDueNow)}
          foot={k && `${k.premiumsOverdueCount} overdue · ${inrCompact(k.premiumsDueNext30)} due in next 30 days`}
          footTone={k?.premiumsOverdueCount ? 'bad' : ''} to="/agent/premiums" />
        <KpiCard loading={kpiLoading} icon={BadgeCheck} tone="green" scope="In range" label="Verified collections" value={k && inrCompact(k.verifiedCollectionsInRange)}
          foot={k && (k.pendingVerifications
            ? `${k.verifiedPaymentsInRange} confirmed · ${k.pendingVerifications} awaiting verification (${inrCompact(k.pendingVerificationAmount)}, not counted)`
            : `${k.verifiedPaymentsInRange} confirmed payments`)}
          to="/agent/premiums" />
        <KpiCard loading={kpiLoading} icon={AlertCircle} tone={k?.claimsPending ? 'amber' : ''} label="Pending claims" value={k?.claimsPending}
          foot={k && `${inrCompact(k.claimsPendingAmount)} claimed · ${k.claimsSettled} settled`} to="/agent/claims" />
        <KpiCard loading={kpiLoading} icon={RefreshCcw} tone={k?.upcomingRenewals ? 'amber' : 'cyan'} label="Upcoming renewals" value={k?.upcomingRenewals}
          foot={k && `Expiring in 60 days${k.renewalsOverdue ? ` · ${k.renewalsOverdue} overdue` : ''}`}
          footTone={k?.renewalsOverdue ? 'bad' : ''} to="/agent/renewals" />
      </div>

      {/* ── Charts ── */}
      <div className="ag-section-title">
        <h2>Performance</h2>
        <p>{rangeText} · grouped {gran === 'day' ? 'daily' : gran === 'week' ? 'weekly' : 'monthly'}</p>
      </div>
      <div className="chart-grid">
        <ChartCard className="span-8" title="Application performance" note="Submitted by application date; approvals and rejections by decision date"
          loading={kpiLoading} error={analytics.error && !a ? analytics.error : null}
          empty={!sumOf(series?.applications, 'submitted') && !sumOf(series?.applications, 'approved') && !sumOf(series?.applications, 'rejected')}
          emptyText="No applications were submitted or decided in this period.">
          <BarChart data={series?.applications} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={fmtPeriod} {...axisProps} minTickGap={12} />
            <YAxis allowDecimals={false} {...axisProps} width={36} />
            <Tooltip content={<ChartTooltip labelFormatter={fmtPeriod} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="submitted" name="Submitted" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="approved" name="Approved" fill={CHART.green} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="rejected" name="Rejected" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="stillPending" name="Still pending" fill={CHART.amber} radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-4" title="Claims by status" note="Claims filed in this period"
          loading={kpiLoading} empty={!sumOf(bd?.claimsByStatus, 'count')} emptyText="No claims filed in this period."
          height={190} footer={bd?.claimsByStatus?.length > 0 && <StatusLegend rows={bd.claimsByStatus} />}>
          <PieChart>
            <Pie data={(bd?.claimsByStatus || []).map((r) => ({ ...r, label: titleCase(r.status) }))} dataKey="count" nameKey="label" innerRadius="52%" outerRadius="80%" paddingAngle={2} stroke="#fff">
              {(bd?.claimsByStatus || []).map((r) => <Cell key={r.status} fill={STATUS_COLOR[r.status] || CHART.slate} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ChartCard>

        <ChartCard className="span-8" title="Premium collection"
          note="Verified payments vs installments billed. Payments awaiting verification are shown separately and are not counted as collected."
          loading={kpiLoading}
          empty={!sumOf(series?.collections, 'verified') && !sumOf(series?.collections, 'pending') && !sumOf(series?.collections, 'billed')}
          emptyText="No premiums billed or paid in this period."
          footer={
            <span className="ag-legend-note">
              <span><span className="ag-swatch" style={{ background: CHART.primary }} /> Verified {series && inr(sumOf(series.collections, 'verified'))}</span>
              <span><span className="ag-swatch dashed" /> Awaiting verification {series && inr(sumOf(series.collections, 'pending'))}</span>
              <span><span className="ag-swatch" style={{ background: CHART.navy }} /> Billed (due) {series && inr(sumOf(series.collections, 'billed'))}</span>
            </span>
          }>
          <ComposedChart data={series?.collections} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={fmtPeriod} {...axisProps} minTickGap={12} />
            <YAxis tickFormatter={inrCompact} {...axisProps} width={54} />
            <Tooltip content={<ChartTooltip money labelFormatter={fmtPeriod} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="verified" name="Verified" stackId="paid" fill={CHART.primary} maxBarSize={26} />
            <Bar dataKey="pending" name="Awaiting verification" stackId="paid" fill="#FCD34D" stroke={CHART.amber} strokeDasharray="3 2" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Line type="monotone" dataKey="billed" name="Billed (due)" stroke={CHART.navy} strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
        </ChartCard>

        <ChartCard className="span-4" title="Policies issued" note="By policy creation date"
          loading={kpiLoading} empty={!sumOf(series?.policiesIssued, 'issued')} emptyText="No policies issued in this period."
          footer={k && `${k.policiesIssuedInRange} issued in range · ${k.activePolicies} active now`}>
          <LineChart data={series?.policiesIssued} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={fmtPeriod} {...axisProps} minTickGap={16} />
            <YAxis allowDecimals={false} {...axisProps} width={32} />
            <Tooltip content={<ChartTooltip labelFormatter={fmtPeriod} />} />
            <Line type="monotone" dataKey="issued" name="Policies issued" stroke={CHART.cyan} strokeWidth={2.5} dot={{ r: 3, fill: CHART.cyan }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartCard>

        <ChartCard className="span-4" title="Renewal tracking" note="Active policies expiring in the next 6 months; red = no renewal opened yet"
          loading={kpiLoading} empty={!sumOf(bd?.upcomingRenewalsByMonth, 'expiring')} emptyText="No policies in your book expire in the next 6 months."
          action={<PanelLink to="/agent/renewals">Renewals</PanelLink>}>
          <BarChart data={(bd?.upcomingRenewalsByMonth || []).map((x) => ({ ...x, covered: x.expiring - x.needsAttention }))} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="period" tickFormatter={(p) => periodLabel(p, 'month')} {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={32} />
            <Tooltip content={<ChartTooltip labelFormatter={(p) => periodLabel(p, 'month')} />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="covered" name="Renewal opened" stackId="r" fill={CHART.green} maxBarSize={30} />
            <Bar dataKey="needsAttention" name="Needs attention" stackId="r" fill={CHART.red} radius={[3, 3, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ChartCard>

        <ChartCard className="span-4" title="Applications by plan" note="Outcome of applications submitted in this period"
          loading={kpiLoading} empty={!sumOf(bd?.applicationsByPolicyType, 'applications')} emptyText="No applications submitted in this period.">
          <BarChart layout="vertical" data={bd?.applicationsByPolicyType} margin={{ top: 4, right: 10, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" {...axisProps} width={92} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F8FC' }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="approved" name="Approved" stackId="a" fill={CHART.green} maxBarSize={18} />
            <Bar dataKey="pending" name="Pending" stackId="a" fill={CHART.amber} maxBarSize={18} />
            <Bar dataKey="rejected" name="Rejected" stackId="a" fill={CHART.red} radius={[0, 3, 3, 0]} maxBarSize={18} />
          </BarChart>
        </ChartCard>

        <section className="chart-card span-4" aria-labelledby="cities-title">
          <header className="chart-card-head">
            <div>
              <h3 className="chart-card-title" id="cities-title">Customers by city</h3>
              <p className="chart-card-note">Where your assigned customers live</p>
            </div>
            <PanelLink to="/agent/customers">Customers</PanelLink>
          </header>
          <div style={{ padding: '10px 18px 18px' }}>
            {kpiLoading ? <div className="skel" style={{ height: 180 }} /> : !(bd?.customersByCity || []).length ? (
              <div className="chart-empty" style={{ height: 180, marginLeft: 0 }}><Users size={22} aria-hidden="true" /><span>No customers assigned to you yet.</span></div>
            ) : (
              <ul className="ag-city-list">
                {bd.customersByCity.map((c) => {
                  const max = Math.max(1, ...bd.customersByCity.map((x) => x.customers))
                  return (
                    <li key={c.name}>
                      <span><MapPin size={12} aria-hidden="true" style={{ color: 'var(--color-text-muted)', verticalAlign: -1 }} /> {c.name}</span>
                      <strong className="num">{c.customers}</strong>
                      <div className="meter" aria-hidden="true"><span style={{ width: `${(c.customers / max) * 100}%`, background: CHART.cyan }} /></div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Operational work lists ── */}
      <div className="ag-section-title">
        <h2>Today's work</h2>
        <p><CalendarDays size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> Follow-ups across your book</p>
      </div>
      <div className="px-grid main-side">
        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel flush title="Follow up today" note="Premiums overdue or due within 30 days, most urgent first" action={<PanelLink to="/agent/premiums">All dues</PanelLink>}>
            <DataState loading={overview.loading && !data} error={null} empty={followUps.length === 0} emptyText="No premium follow-ups needed right now. Every installment in your book is paid or not yet due.">
              <ul className="rows">
                {followUps.map((p) => {
                  const c = p.policy.customer
                  const d = daysUntil(p.dueDate)
                  return (
                    <li key={p.id} className="row">
                      <span className="ag-avatar sm" aria-hidden="true">{fullName(c).split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                      <div className="row-main">
                        <div className="row-title"><Link to={`/agent/customers/${c.id}`} className="table-link">{fullName(c)}</Link></div>
                        <div className="row-meta">{p.policy.policyNumber} · {p.premiumNumber} · due {date(p.dueDate)} ({relativeDays(p.dueDate)})</div>
                      </div>
                      <div className="row-end">
                        <div className="row-amount">{inr(p.remainingBalance)}</div>
                        <div style={{ marginTop: 2 }}><StatusBadge status={d < 0 && p.status === 'DUE' ? 'OVERDUE' : p.status} /></div>
                      </div>
                      {c.phone && (
                        <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="icon-btn" aria-label={`Call ${fullName(c)} on ${c.phone}`} title={c.phone}>
                          <Phone size={16} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Renewal opportunities" note="Policies in your book expiring within 60 days" action={<PanelLink to="/agent/renewals">Renewals</PanelLink>}>
            <DataState loading={overview.loading && !data} error={null} empty={(data?.expiringPolicies || []).length === 0} emptyText="No policies in your book expire in the next 60 days.">
              <ul className="rows">
                {data?.expiringPolicies.map((p) => (
                  <li key={p.id} className="row">
                    <div className="row-main">
                      <div className="row-title"><Link to={`/agent/policies/${p.id}`} className="table-link">{p.policyNumber}</Link> · {p.policyType.name}</div>
                      <div className="row-meta">{fullName(p.customer)}{p.customer.phone ? ` · ${p.customer.phone}` : ''} · expires {date(p.expiryDate)} ({relativeDays(p.expiryDate)})</div>
                    </div>
                    <div className="row-end">
                      {p.renewalStatus ? <StatusBadge status={p.renewalStatus} /> : (
                        <Button size="sm" variant="secondary" icon={RefreshCcw} onClick={() => { action.setError(null); setRenewTarget(p) }}>Open renewal</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>

        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel flush title="Recent applications" action={<PanelLink to="/agent/applications">All</PanelLink>}>
            <DataState loading={overview.loading && !data} error={null} empty={(data?.recentApplications || []).length === 0} emptyText="No applications yet. Start one for a customer in your book.">
              <ul className="rows">
                {data?.recentApplications.map((ap) => (
                  <li key={ap.id}>
                    <Link to={`/agent/applications/${ap.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{fullName(ap.customer)}</div>
                        <div className="row-meta">{ap.applicationNumber} · {ap.policyType.name} · {inr(ap.requestedCoverage)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={ap.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Recent activity" note="Events on your customers' records" action={<PanelLink to="/agent/activity">History</PanelLink>}>
            <DataState loading={overview.loading && !data} error={null} empty={(data?.recentActivity || []).length === 0} emptyText="No recorded activity on your book yet.">
              <ul className="rows">
                {data?.recentActivity.map((e) => (
                  <li key={e.id} className="row">
                    <div className="row-main"><div className="row-meta" style={{ whiteSpace: 'normal', color: 'var(--color-text-primary)' }}>{e.summary}</div></div>
                    <div className="row-end muted" style={{ fontSize: 12 }}>{timeAgo(e.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(renewTarget)}
        title="Open a renewal"
        confirmLabel="Open renewal"
        pending={action.pending}
        error={action.error}
        onConfirm={openRenewal}
        onClose={() => setRenewTarget(null)}
      >
        {renewTarget && (
          <>
            This opens a renewal for policy <strong>{renewTarget.policyNumber}</strong> ({fullName(renewTarget.customer)}) on the
            same terms for one more year, starting {date(renewTarget.expiryDate)}. An administrator completes the renewal once the
            renewal premium is settled. Renewals can be opened from 60 days before expiry.
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
