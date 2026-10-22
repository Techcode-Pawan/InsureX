import { useState, useMemo } from 'react'
import {
  BarChart3, PieChart, TrendingUp, Download, Calendar,
  Shield, Banknote, Users, RefreshCcw, CheckCircle2,
  FileSpreadsheet, ArrowUpRight,
} from 'lucide-react'

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart as RechartsPie, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'

import {
  policyDistributionData, premiumMonthlyTrend, claimStatusDistribution,
  customerRegistrationTrend, renewalStatisticsData, reportKPIs,
  formatINR, exportToCSV,
} from '../data/reportData'

// Custom Tooltip for Rupee currency values
function CurrencyTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '8px 12px', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#94A3B8' }}>{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ margin: 0, color: entry.color || '#38BDF8', fontWeight: 600 }}>
            {entry.name}: {formatINR(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function StandardTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '8px 12px', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#94A3B8' }}>{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ margin: 0, color: entry.color || '#38BDF8', fontWeight: 600 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function MetricCard({ label, value, sub, change, icon: Icon, color, bg }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#172033' }}>{value}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {change && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10B981', display: 'inline-flex', alignItems: 'center' }}>
                <ArrowUpRight size={13} /> {change}
              </span>
            )}
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{sub}</span>
          </div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

export default function Reports() {
  const [timeframe, setTimeframe] = useState('12m') // '6m' | '12m' | 'ytd'
  const [toast, setToast] = useState(null)

  // Filter trends according to timeframe
  const filteredTrends = useMemo(() => {
    if (timeframe === '6m') return premiumMonthlyTrend.slice(-6)
    return premiumMonthlyTrend
  }, [timeframe])

  // CSV Export Handlers
  function handleExportPolicies() {
    exportToCSV('insurex_policy_distribution', policyDistributionData.map(d => ({
      Category: d.name,
      PolicyCount: d.count,
      TotalSumAssured: d.value,
    })))
    setToast({ message: 'Policy distribution exported to CSV.', type: 'success' })
  }

  function handleExportPremiums() {
    exportToCSV('insurex_premium_collections', premiumMonthlyTrend.map(d => ({
      Month: d.month,
      CollectedINR: d.collected,
      TargetINR: d.target,
    })))
    setToast({ message: 'Premium collections trend exported to CSV.', type: 'success' })
  }

  function handleExportClaims() {
    exportToCSV('insurex_claim_statistics', claimStatusDistribution.map(d => ({
      Status: d.name,
      ClaimsCount: d.count,
      TotalClaimValue: d.value,
    })))
    setToast({ message: 'Claim distribution exported to CSV.', type: 'success' })
  }

  function handleExportMaster() {
    const master = [
      { Metric: 'Gross Written Premium', Value: formatINR(reportKPIs.grossWrittenPremium) },
      { Metric: 'Claim Settlement Ratio', Value: `${reportKPIs.claimsSettlementRatio}%` },
      { Metric: 'Average Claim TAT', Value: `${reportKPIs.averageClaimTAT} days` },
      { Metric: 'Policy Retention Rate', Value: `${reportKPIs.policyRetentionRate}%` },
    ]
    exportToCSV('insurex_executive_kpis', master)
    setToast({ message: 'Executive summary report exported to CSV.', type: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Executive Reports & Analytics"
        subtitle="Business intelligence dashboard covering portfolio exposure, premium inflows, claim settlement ratios, and renewals."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="select"
              style={{ height: 34, fontSize: 12.5 }}
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
            >
              <option value="12m">Last 12 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportMaster}
            >
              Export Report (CSV)
            </Button>
          </div>
        }
      />

      {/* Demo notice banner */}
      <div style={{ padding: '9px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: '#64748B' }}>
          📊 <strong>Demonstration Datasets:</strong> All report calculations, charts, and ratios are generated from InsureX mock demonstration datasets.
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={handleExportPolicies}>Export Policies</Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={handleExportPremiums}>Export Premiums</Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={handleExportClaims}>Export Claims</Button>
        </div>
      </div>

      {/* Key Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 22 }}>
        <MetricCard
          label="Gross Written Premium"
          value={formatINR(reportKPIs.grossWrittenPremium)}
          change={`+${reportKPIs.gwpGrowthPct}%`}
          sub="vs preceding year"
          icon={Banknote}
          color="#168BFF"
          bg="#EFF6FF"
        />
        <MetricCard
          label="Claim Settlement Ratio"
          value={`${reportKPIs.claimsSettlementRatio}%`}
          change={reportKPIs.csrImprovement}
          sub="regulatory benchmark 90%"
          icon={CheckCircle2}
          color="#10B981"
          bg="#F0FDF4"
        />
        <MetricCard
          label="Average Claim Turnaround"
          value={`${reportKPIs.averageClaimTAT} Days`}
          sub="from filing to disbursement"
          icon={TrendingUp}
          color="#8B5CF6"
          bg="#F5F3FF"
        />
        <MetricCard
          label="Policy Retention Rate"
          value={`${reportKPIs.policyRetentionRate}%`}
          sub={reportKPIs.retentionTarget}
          icon={RefreshCcw}
          color="#F59E0B"
          bg="#FFFBEB"
        />
      </div>

      {/* CHART SECTION 1: Premium Inflow & Policy Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginBottom: 20 }}>
        {/* Monthly Premium Collection Trend */}
        <Card>
          <CardHeader
            title="Premium Collections Trend (₹)"
            subtitle="Actual collected vs budgeted target across months"
          />
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={filteredTrends} margin={{ top: 10, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11.5} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11.5}
                  tickFormatter={val => `₹${(val / 100000).toFixed(0)}L`}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Bar dataKey="collected" name="Collected" fill="#168BFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Policy Distribution Donut */}
        <Card>
          <CardHeader
            title="Policy Portfolio Distribution"
            subtitle="Distribution of policies by underwriting line"
          />
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <RechartsPie>
                <Pie
                  data={policyDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {policyDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<StandardTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11.5, lineHeight: '22px' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* CHART SECTION 2: Claims Status & Customer Registration Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginBottom: 20 }}>
        {/* Customer Onboarding Growth */}
        <Card>
          <CardHeader
            title="Customer Onboarding Velocity"
            subtitle="Monthly new customer registrations and active policyholders"
          />
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={customerRegistrationTrend} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11.5} />
                <YAxis stroke="#94A3B8" fontSize={11.5} />
                <Tooltip content={<StandardTooltip />} />
                <Area type="monotone" dataKey="newCustomers" name="New Registrations" stroke="#10B981" fillOpacity={1} fill="url(#custGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Claim Status Breakdown */}
        <Card>
          <CardHeader
            title="Claim Status Distribution"
            subtitle="Total claims classified by adjudication stage"
          />
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <RechartsPie>
                <Pie
                  data={claimStatusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {claimStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<StandardTooltip />} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* CHART SECTION 3: Quarterly Renewal Statistics */}
      <Card>
        <CardHeader
          title="Quarterly Policy Renewal Statistics"
          subtitle="Renewed vs Upcoming vs Overdue policies by quarterly cohort"
        />
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={renewalStatisticsData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="quarter" stroke="#94A3B8" fontSize={11.5} />
              <YAxis stroke="#94A3B8" fontSize={11.5} />
              <Tooltip content={<StandardTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="renewed" name="Renewed" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="upcoming" name="Upcoming" fill="#168BFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lapsed" name="Lapsed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
