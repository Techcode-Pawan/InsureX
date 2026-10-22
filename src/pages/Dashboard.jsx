import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Shield,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  ArrowRight,
  FolderOpen,
  Banknote,
  RefreshCcw,
  GitPullRequest,
  UserPlus,
  Eye,
  Info,
  Calendar,
  CheckCircle2,
  Wallet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge, { StatusBadge } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

import {
  kpiByRange,
  premiumByRange,
  policyDistribution,
  claimsByStatus,
  recentActivities,
  recentPolicies,
  quickActions,
  buildExportCSV,
} from '../data/dashboardData'

// Currency formatter for INR
function formatINR(val) {
  if (val === undefined || val === null) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

// Activity icon mapping helper
const activityIconMap = {
  Users,
  FolderOpen,
  Banknote,
  AlertCircle,
  RefreshCcw,
  GitPullRequest,
  Shield,
}

const quickActionIconMap = {
  UserPlus,
  Shield,
  FolderOpen,
  AlertCircle,
}

export default function Dashboard() {
  const navigate = useNavigate()

  // State
  const [selectedRange, setSelectedRange] = useState('30d')
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [notification, setNotification] = useState(null)

  // Demo new customer form state
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    policyType: 'Life Insurance',
  })

  // Current KPIs and chart data based on selected date range
  const currentKPI = kpiByRange[selectedRange] || kpiByRange['30d']
  const currentPremiums = premiumByRange[selectedRange] || premiumByRange['30d']

  // Filtered policies based on search query
  const filteredPolicies = useMemo(() => {
    if (!policySearch.trim()) return recentPolicies
    const query = policySearch.toLowerCase()
    return recentPolicies.filter(
      (p) =>
        p.id.toLowerCase().includes(query) ||
        p.customer.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query)
    )
  }, [policySearch])

  // Toast notification helper
  const showToast = (message) => {
    setNotification(message)
    setTimeout(() => {
      setNotification(null)
    }, 3500)
  }

  // CSV Report Export handler
  const handleExportCSV = () => {
    try {
      const csvContent = buildExportCSV(currentKPI, selectedRange)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `InsureX_Dashboard_Report_${selectedRange}_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('Dashboard summary exported to CSV successfully.')
    } catch {
      showToast('Export failed. Please try again.')
    }
  }

  // Quick Action click dispatcher
  const handleQuickAction = (action) => {
    if (action.action === 'modal' && action.label === 'Add Customer') {
      setIsAddCustomerOpen(true)
    } else if (action.link) {
      navigate(action.link)
    }
  }

  // Demo customer form submission
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault()
    setIsAddCustomerOpen(false)
    showToast(`Demonstration: Customer "${customerForm.fullName || 'New Customer'}" recorded in preview mode.`)
    setCustomerForm({ fullName: '', email: '', phone: '', policyType: 'Life Insurance' })
  }

  // KPI card configs
  const kpiCards = [
    {
      id: 'customers',
      title: 'Total Customers',
      value: currentKPI.totalCustomers.value.toLocaleString('en-IN'),
      supporting: 'Registered insurance customers',
      change: currentKPI.totalCustomers.change,
      icon: Users,
      color: '#168BFF',
      bgColor: 'rgba(22, 139, 255, 0.1)',
      isTrendGood: currentKPI.totalCustomers.change >= 0,
    },
    {
      id: 'policies',
      title: 'Active Policies',
      value: currentKPI.activePolicies.value.toLocaleString('en-IN'),
      supporting: 'Currently active policies',
      change: currentKPI.activePolicies.change,
      icon: Shield,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      isTrendGood: currentKPI.activePolicies.change >= 0,
    },
    {
      id: 'claims',
      title: 'Pending Claims',
      value: currentKPI.pendingClaims.value.toLocaleString('en-IN'),
      supporting: 'Claims awaiting further action',
      change: currentKPI.pendingClaims.change,
      icon: AlertCircle,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      // For claims, a decrease is positive for loss ratio
      isTrendGood: currentKPI.pendingClaims.change <= 0,
    },
    {
      id: 'premiums',
      title: 'Premiums Collected',
      value: formatINR(currentKPI.premiumsCollected.value),
      supporting: 'Premium payments recorded',
      change: currentKPI.premiumsCollected.change,
      icon: Wallet,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      isTrendGood: currentKPI.premiumsCollected.change >= 0,
    },
  ]

  // Total claims count for Claims Overview
  const totalClaimsCount = claimsByStatus.reduce((acc, curr) => acc + curr.count, 0)
  const settledClaimsCount = claimsByStatus.find((c) => c.status === 'Settled')?.count || 0
  const settlementRate = Math.round((settledClaimsCount / totalClaimsCount) * 100)

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: '#061426',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header with Date Filter and CSV Export */}
      <PageHeader
        title="Dashboard"
        subtitle="Monitor your insurance operations at a glance."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Date Range Selector */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '3px 4px',
                gap: 2,
              }}
            >
              <Calendar size={14} style={{ color: 'var(--color-text-secondary)', marginLeft: 8, marginRight: 4 }} />
              {[
                { label: '7D', value: '7d', title: 'Last 7 Days' },
                { label: '30D', value: '30d', title: 'Last 30 Days' },
                { label: '90D', value: '90d', title: 'Last 90 Days' },
                { label: 'Year', value: 'year', title: 'This Year' },
              ].map((range) => {
                const isActive = selectedRange === range.value
                return (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => setSelectedRange(range.value)}
                    title={range.title}
                    style={{
                      border: 'none',
                      background: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {range.label}
                  </button>
                )
              })}
            </div>

            {/* Export Report Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              title="Export current dashboard overview to CSV"
            >
              Export Report
            </Button>
          </div>
        }
      />

      {/* Demonstration Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          background: 'rgba(22, 139, 255, 0.05)',
          border: '1px solid rgba(22, 139, 255, 0.15)',
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Demonstration Environment:</strong> Figures and records below are simulated enterprise demonstration data. No live backend database is currently connected.
          </p>
        </div>
        <span
          className="badge badge-blue"
          style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}
        >
          {selectedRange === '7d' && 'Last 7 Days View'}
          {selectedRange === '30d' && 'Last 30 Days View'}
          {selectedRange === '90d' && 'Last 90 Days View'}
          {selectedRange === 'year' && 'Full Year View'}
        </span>
      </div>

      {/* 4 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          const isPositiveChange = kpi.change > 0
          return (
            <Card key={kpi.id} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      margin: '0 0 8px',
                    }}
                  >
                    {kpi.title}
                  </p>
                  <p
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      margin: '0 0 6px',
                      letterSpacing: '-0.5px',
                      lineHeight: 1.15,
                    }}
                  >
                    {kpi.value}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#94A3B8',
                      margin: '0 0 10px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {kpi.supporting}
                  </p>

                  {/* Trend Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 700,
                        backgroundColor: kpi.isTrendGood ? '#F0FDF4' : '#FEF2F2',
                        color: kpi.isTrendGood ? '#15803D' : '#DC2626',
                      }}
                    >
                      {isPositiveChange ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>
                        {isPositiveChange ? '+' : ''}
                        {kpi.change}%
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}>vs previous period</span>
                  </div>
                </div>

                {/* KPI Icon Pill */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: kpi.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={24} style={{ color: kpi.color }} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions Bar */}
      <Card style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Quick Actions
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
              Fast-track common administrative tasks
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {quickActions.map((qa) => {
              const Icon = quickActionIconMap[qa.icon] || Shield
              const isPrimary = qa.label === 'Add Customer'
              return (
                <Button
                  key={qa.label}
                  variant={isPrimary ? 'primary' : 'secondary'}
                  size="sm"
                  icon={Icon}
                  onClick={() => handleQuickAction(qa)}
                >
                  {qa.label}
                </Button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Charts Grid: Premium Collection & Policy Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Premium Collection Chart */}
        <Card style={{ minHeight: 390, display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title="Premium Collection"
            subtitle="Track premium collections over time."
            actions={
              <span className="badge badge-blue">
                {selectedRange === 'year' ? '12 Months' : `${currentPremiums.length} Periods`}
              </span>
            }
          />
          <div style={{ flex: 1, width: '100%', minHeight: 280, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={currentPremiums} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#168BFF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#168BFF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickFormatter={(val) => {
                    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
                    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`
                    return `₹${val}`
                  }}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].value
                      return (
                        <div
                          style={{
                            background: '#061426',
                            color: '#FFFFFF',
                            padding: '8px 14px',
                            borderRadius: 8,
                            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                            fontSize: 12,
                          }}
                        >
                          <p style={{ margin: 0, color: '#94A3B8', fontSize: 11 }}>{label}</p>
                          <p style={{ margin: '3px 0 0', fontWeight: 700, fontSize: 14, color: '#20B8FF' }}>
                            {formatINR(data)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#168BFF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#premiumGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              marginTop: 10,
              fontSize: 12,
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Total in view: <strong style={{ color: 'var(--color-text-primary)' }}>{formatINR(currentKPI.premiumsCollected.value)}</strong></span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>Consistent positive inflow</span>
          </div>
        </Card>

        {/* Policy Distribution Chart */}
        <Card style={{ minHeight: 390, display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title="Policy Distribution"
            subtitle="Breakdown across active policy categories"
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Donut Chart */}
            <div style={{ width: '100%', height: 230, position: 'relative' }}>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={policyDistribution}
                    innerRadius={58}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {policyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        const total = policyDistribution.reduce((a, b) => a + b.value, 0)
                        const pct = ((item.value / total) * 100).toFixed(1)
                        return (
                          <div
                            style={{
                              background: '#061426',
                              color: '#FFFFFF',
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                            <p style={{ margin: '3px 0 0', color: '#20B8FF' }}>
                              {item.value.toLocaleString('en-IN')} policies ({pct}%)
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Donut Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>1,926</span>
                <span style={{ display: 'block', fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Policies
                </span>
              </div>
            </div>

            {/* Custom Compact Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 8 }}>
              {policyDistribution.map((item) => {
                const total = policyDistribution.reduce((a, b) => a + b.value, 0)
                const pct = ((item.value / total) * 100).toFixed(1)
                return (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</span>
                      <span style={{ color: '#94A3B8', fontSize: 11 }}>({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              marginTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Top Category: <strong style={{ color: 'var(--color-text-primary)' }}>Life Insurance (31.8%)</strong></span>
            <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/policies')}>
              Manage Categories →
            </span>
          </div>
        </Card>
      </div>

      {/* Claims Overview Bar Chart Section */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader
          title="Claims Overview"
          subtitle="Distribution of claims across workflow stages"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/claims')}>
              View Claims Pipeline →
            </Button>
          }
        />
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={claimsByStatus} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="status" stroke="#94A3B8" fontSize={11.5} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div
                        style={{
                          background: '#061426',
                          color: '#FFFFFF',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 600 }}>{data.status}</p>
                        <p style={{ margin: '3px 0 0', color: data.color, fontWeight: 700 }}>
                          {data.count} Claims
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {claimsByStatus.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Claims metrics footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>Total Processed</p>
            <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {totalClaimsCount} Claims
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>Settlement Success Rate</p>
            <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: '#10B981' }}>
              {settlementRate}%
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>Awaiting Action</p>
            <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: '#F59E0B' }}>
              48 Pending
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>Under Investigation</p>
            <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--color-primary)' }}>
              34 Reviewing
            </p>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Recent Activities & Recent Policies */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
        }}
      >
        {/* Recent Activity Panel */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title="Recent Activity"
            subtitle="Real-time operational audit log"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports')}
              >
                View All
              </Button>
            }
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivities.map((act) => {
              const Icon = activityIconMap[act.icon] || Shield
              return (
                <div
                  key={act.id}
                  onClick={() => act.link && navigate(act.link)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: act.link ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (act.link) e.currentTarget.style.backgroundColor = '#F8FAFC'
                  }}
                  onMouseLeave={(e) => {
                    if (act.link) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(22, 139, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {act.title}
                      </p>
                      <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{act.time}</span>
                    </div>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 12.5,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {act.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)', marginTop: 14 }}>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate('/claim-processing')}
            >
              Open Audit & Operations Center
            </Button>
          </div>
        </Card>

        {/* Recent Policies Table */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title="Recent Policies"
            subtitle="Latest policy contracts under administration"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/policies')}
              >
                View All
              </Button>
            }
          />

          {/* Search bar */}
          <div style={{ marginBottom: 14 }}>
            <div className="input-wrapper">
              <Search size={15} className="input-prefix-icon" />
              <input
                type="text"
                className="input input-icon-left"
                placeholder="Search by policy number or customer..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                style={{ fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="data-table-wrapper" style={{ flex: 1, minHeight: 280 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Premium</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.length > 0 ? (
                  filteredPolicies.slice(0, 6).map((policy) => (
                    <tr key={policy.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                        {policy.id}
                      </td>
                      <td style={{ fontWeight: 500 }}>{policy.customer}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 12.5 }}>{policy.type}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(policy.premium)}</td>
                      <td>
                        <StatusBadge status={policy.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => setSelectedPolicy(policy)}
                          title="View policy details"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: '#94A3B8' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No policies matching &quot;{policySearch}&quot;</p>
                      <button
                        type="button"
                        onClick={() => setPolicySearch('')}
                        style={{
                          marginTop: 8,
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: 12,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Clear search filter
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Showing {Math.min(6, filteredPolicies.length)} of {filteredPolicies.length} policies</span>
            <span
              style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => navigate('/policies')}
            >
              Full Policy Registry <ArrowRight size={13} />
            </span>
          </div>
        </Card>
      </div>

      {/* Policy Details Demonstration Modal */}
      <Modal
        open={Boolean(selectedPolicy)}
        onClose={() => setSelectedPolicy(null)}
        title={selectedPolicy ? `Policy Record: ${selectedPolicy.id}` : 'Policy Details'}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Mock Demonstration Record</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedPolicy(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedPolicy(null)
                  navigate('/policies')
                }}
              >
                Go to Policies Page
              </Button>
            </div>
          </div>
        }
      >
        {selectedPolicy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Insured Customer
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {selectedPolicy.customer}
                </p>
              </div>
              <StatusBadge status={selectedPolicy.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                fontSize: 13,
              }}
            >
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>POLICY TYPE</p>
                <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {selectedPolicy.type}
                </p>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>ANNUAL PREMIUM</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>
                  {formatINR(selectedPolicy.premium)}
                </p>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>EFFECTIVE DATE</p>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-primary)' }}>{selectedPolicy.startDate}</p>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>RENEWAL DUE DATE</p>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-primary)' }}>{selectedPolicy.expiryDate}</p>
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(22, 139, 255, 0.05)',
                border: '1px solid rgba(22, 139, 255, 0.15)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              <strong style={{ color: 'var(--color-primary)' }}>Note:</strong> This modal is a frontend demonstration component. In production, policy documents and live endorsement histories will be fetched from the database backend.
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Action: Add Customer Demonstration Modal */}
      <Modal
        open={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add New Customer (Preview)"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddCustomerSubmit}>
              Save Customer (Demo)
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              fontSize: 12,
              color: '#92400E',
            }}
          >
            <strong>Demonstration Workflow:</strong> This form demonstrates customer intake. No backend database operations are performed.
          </div>

          <div>
            <label className="input-label" htmlFor="customer-name">
              Full Legal Name *
            </label>
            <input
              id="customer-name"
              type="text"
              className="input"
              required
              placeholder="e.g. Vikramaditya Sharma"
              value={customerForm.fullName}
              onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div>
              <label className="input-label" htmlFor="customer-email">
                Email Address *
              </label>
              <input
                id="customer-email"
                type="email"
                className="input"
                required
                placeholder="client@example.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label" htmlFor="customer-phone">
                Phone Number *
              </label>
              <input
                id="customer-phone"
                type="tel"
                className="input"
                required
                placeholder="+91 98765 43210"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="customer-policy">
              Interested Insurance Category
            </label>
            <select
              id="customer-policy"
              className="select"
              value={customerForm.policyType}
              onChange={(e) => setCustomerForm({ ...customerForm, policyType: e.target.value })}
            >
              <option value="Life Insurance">Life Insurance</option>
              <option value="Health Insurance">Health Insurance</option>
              <option value="Vehicle Insurance">Vehicle Insurance</option>
              <option value="Home Insurance">Home Insurance</option>
              <option value="Travel Insurance">Travel Insurance</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
