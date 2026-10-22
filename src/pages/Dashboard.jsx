import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import insuranceService from '../services/insuranceService'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Shield, AlertCircle, IndianRupee,
  TrendingUp, TrendingDown, Download, Search,
  Eye, UserPlus, FolderOpen, Banknote,
  RefreshCcw, CheckCircle2, ExternalLink,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge, { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

import {
  kpiByRange,
  premiumChartByRange,
  policyDistribution,
  claimsOverviewByRange,
  claimStatusColors,
  recentActivities,
  recentPolicies,
  dateRangeOptions,
  formatINR,
  formatINRFull,
  generateDashboardCSV,
} from '../data/dashboardData'

// ── Icon map for activity feed ──────────────────────────────
const ACTIVITY_ICONS = {
  UserPlus,
  FolderOpen,
  Banknote,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  Shield,
}

// ── Activity icon colors ────────────────────────────────────
const ACTIVITY_COLORS = {
  customer:    { bg: '#EFF6FF', color: '#168BFF' },
  application: { bg: '#F5F3FF', color: '#6366F1' },
  payment:     { bg: '#F0FDF4', color: '#10B981' },
  claim:       { bg: '#FFFBEB', color: '#F59E0B' },
  renewal:     { bg: '#EFF6FF', color: '#20B8FF' },
  policy:      { bg: '#EFF6FF', color: '#168BFF' },
}

// ── Custom chart tooltip ────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(6,20,38,0.10)',
      fontSize: 13,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#172033' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || '#168BFF' }}>
          {p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Donut chart custom label ────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Y-axis formatter for premium chart ─────────────────────
function yAxisINR(value) {
  if (value >= 1000000) return `₹${(value / 100000).toFixed(0)}L`
  if (value >= 1000)    return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

// ── KPI Card ───────────────────────────────────────────────
function KPICard({ title, subtitle, value, displayValue, change, icon: Icon, iconColor }) {
  const isUp = change >= 0
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#172033', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {displayValue}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#94A3B8' }}>{subtitle}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isUp
              ? <TrendingUp size={13} style={{ color: '#10B981', flexShrink: 0 }} />
              : <TrendingDown size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
            }
            <span style={{ fontSize: 12.5, fontWeight: 700, color: isUp ? '#10B981' : '#EF4444' }}>
              {isUp ? '+' : ''}{change}%
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>vs prev. period</span>
          </div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `${iconColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={24} style={{ color: iconColor }} />
        </div>
      </div>
    </Card>
  )
}

// ── Policy detail modal content ────────────────────────────
function PolicyDetailModal({ policy, onClose, onViewFull }) {
  if (!policy) return null
  return (
    <Modal open={!!policy} onClose={onClose} title="Policy Details"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button variant="primary" size="sm" icon={ExternalLink} iconPosition="right"
            onClick={() => { onClose(); if (onViewFull) onViewFull(policy); }}>
            View Full Policy
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          ['Policy Number', policy.id],
          ['Customer', policy.customer],
          ['Policy Type', policy.type],
          ['Premium', formatINRFull(policy.premium) + ' / year'],
          ['Start Date', policy.startDate],
          ['Expiry Date', policy.expiryDate],
          ['Status', <StatusBadge key="s" status={policy.status} />],
        ].map(([label, val]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #F1F5F9',
          }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13.5, color: '#172033', fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
        ℹ️ Demonstration record — no backend data retrieved.
      </p>
    </Modal>
  )
}

// ── Add Customer modal ─────────────────────────────────────
function AddCustomerModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Add New Customer"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Save Customer</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: '#94A3B8', padding: '6px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          ℹ️ Demo form — data will not be saved to any database.
        </p>
        {['Full Name', 'Email Address', 'Phone Number', 'Date of Birth'].map(field => (
          <div key={field}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#172033', marginBottom: 6 }}>{field}</label>
            <input className="input" placeholder={`Enter ${field.toLowerCase()}`} style={{ height: 38 }} />
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState('30d')
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [liveKpi, setLiveKpi] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadDashboardSummary() {
      try {
        const res = await insuranceService.getDashboardSummary()
        const data = res?.data?.data || res?.data
        if (isMounted && data) {
          setLiveKpi(data)
        }
      } catch (err) {
        console.warn('Live dashboard summary notice:', err.message)
      }
    }
    loadDashboardSummary()
    return () => { isMounted = false }
  }, [])

  // ── Derived data from selected range ─────────────────────
  const kpi = kpiByRange[range]
  const premiumChart = premiumChartByRange[range]
  const claimsChart = claimsOverviewByRange[range]

  // Calculated values overlaying live database metrics when available
  const displayTotalCustomers = liveKpi?.totalCustomers !== undefined ? liveKpi.totalCustomers : kpi.totalCustomers.value
  const displayActivePolicies = liveKpi?.activePolicies !== undefined ? liveKpi.activePolicies : kpi.activePolicies.value
  const displayPendingClaims = liveKpi?.pendingClaims !== undefined ? liveKpi.pendingClaims : kpi.pendingClaims.value
  const displayPremiumsCollected = liveKpi?.totalPremiumsCollected !== undefined ? Number(liveKpi.totalPremiumsCollected) : kpi.premiumsCollected.value

  // ── Filtered policies ─────────────────────────────────────
  const filteredPolicies = useMemo(() => {
    const q = policySearch.toLowerCase().trim()
    if (!q) return recentPolicies
    return recentPolicies.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.customer.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    )
  }, [policySearch])

  // ── CSV Export ────────────────────────────────────────────
  function handleExportCSV() {
    const csv = generateDashboardCSV(range)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `insurex-dashboard-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        subtitle="Monitor your insurance operations at a glance."
        actions={
          <>
            {/* Date range selector */}
            <div style={{ position: 'relative' }}>
              <select
                className="select"
                value={range}
                onChange={e => setRange(e.target.value)}
                aria-label="Select date range"
                id="date-range-selector"
                style={{ minWidth: 140, fontSize: 13, height: 36, paddingTop: 0, paddingBottom: 0 }}
              >
                {dateRangeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Export button */}
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              id="export-report-btn"
              aria-label="Export dashboard report as CSV"
            >
              Export Report
            </Button>
          </>
        }
      />

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <section aria-label="Key Performance Indicators">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KPICard
            title="Total Customers"
            subtitle="Registered insurance customers"
            displayValue={displayTotalCustomers.toLocaleString('en-IN')}
            change={kpi.totalCustomers.change}
            icon={Users}
            iconColor="#168BFF"
          />
          <KPICard
            title="Active Policies"
            subtitle="Currently active policies"
            displayValue={displayActivePolicies.toLocaleString('en-IN')}
            change={kpi.activePolicies.change}
            icon={Shield}
            iconColor="#10B981"
          />
          <KPICard
            title="Pending Claims"
            subtitle="Claims awaiting further action"
            displayValue={displayPendingClaims.toString()}
            change={kpi.pendingClaims.change}
            icon={AlertCircle}
            iconColor="#F59E0B"
          />
          <KPICard
            title="Premiums Collected"
            subtitle="Premium payments recorded"
            displayValue={formatINR(displayPremiumsCollected)}
            change={kpi.premiumsCollected.change}
            icon={IndianRupee}
            iconColor="#8B5CF6"
          />
        </div>
      </section>

      {/* ── Charts Row 1: Premium + Policy Distribution ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16, marginBottom: 16 }}
           className="dashboard-charts-row">
        {/* Premium Collection Chart */}
        <Card padding={false}>
          <div style={{ padding: '20px 24px 0' }}>
            <CardHeader
              title="Premium Collection"
              subtitle="Track premium collections over time."
            />
          </div>
          <div style={{ padding: '0 8px 20px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={premiumChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#168BFF" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#168BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={yAxisINR} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<ChartTooltip formatter={formatINRFull} />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Premium"
                  stroke="#168BFF"
                  strokeWidth={2.5}
                  fill="url(#premiumGrad)"
                  dot={{ r: 3.5, fill: '#168BFF', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#168BFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Policy Distribution Donut */}
        <Card padding={false}>
          <div style={{ padding: '20px 24px 0' }}>
            <CardHeader title="Policy Distribution" subtitle="By insurance category." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={policyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  dataKey="value"
                  labelLine={false}
                  label={DonutLabel}
                >
                  {policyDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${v} policies`, name]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
              {policyDistribution.map(item => {
                const total = policyDistribution.reduce((s, d) => s + d.value, 0)
                const pct = ((item.value / total) * 100).toFixed(1)
                return (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#64748B' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#172033' }}>{item.value}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Charts Row 2: Claims Overview + Recent Activity ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, marginBottom: 16 }}
           className="dashboard-charts-row">
        {/* Claims Bar Chart */}
        <Card padding={false}>
          <div style={{ padding: '20px 24px 0' }}>
            <CardHeader title="Claims Overview" subtitle="Distribution of claim statuses." />
          </div>
          <div style={{ padding: '0 8px 20px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={claimsChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="count" name="Claims" radius={[6, 6, 0, 0]}>
                  {claimsChart.map((entry, i) => (
                    <Cell key={i} fill={claimStatusColors[entry.status] || '#168BFF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Latest system events</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12.5, color: '#168BFF', fontWeight: 600 }}
              onClick={() => navigate('/customers')}
              aria-label="View all activity"
            >
              View All
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
            {recentActivities.map((act, i) => {
              const Icon = ACTIVITY_ICONS[act.icon] || Shield
              const colors = ACTIVITY_COLORS[act.type] || ACTIVITY_COLORS.policy
              return (
                <button
                  key={act.id}
                  onClick={() => navigate(act.link)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '10px 24px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                    borderBottom: i < recentActivities.length - 1 ? '1px solid #F8FAFC' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  aria-label={`${act.title} — navigate to ${act.link}`}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} style={{ color: colors.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#172033', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.description}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginTop: 2 }}>{act.time}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Recent Policies Table ───────────────────────────── */}
      <Card padding={false} style={{ marginBottom: 16 }}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="card-title">Recent Policies</h3>
            <p className="card-subtitle">Latest issued and pending policies</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                type="search"
                className="input input-icon-left"
                placeholder="Search policy or customer…"
                value={policySearch}
                onChange={e => setPolicySearch(e.target.value)}
                aria-label="Search recent policies"
                id="policy-search"
                style={{ height: 36, fontSize: 13, width: 220 }}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/policies')} id="view-all-policies-btn">
              View All
            </Button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" role="table" aria-label="Recent policies">
            <thead>
              <tr>
                {['Policy No.', 'Customer', 'Type', 'Premium', 'Start Date', 'Expiry Date', 'Status', 'Action'].map(h => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: 13 }}>
                    No policies match your search.
                  </td>
                </tr>
              ) : (
                filteredPolicies.map(policy => (
                  <tr key={policy.id}>
                    <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{policy.id}</td>
                    <td style={{ fontWeight: 500 }}>{policy.customer}</td>
                    <td style={{ color: '#64748B' }}>{policy.type}</td>
                    <td style={{ fontWeight: 600 }}>{formatINRFull(policy.premium)}</td>
                    <td style={{ color: '#64748B', fontSize: 13 }}>{policy.startDate}</td>
                    <td style={{ color: '#64748B', fontSize: 13 }}>{policy.expiryDate}</td>
                    <td><StatusBadge status={policy.status} /></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ gap: 5, color: '#168BFF', fontSize: 12.5, padding: '5px 10px' }}
                        onClick={() => setSelectedPolicy(policy)}
                        aria-label={`View details for policy ${policy.id}`}
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <Card>
        <h3 className="card-title" style={{ marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Add Customer',         icon: UserPlus,    color: '#168BFF', bg: '#EFF6FF', action: () => setAddCustomerOpen(true) },
            { label: 'View Policies',         icon: Shield,      color: '#10B981', bg: '#F0FDF4', action: () => navigate('/policies') },
            { label: 'Review Applications',   icon: FolderOpen,  color: '#6366F1', bg: '#F5F3FF', action: () => navigate('/applications') },
            { label: 'Review Claims',         icon: AlertCircle, color: '#F59E0B', bg: '#FFFBEB', action: () => navigate('/claims') },
          ].map(({ label, icon: Icon, color, bg, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '18px 12px', borderRadius: 12, background: bg, border: `1.5px solid ${color}20`,
                cursor: 'pointer', transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${color}22` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              aria-label={label}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} style={{ color }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#172033', textAlign: 'center' }}>{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Demo data notice ────────────────────────────────── */}
      <p style={{ textAlign: 'center', fontSize: 11.5, color: '#CBD5E1', margin: '16px 0 0', paddingBottom: 8 }}>
        ℹ️ All figures shown are demonstration data only and do not represent real business statistics.
      </p>

      {/* ── Modals ──────────────────────────────────────────── */}
      <PolicyDetailModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} onViewFull={(p) => navigate(`/policies/${p.id}`)} />
      <AddCustomerModal open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} />
    </div>
  )
}
