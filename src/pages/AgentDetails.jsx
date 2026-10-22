import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, UserCheck, Shield, Award, Phone, Mail, MapPin,
  Calendar, IndianRupee, FileText, AlertCircle, ExternalLink,
  Users, CheckCircle2, Star, Clock,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

import { initialAgents, AGENT_STATUS, formatINR } from '../data/agentData'
import { initialPolicies } from '../data/policyData'
import { initialClaims } from '../data/claimData'
import { initialCustomers, avatarColor, initials } from '../data/customerData'

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid #F8FAFC' }}>
      <Icon size={15} style={{ color: '#94A3B8', marginTop: 2, flexShrink: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748B', minWidth: 120 }}>{label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033', textAlign: 'right' }}>{value}</span>
      </div>
    </div>
  )
}

function MiniKPI({ icon: Icon, color, bg, label, value }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#172033' }}>{value}</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

const TABS = ['Overview', 'Assigned Policies', 'Assigned Claims', 'Customer Portfolio']

export default function AgentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agentsList] = useState(initialAgents)
  const [activeTab, setActiveTab] = useState('Overview')

  const agent = agentsList.find(a => a.agentId === id)

  if (!agent) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={32} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#172033' }}>Agent Not Found</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>
          No agent record with ID <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{id}</code> was found.
        </p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/agents')}>Back to Agents</Button>
      </div>
    )
  }

  const fullName = `${agent.firstName} ${agent.lastName}`
  const statusCfg = AGENT_STATUS[agent.status] || { label: agent.status, variant: 'gray' }

  // Related policies & claims
  const agentClaims = initialClaims.filter(c => c.assignedAgentId === agent.agentId)
  const agentPolicies = initialPolicies.slice(0, agent.assignedPoliciesCount || 4)
  const agentCustomers = initialCustomers.slice(0, agent.assignedCustomersCount || 4)

  return (
    <div>
      <PageHeader
        title={fullName}
        subtitle={`Agent ID: ${agent.agentId} • License: ${agent.licenseNumber} • ${agent.region}`}
        breadcrumbExtra={fullName}
        actions={
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/agents')}>
            Back to Agents
          </Button>
        }
      />

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MiniKPI icon={Shield} color="#168BFF" bg="#EFF6FF" label="Assigned Policies" value={agent.assignedPoliciesCount} />
        <MiniKPI icon={Users} color="#10B981" bg="#F0FDF4" label="Client Portfolio" value={agent.assignedCustomersCount} />
        <MiniKPI icon={AlertCircle} color="#F59E0B" bg="#FFFBEB" label="Active Claims" value={agent.assignedClaimsCount} />
        <MiniKPI icon={Star} color="#8B5CF6" bg="#F5F3FF" label="Performance Rating" value={`${agent.rating} / 5.0`} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            style={{
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? '#168BFF' : '#64748B',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: `2.5px solid ${activeTab === tab ? '#168BFF' : 'transparent'}`,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <Card>
            <CardHeader title="Agent Profile & Licensing" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: avatarColor(fullName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {initials(agent.firstName, agent.lastName)}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#172033' }}>{fullName}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Joined {agent.joiningDate}</span>
                </div>
              </div>
            </div>
            <InfoRow icon={Award} label="License Number" value={agent.licenseNumber} />
            <InfoRow icon={Shield} label="Specialization" value={agent.specialization} />
            <InfoRow icon={MapPin} label="Territory / Region" value={agent.region} />
            <InfoRow icon={IndianRupee} label="Commission Rate" value={`${agent.commissionRate}%`} />
          </Card>

          <Card>
            <CardHeader title="Contact & Location" />
            <InfoRow icon={Mail} label="Email Address" value={agent.email} />
            <InfoRow icon={Phone} label="Phone Number" value={agent.phone} />
            <InfoRow icon={MapPin} label="City / Base" value={agent.city} />
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Professional Bio</p>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{agent.bio}</p>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ASSIGNED POLICIES */}
      {activeTab === 'Assigned Policies' && (
        <Card>
          <CardHeader title="Managed Policy Portfolio" subtitle={`${agentPolicies.length} representative policies under advisory`} />
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy Number</th>
                  <th>Customer</th>
                  <th>Policy Type</th>
                  <th>Sum Assured</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agentPolicies.map(p => (
                  <tr key={p.policyId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#168BFF' }}>{p.policyNumber}</td>
                    <td style={{ fontWeight: 600 }}>{p.customerName}</td>
                    <td>{p.policyType}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(p.sumAssured)}</td>
                    <td><Badge variant={p.status === 'active' ? 'green' : 'yellow'}>{p.status}</Badge></td>
                    <td>
                      <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => navigate(`/policies/${p.policyId}`)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: ASSIGNED CLAIMS */}
      {activeTab === 'Assigned Claims' && (
        <Card>
          <CardHeader title="Assigned Investigation Claims" subtitle={`${agentClaims.length} claims currently assigned for evaluation`} />
          {agentClaims.length === 0 ? (
            <EmptyState title="No active claims" description="This agent currently has no active claims assigned for evaluation." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Customer</th>
                    <th>Claim Type</th>
                    <th>Date Filed</th>
                    <th>Claimed Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agentClaims.map(c => (
                    <tr key={c.claimId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#168BFF' }}>{c.claimId}</td>
                      <td style={{ fontWeight: 600 }}>{c.customerName}</td>
                      <td>{c.claimType}</td>
                      <td>{c.claimDate}</td>
                      <td style={{ fontWeight: 700 }}>{formatINR(c.claimedAmount)}</td>
                      <td><Badge variant={c.status === 'settled' ? 'green' : c.status === 'rejected' ? 'red' : 'blue'}>{c.status}</Badge></td>
                      <td>
                        <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => navigate(`/claims/${c.claimId}`)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: CUSTOMER PORTFOLIO */}
      {activeTab === 'Customer Portfolio' && (
        <Card>
          <CardHeader title="Assigned Customers" subtitle="Active policyholders serviced by this advisor" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {agentCustomers.map(c => (
              <div key={c.customerId} style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(`${c.firstName} ${c.lastName}`), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                    {initials(c.firstName, c.lastName)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.firstName} {c.lastName}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>{c.city}, {c.state}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => navigate(`/customers/${c.customerId}`)} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
