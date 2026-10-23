import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import insuranceService from '../services/insuranceService'
import {
  AreaChart, Area,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import {
  Users, Shield, AlertCircle, IndianRupee,
  Download, Search, Eye, ArrowRight,
  Clock, CheckCircle2, FileText, RefreshCcw,
  ExternalLink, ChevronRight, AlertTriangle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Badge, { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

import {
  kpiByRange,
  premiumChartByRange,
  policyDistribution,
  claimsOverviewByRange,
  recentActivities,
  recentPolicies,
  dateRangeOptions,
  formatINR,
  formatINRFull,
  generateDashboardCSV,
} from '../data/dashboardData'

// Custom Clean Chart Tooltip
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: 'var(--shadow-md)',
      fontSize: 12.5,
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#172033' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: '#168BFF', fontWeight: 500 }}>
          {p.name}: <strong style={{ color: '#172033' }}>{formatter ? formatter(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

function yAxisINR(value) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAgent = user?.role === 'AGENT'

  const [range, setRange] = useState('30d')
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState(null)
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
        console.warn('Dashboard summary live notice:', err.message)
      }
    }
    loadDashboardSummary()
    return () => { isMounted = false }
  }, [])

  const kpi = kpiByRange[range] || kpiByRange['30d']
  const premiumChart = premiumChartByRange[range] || premiumChartByRange['30d']

  const displayTotalCustomers = liveKpi?.totalCustomers !== undefined ? liveKpi.totalCustomers : kpi.totalCustomers.value
  const displayActivePolicies = liveKpi?.activePolicies !== undefined ? liveKpi.activePolicies : kpi.activePolicies.value
  const displayPendingClaims = liveKpi?.pendingClaims !== undefined ? liveKpi.pendingClaims : kpi.pendingClaims.value
  const displayPremiumsCollected = liveKpi?.totalPremiumsCollected !== undefined ? Number(liveKpi.totalPremiumsCollected) : kpi.premiumsCollected.value

  const filteredPolicies = useMemo(() => {
    const q = policySearch.toLowerCase().trim()
    if (!q) return recentPolicies
    return recentPolicies.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.customer.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    )
  }, [policySearch])

  function handleExportCSV() {
    const csv = generateDashboardCSV(range)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `insurex-operations-report-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPolicyCount = useMemo(() => {
    return policyDistribution.reduce((acc, curr) => acc + curr.value, 0)
  }, [])

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────── */}
      <PageHeader
        title={isAgent ? "Advisor Operations Workspace" : "Operations Overview"}
        subtitle={
          isAgent
            ? `Portfolio summary for ${user?.name || 'Agent'} — track active client policies, pending submissions, and claims.`
            : "Centralized oversight of policies in force, premium cashflows, claim pipelines, and regulatory verification."
        }
        actions={
          <>
            <div style={{ position: 'relative' }}>
              <select
                className="select"
                value={range}
                onChange={e => setRange(e.target.value)}
                aria-label="Select report date range"
                id="date-range-selector"
                style={{ minWidth: 130, fontSize: 12.5, height: 34 }}
              >
                {dateRangeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              id="export-report-btn"
              aria-label="Export operations report as CSV"
            >
              Export Ledger
            </Button>
          </>
        }
      />

      {/* ── Contextual Operational Alert Ribbon ────────────── */}
      <div
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#92400E' }}>
            <strong>Operational Attention:</strong> 18 policies due for renewal this month • 48 pending claims awaiting verification.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            to="/admin/renewals"
            style={{ fontSize: 12.5, fontWeight: 600, color: '#B45309', textDecoration: 'none' }}
          >
            Review Renewals →
          </Link>
          <Link
            to="/admin/claim-processing"
            style={{ fontSize: 12.5, fontWeight: 600, color: '#B45309', textDecoration: 'none' }}
          >
            Claim Processing →
          </Link>
        </div>
      </div>

      {/* ── Cohesive Summary Metric Strip ──────────────────── */}
      <dl className="summary-strip" aria-label="Key Operational Metrics">
        <div className="summary-metric">
          <dt>
            <Shield size={14} style={{ color: '#168BFF' }} />
            Active Policies
          </dt>
          <dd>{displayActivePolicies.toLocaleString('en-IN')}</dd>
          <p>Policies currently in force</p>
        </div>

        <div className="summary-metric">
          <dt>
            <IndianRupee size={14} style={{ color: '#10B981' }} />
            Premiums Collected
          </dt>
          <dd>{formatINR(displayPremiumsCollected)}</dd>
          <p>Cashflow in {dateRangeOptions.find(o => o.value === range)?.label.toLowerCase()}</p>
        </div>

        <div className="summary-metric">
          <dt>
            <AlertCircle size={14} style={{ color: '#F59E0B' }} />
            Pending Claims
          </dt>
          <dd>{displayPendingClaims.toString()}</dd>
          <p>Awaiting underwriting adjudication</p>
        </div>

        <div className="summary-metric">
          <dt>
            <Users size={14} style={{ color: '#6366F1' }} />
            Registered Customers
          </dt>
          <dd>{displayTotalCustomers.toLocaleString('en-IN')}</dd>
          <p>Verified account holders</p>
        </div>
      </dl>

      {/* ── Main Two-Column Operations Layout ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1.2fr)', gap: 20, marginBottom: 20 }} className="dashboard-grid">
        
        {/* Left Column: Premium Cashflow Chart & Recent Policy Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Cashflow Chart */}
          <Card padding={false}>
            <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Premium Inflow Trend</h3>
                <p className="card-subtitle">Aggregated collections across active carriers</p>
              </div>
              <span className="badge badge-blue">
                {dateRangeOptions.find(o => o.value === range)?.label}
              </span>
            </div>

            <div style={{ padding: '10px 14px 16px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={premiumChart} margin={{ top: 6, right: 12, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#168BFF" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#168BFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#EDF2F7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={yAxisINR} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<ChartTooltip formatter={formatINRFull} />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Premium Collection"
                    stroke="#168BFF"
                    strokeWidth={2}
                    fill="url(#premiumGrad)"
                    dot={{ r: 3, fill: '#168BFF', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#168BFF' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent Policy Ledger */}
          <Card padding={false}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h3 className="card-title">Recent Policy Underwritings</h3>
                <p className="card-subtitle">Latest issued contracts and renewals</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="search"
                    className="input input-icon-left"
                    placeholder="Filter recent policies…"
                    value={policySearch}
                    onChange={e => setPolicySearch(e.target.value)}
                    style={{ height: 32, fontSize: 12, width: 180 }}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/policies')}>
                  All Policies
                </Button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" aria-label="Recent policy register">
                <thead>
                  <tr>
                    <th>Policy No.</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th className="numeric">Annual Premium</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.slice(0, 6).map(policy => (
                    <tr key={policy.id}>
                      <td className="font-mono-id" style={{ color: '#168BFF', fontWeight: 600 }}>{policy.id}</td>
                      <td style={{ fontWeight: 500 }}>{policy.customer}</td>
                      <td style={{ color: '#64748B' }}>{policy.type}</td>
                      <td className="numeric" style={{ fontWeight: 600 }}>{formatINRFull(policy.premium)}</td>
                      <td style={{ color: '#64748B', fontSize: 12.5 }}>{policy.expiryDate}</td>
                      <td><StatusBadge status={policy.status} /></td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '3px 8px', fontSize: 12, color: 'var(--color-primary)' }}
                          onClick={() => setSelectedPolicy(policy)}
                          aria-label={`View policy ${policy.id}`}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Operations Queue, Portfolio Distribution, Event Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Operations Processing Queue */}
          <Card>
            <h3 className="card-title" style={{ marginBottom: 4 }}>Operations Queue</h3>
            <p className="card-subtitle" style={{ marginBottom: 14 }}>Urgent tasks requiring underwriting or agent action</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Claims Awaiting Adjudication', count: 48, route: '/admin/claim-processing', color: '#B45309', bg: '#FFFBEB' },
                { label: 'Applications Under Review', count: 14, route: '/admin/applications', color: '#1D4ED8', bg: '#EFF6FF' },
                { label: 'Policies Expiring in 30 Days', count: 18, route: '/admin/renewals', color: '#B91C1C', bg: '#FEF2F2' },
                { label: 'Unverified Policy Documents', count: 6, route: '/admin/documents', color: '#6D28D9', bg: '#F5F3FF' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.route}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFFFFF' }}
                >
                  <span style={{ fontSize: 12.5, color: '#172033', fontWeight: 500 }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: item.bg,
                        color: item.color,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {item.count}
                    </span>
                    <ChevronRight size={14} style={{ color: '#94A3B8' }} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Portfolio Distribution by Category */}
          <Card padding={false}>
            <div style={{ padding: '16px 20px 8px' }}>
              <h3 className="card-title">Portfolio Distribution</h3>
              <p className="card-subtitle">Active contracts classified by line of business</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 16px' }}>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={policyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={66}
                    dataKey="value"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {policyDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} policies`, name]}
                    contentStyle={{ borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 4 }}>
                {policyDistribution.map(item => {
                  const pct = ((item.value / totalPolicyCount) * 100).toFixed(0)
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                        <span style={{ color: '#64748B' }}>{item.name.replace(' Insurance', '')}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#172033' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* System Activity Feed */}
          <Card padding={false}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Audit Ledger</h3>
                <p className="card-subtitle">Latest system activities</p>
              </div>
              <Link to="/admin/reports" style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                View Logs
              </Link>
            </div>

            <div style={{ padding: '4px 0' }}>
              {recentActivities.slice(0, 4).map((act, i) => (
                <div
                  key={act.id}
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    borderBottom: i < 3 ? '1px solid #F8FAFC' : 'none',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#168BFF', marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#172033', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.description}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{act.time}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

      {/* ── Policy Detail Inspection Modal ─────────────────── */}
      {selectedPolicy && (
        <Modal
          open={!!selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          title={`Policy Details — ${selectedPolicy.id}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setSelectedPolicy(null)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={ExternalLink}
                iconPosition="right"
                onClick={() => {
                  const id = selectedPolicy.id
                  setSelectedPolicy(null)
                  navigate(`/admin/policies/${id}`)
                }}
              >
                Open Full Policy Record
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Policy Identifier', selectedPolicy.id],
              ['Customer Name', selectedPolicy.customer],
              ['Line of Business', selectedPolicy.type],
              ['Annual Premium', `${formatINRFull(selectedPolicy.premium)} / yr`],
              ['Effective Date', selectedPolicy.startDate],
              ['Expiration Date', selectedPolicy.expiryDate],
              ['Current Status', <StatusBadge key="s" status={selectedPolicy.status} />],
              ['Underwriting Carrier', 'InsureX National Underwriters'],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 11.5, color: '#64748B', display: 'block', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#172033', fontWeight: 600, marginTop: 2, display: 'block' }}>{val}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
