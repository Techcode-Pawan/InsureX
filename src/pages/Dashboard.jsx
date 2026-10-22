import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import { LayoutDashboard, TrendingUp, Users, Shield, AlertCircle, DollarSign, Clock } from 'lucide-react'

const statCards = [
  { label: 'Total Customers', value: '1,284', change: '+12.4%', trend: 'up', icon: Users, color: '#168BFF' },
  { label: 'Active Policies', value: '832', change: '+8.7%', trend: 'up', icon: Shield, color: '#10B981' },
  { label: 'Pending Claims', value: '47', change: '-3.2%', trend: 'down', icon: AlertCircle, color: '#F59E0B' },
  { label: 'Monthly Revenue', value: '$184,320', change: '+15.2%', trend: 'up', icon: DollarSign, color: '#8B5CF6' },
]

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with InsureX today."
      />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500, margin: '0 0 8px' }}>{stat.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#172033', margin: '0 0 6px', letterSpacing: '-0.5px' }}>{stat.value}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={13} style={{ color: stat.trend === 'up' ? '#10B981' : '#EF4444', transform: stat.trend === 'down' ? 'rotate(180deg)' : 'none' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: stat.trend === 'up' ? '#10B981' : '#EF4444' }}>{stat.change}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>vs last month</span>
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} style={{ color: stat.color }} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Placeholder notice */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(22,139,255,0.1), rgba(32,184,255,0.12))', border: '1px solid rgba(22,139,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LayoutDashboard size={24} style={{ color: '#168BFF' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#172033' }}>Dashboard Widgets</h3>
              <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                Coming Next
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.5 }}>
              Charts, recent activity, policy breakdowns, and claim summaries will be implemented in the next development phase.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
