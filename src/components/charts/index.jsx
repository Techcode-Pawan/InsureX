// Shared analytics building blocks (Admin + Agent dashboards): chart frame, tooltip, palette,
// date-range filter and refresh bar. Charts use recharts (already a project dependency).
import { useEffect, useState } from 'react'
import { RotateCw, BarChart3 } from 'lucide-react'
import { ResponsiveContainer } from 'recharts'
import { inr, inrCompact, titleCase } from '../../lib/format'

// Restrained, brand-derived palette. Status colours stay consistent across every chart.
export const CHART = {
  primary: '#168BFF',
  cyan: '#20B8FF',
  navy: '#061426',
  slate: '#94A3B8',
  grid: '#EDF2F7',
  axis: '#64748B',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  violet: '#7C3AED',
}
export const STATUS_COLOR = {
  APPROVED: CHART.green, SUCCESS: CHART.green, SETTLED: CHART.primary, RENEWED: CHART.green, ACTIVE: CHART.green,
  PENDING: CHART.amber, UNDER_REVIEW: CHART.cyan, UPCOMING: CHART.cyan, GRACE_PERIOD: CHART.amber,
  REJECTED: CHART.red, FAILED: CHART.red, OVERDUE: CHART.red, LAPSED: CHART.slate, CANCELLED: CHART.slate,
}
export const SERIES = [CHART.primary, CHART.cyan, CHART.navy, CHART.green, CHART.amber, CHART.violet, CHART.slate]

export const axisProps = {
  tick: { fontSize: 12, fill: CHART.axis },
  axisLine: false,
  tickLine: false,
}

// "2026-10-01" → "Oct 26" (month) / "1 Oct" (day/week)
export function periodLabel(period, granularity = 'month') {
  if (!period) return ''
  const d = new Date(`${period}T00:00:00`)
  return granularity === 'month'
    ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function ChartTooltip({ active, payload, label, money = false, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background: p.color || p.fill }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong>{money ? inr(p.value) : Number(p.value).toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  )
}

/**
 * Chart frame with consistent header, loading skeleton, error and honest empty state.
 * `empty` should be true when there is no real data to plot; we never pad with sample values.
 */
export function ChartCard({ title, note, action, loading, error, empty, emptyText = 'No data for the selected period.', height = 240, children, footer, className = '' }) {
  return (
    <section className={`chart-card ${className}`}>
      <header className="chart-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="chart-card-title">{title}</h3>
          {note && <p className="chart-card-note">{note}</p>}
        </div>
        {action}
      </header>
      <div className="chart-card-body" style={{ height }}>
        {loading ? (
          <div className="skel" style={{ height: '100%' }} aria-busy="true" aria-label={`Loading ${title}`} />
        ) : error ? (
          <div className="chart-empty" role="alert"><span>{error.message || 'Could not load this chart.'}</span></div>
        ) : empty ? (
          <div className="chart-empty"><BarChart3 size={22} aria-hidden="true" /><span>{emptyText}</span></div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </div>
      {footer && <footer className="chart-card-foot">{footer}</footer>}
    </section>
  )
}

const PRESETS = [
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '6m', label: '6 months', months: 6 },
  { key: '12m', label: '12 months', months: 12 },
  { key: 'ytd', label: 'Year to date' },
]
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function rangeForPreset(key) {
  const to = new Date()
  const from = new Date(to)
  const p = PRESETS.find((x) => x.key === key) || PRESETS[2]
  if (p.days) from.setDate(from.getDate() - (p.days - 1))
  else if (p.months) { from.setMonth(from.getMonth() - (p.months - 1), 1) }
  else from.setMonth(0, 1)
  return { preset: p.key, from: iso(from), to: iso(to), granularity: p.days && p.days <= 31 ? 'day' : p.days ? 'week' : 'month' }
}

/** Controlled date-range filter: value = { preset, from, to, granularity } */
export function DateRangeFilter({ value, onChange, idPrefix = 'range' }) {
  const [custom, setCustom] = useState({ from: value.from, to: value.to })
  useEffect(() => { setCustom({ from: value.from, to: value.to }) }, [value.from, value.to])
  const applyCustom = () => {
    if (custom.from && custom.to && custom.from <= custom.to) onChange({ ...value, preset: 'custom', from: custom.from, to: custom.to })
  }
  return (
    <div className="range-filter" role="group" aria-label="Date range">
      <div className="seg">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" aria-pressed={value.preset === p.key} onClick={() => onChange(rangeForPreset(p.key))}>{p.label}</button>
        ))}
      </div>
      <div className="range-custom">
        <label className="sr-only" htmlFor={`${idPrefix}-from`}>From</label>
        <input id={`${idPrefix}-from`} type="date" className="input" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} onBlur={applyCustom} />
        <span className="muted" aria-hidden="true">–</span>
        <label className="sr-only" htmlFor={`${idPrefix}-to`}>To</label>
        <input id={`${idPrefix}-to`} type="date" className="input" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} onBlur={applyCustom} />
        <label className="sr-only" htmlFor={`${idPrefix}-gran`}>Group by</label>
        <select id={`${idPrefix}-gran`} className="select" value={value.granularity} onChange={(e) => onChange({ ...value, granularity: e.target.value })}>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>
    </div>
  )
}

/** "Updated 14:05:12 · refreshes every 60 s" + manual refresh. Honest about periodic refresh. */
export function RefreshBar({ lastUpdated, refreshing, onRefresh, pollMs }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="refresh-bar" aria-live="polite">
      <span>
        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Loading…'}
        {pollMs ? ` · refreshes every ${Math.round(pollMs / 1000)} s while this tab is open` : ''}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={refreshing} aria-label="Refresh data now">
        <RotateCw size={14} className={refreshing ? 'spin' : ''} aria-hidden="true" /> {refreshing ? 'Refreshing' : 'Refresh'}
      </button>
    </div>
  )
}

/** Small legend-style list for status breakdowns (used beside donut/bar charts). */
export function StatusLegend({ rows, valueKey = 'count', money = false }) {
  const total = rows.reduce((s, r) => s + Number(r[valueKey] || 0), 0)
  return (
    <ul className="status-legend">
      {rows.map((r) => (
        <li key={r.status}>
          <span className="chart-tip-dot" style={{ background: STATUS_COLOR[r.status] || CHART.slate }} aria-hidden="true" />
          <span>{titleCase(r.status)}</span>
          <strong>{money ? inrCompact(r[valueKey]) : Number(r[valueKey]).toLocaleString('en-IN')}</strong>
          <span className="muted">{total ? `${Math.round((Number(r[valueKey]) / total) * 100)}%` : ''}</span>
        </li>
      ))}
    </ul>
  )
}
