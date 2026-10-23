import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FolderOpen, CheckCircle2, Shield, IndianRupee } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, inrCompact } from '../../lib/format'
import { PageHead, Panel, KpiBand, Kpi, DataState, ErrorState } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import { ChartTooltip, CHART, axisProps } from '../../components/charts'

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

// Fills the last 6 calendar months so months with no policies show as zero rather than disappearing.
function lastSixMonths(rows) {
  const byMonth = Object.fromEntries((rows || []).map((r) => [r.month, Number(r.policies)]))
  const out = []
  const d = new Date()
  d.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
    out.push({ month: monthLabel(key), policies: byMonth[key] || 0 })
  }
  return out
}

export default function AgentPerformance() {
  const { data, loading, error, reload } = useApi('/agent/performance')

  const monthly = lastSixMonths(data?.policiesIssuedByMonth)
  const anyMonthly = monthly.some((m) => m.policies > 0)
  const byType = data?.policiesByType || []
  const maxCover = Math.max(1, ...byType.map((t) => t.sumAssured))
  const apps = data?.applications

  return (
    <div className="px-page">
      <PageHead
        eyebrow="Insights"
        title="My performance"
        sub="Figures for your own book only, calculated from live policy, application and payment records."
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      <KpiBand cols={4}>
        <Kpi icon={FolderOpen} label="Applications handled" value={apps ? apps.total : '—'} foot="All time" />
        <Kpi icon={CheckCircle2} label="Approval rate" value={apps ? (apps.approvalRate == null ? '—' : `${apps.approvalRate}%`) : '—'} foot="Of decided applications" />
        <Kpi icon={Shield} label="Active policies serviced" value={data ? byType.reduce((s, t) => s + t.count, 0) : '—'} />
        <Kpi icon={IndianRupee} label="Premiums collected" value={data ? inrCompact(data.premiumsCollected.amount) : '—'} foot={data ? `${data.premiumsCollected.payments} confirmed payments` : ''} />
      </KpiBand>

      <div className="px-grid main-side">
        <Panel title="Policies issued" note="Policies where you are the servicing agent, last 6 months">
          <DataState loading={loading} empty={!anyMonthly} emptyText="No policies were issued to your book in the last 6 months.">
            <div style={{ height: 260 }} role="img" aria-label={`Policies issued per month: ${monthly.map((m) => `${m.month} ${m.policies}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F8FC' }} />
                  <Bar dataKey="policies" name="Policies issued" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataState>
        </Panel>

        <Panel flush title="Applications by outcome">
          <DataState loading={loading} empty={!apps || apps.total === 0} emptyText="No applications yet.">
            <ul className="rows">
              {apps?.byStatus.map((s) => (
                <li key={s.status} className="row">
                  <div className="row-main"><StatusBadge status={s.status} /></div>
                  <div className="row-end">
                    <span className="row-amount">{s.count}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{Math.round((s.count / apps.total) * 100)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </DataState>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel flush title="Active book by plan" note="Policies and total sum assured you service">
          <DataState loading={loading} empty={byType.length === 0} emptyText="You are not the servicing agent on any active policy yet.">
            <ul className="rows">
              {byType.map((t) => (
                <li key={t.name} className="row" style={{ flexWrap: 'wrap' }}>
                  <div className="row-main" style={{ minWidth: 160 }}>
                    <div className="row-title">{t.name}</div>
                    <div className="row-meta">{t.count} polic{t.count === 1 ? 'y' : 'ies'}</div>
                  </div>
                  <div style={{ flex: '2 1 200px' }}>
                    <div className="meter" aria-hidden="true"><span style={{ width: `${(t.sumAssured / maxCover) * 100}%` }} /></div>
                  </div>
                  <div className="row-end row-amount" style={{ minWidth: 110 }}>{inr(t.sumAssured)}</div>
                </li>
              ))}
            </ul>
          </DataState>
        </Panel>
      </div>
      <p className="field-help" style={{ marginTop: 12 }}>
        Premiums collected counts confirmed payments on policies where you are the servicing agent. Payments submitted by customers are counted only after they are verified.
      </p>
    </div>
  )
}
