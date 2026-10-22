import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Shield, IndianRupee, Calendar, CalendarClock,
  User, Mail, Phone, MapPin, FileText, AlertCircle, RefreshCcw,
  Users, CheckCircle2, Banknote,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Toast } from '../components/ui/Toast'
import PolicyFormModal from '../components/policies/PolicyFormModal'

import {
  initialPolicies, formatINR,
  getPolicyPremiums, getPolicyPayments, getPolicyClaims,
  getPolicyBeneficiaries, getPolicyRenewals, getCustomerForPolicy,
  POLICY_STATUS, PREMIUM_STATUS, CLAIM_STATUS, RENEWAL_STATUS, PAYMENT_STATUS,
} from '../data/policyData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ map, status }) {
  const cfg = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
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

// ── Tabs ─────────────────────────────────────────────────────
const TABS = ['Overview', 'Premiums', 'Payments', 'Claims', 'Beneficiaries', 'Renewals']

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 20, overflowX: 'auto' }}>
      {TABS.map(tab => (
        <button key={tab} onClick={() => onChange(tab)} role="tab" aria-selected={active === tab}
          style={{
            padding: '10px 18px', fontSize: 13.5, fontWeight: active === tab ? 700 : 500,
            color: active === tab ? '#168BFF' : '#64748B',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2.5px solid ${active === tab ? '#168BFF' : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
          }}>{tab}</button>
      ))}
    </div>
  )
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

// ════════════════════════════════════════════════════════════
export default function PolicyDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [policies, setPolicies] = useState(initialPolicies)
  const policy = policies.find(p => p.policyId === id)

  const [activeTab, setActiveTab] = useState('Overview')
  const [editOpen, setEditOpen]   = useState(false)
  const [toast, setToast]         = useState(null)

  // ── Not found ──────────────────────────────────────────
  if (!policy) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={32} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#172033' }}>Policy Not Found</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>No policy with ID <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{id}</code> was found.</p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/policies')}>Back to Policies</Button>
      </div>
    )
  }

  const customer = getCustomerForPolicy(policy.customerId)
  const premiums = getPolicyPremiums(policy.policyId)
  const payments = getPolicyPayments(policy.policyId)
  const claims   = getPolicyClaims(policy.policyId)
  const bens     = getPolicyBeneficiaries(policy.policyId)
  const renewals = getPolicyRenewals(policy.policyId)

  const totalPremiumPaid = premiums.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const policyDays = daysBetween(policy.startDate, policy.expiryDate)

  function handleEdit(fields) {
    setPolicies(ps => ps.map(p => p.policyId === policy.policyId ? { ...p, ...fields } : p))
    setToast({ message: 'Policy updated successfully.', type: 'success' })
    setEditOpen(false)
  }

  const stCfg = POLICY_STATUS[policy.status] || { label: policy.status, variant: 'gray' }

  // ── Overview ───────────────────────────────────────────
  function OverviewTab() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }} className="details-grid">
        <Card>
          <CardHeader title="Policy Information" />
          <InfoRow icon={Shield}       label="Policy Number"     value={policy.policyNumber} />
          <InfoRow icon={FileText}     label="Policy Type"       value={policy.policyType} />
          <InfoRow icon={IndianRupee}  label="Sum Assured"       value={formatINR(policy.sumAssured)} />
          <InfoRow icon={IndianRupee}  label="Premium"           value={`${formatINR(policy.premiumAmount)} / ${policy.premiumFrequency}`} />
          <InfoRow icon={Calendar}     label="Start Date"        value={policy.startDate} />
          <InfoRow icon={CalendarClock}label="Expiry Date"       value={policy.expiryDate} />
          <InfoRow icon={Calendar}     label="Policy Period"     value={`${policyDays} days`} />
        </Card>

        {customer ? (
          <Card>
            <CardHeader title="Customer Information" actions={
              <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${customer.customerId}`)}>
                View Profile
              </Button>
            } />
            <InfoRow icon={User}   label="Name"    value={`${customer.firstName} ${customer.lastName}`} />
            <InfoRow icon={Mail}   label="Email"   value={customer.email} />
            <InfoRow icon={Phone}  label="Phone"   value={customer.phone} />
            <InfoRow icon={MapPin} label="City"     value={`${customer.city}, ${customer.state}`} />
          </Card>
        ) : (
          <Card>
            <CardHeader title="Customer Information" />
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Customer: {policy.customerName} ({policy.customerId})</p>
          </Card>
        )}
      </div>
    )
  }

  function TabTable({ title, empty, headers, rows }) {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">{title}</h3></div>
        {rows.length === 0
          ? <EmptyState title={empty} description={`No ${title.toLowerCase()} records for this policy.`} />
          : <div style={{ overflowX: 'auto' }}>
              <table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{rows}</tbody>
              </table>
            </div>
        }
      </Card>
    )
  }

  function PremiumsTab() {
    return (
      <TabTable title="Premium Installments" empty="No premiums" headers={['ID', 'Amount', 'Due Date', 'Paid Date', 'Status']}
        rows={premiums.map(p => (
          <tr key={p.premiumId}>
            <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{p.premiumId}</td>
            <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{p.dueDate}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{p.paidDate || '—'}</td>
            <td><SBadge map={PREMIUM_STATUS} status={p.status} /></td>
          </tr>
        ))}
      />
    )
  }

  function PaymentsTab() {
    return (
      <TabTable title="Payment History" empty="No payments" headers={['ID', 'Amount', 'Date', 'Mode', 'Status']}
        rows={payments.map(p => (
          <tr key={p.paymentId}>
            <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{p.paymentId}</td>
            <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{p.paymentDate}</td>
            <td style={{ fontSize: 13 }}>{p.mode}</td>
            <td><SBadge map={PAYMENT_STATUS} status={p.status} /></td>
          </tr>
        ))}
      />
    )
  }

  function ClaimsTab() {
    return (
      <TabTable title="Claims" empty="No claims" headers={['ID', 'Amount', 'Date', 'Description', 'Status']}
        rows={claims.map(c => (
          <tr key={c.claimId}>
            <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{c.claimId}</td>
            <td style={{ fontWeight: 700, color: '#EF4444' }}>{formatINR(c.claimedAmount)}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{c.claimDate}</td>
            <td style={{ fontSize: 13, color: '#64748B', maxWidth: 200 }}>{c.description}</td>
            <td><SBadge map={CLAIM_STATUS} status={c.status} /></td>
          </tr>
        ))}
      />
    )
  }

  function BeneficiariesTab() {
    return (
      <TabTable title="Beneficiaries" empty="No beneficiaries" headers={['ID', 'Name', 'Relationship', 'Allocation']}
        rows={bens.map(b => (
          <tr key={b.beneficiaryId}>
            <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{b.beneficiaryId}</td>
            <td style={{ fontWeight: 600 }}>{b.name}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{b.relationship}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 10, maxWidth: 80 }}>
                  <div style={{ width: `${b.allocation}%`, height: '100%', background: '#168BFF', borderRadius: 10 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{b.allocation}%</span>
              </div>
            </td>
          </tr>
        ))}
      />
    )
  }

  function RenewalsTab() {
    return (
      <TabTable title="Renewal History" empty="No renewals" headers={['ID', 'Due Date', 'Renewed Date', 'New Premium', 'Status']}
        rows={renewals.map(r => (
          <tr key={r.renewalId}>
            <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{r.renewalId}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{r.dueDate}</td>
            <td style={{ fontSize: 13, color: '#64748B' }}>{r.renewedDate || '—'}</td>
            <td style={{ fontWeight: 600 }}>{formatINR(r.newPremium)}</td>
            <td><SBadge map={RENEWAL_STATUS} status={r.status} /></td>
          </tr>
        ))}
      />
    )
  }

  return (
    <div>
      <PageHeader title={policy.policyNumber} subtitle={policy.policyType}
        breadcrumbExtra="Policy Details"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/policies')}>Back</Button>
            <Button variant="primary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>Edit Policy</Button>
          </>
        }
      />

      {/* Status & summary strip */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={28} style={{ color: '#168BFF' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#172033' }}>{policy.policyNumber}</h2>
              <Badge variant={stCfg.variant} dot>{stCfg.label}</Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
              {policy.policyType} · {policy.customerName} · {policy.startDate} to {policy.expiryDate}
            </p>
          </div>
        </div>
      </Card>

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        <MiniKPI icon={IndianRupee}  color="#168BFF" bg="#EFF6FF" label="Sum Assured"    value={formatINR(policy.sumAssured)} />
        <MiniKPI icon={Banknote}     color="#10B981" bg="#F0FDF4" label="Premium Paid"    value={formatINR(totalPremiumPaid)} />
        <MiniKPI icon={AlertCircle}  color="#F59E0B" bg="#FFFBEB" label="Open Claims"     value={claims.filter(c => ['pending','under_review'].includes(c.status)).length} />
        <MiniKPI icon={Users}        color="#6366F1" bg="#F5F3FF" label="Beneficiaries"   value={bens.length} />
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />
      {activeTab === 'Overview'      && <OverviewTab />}
      {activeTab === 'Premiums'      && <PremiumsTab />}
      {activeTab === 'Payments'      && <PaymentsTab />}
      {activeTab === 'Claims'        && <ClaimsTab />}
      {activeTab === 'Beneficiaries' && <BeneficiariesTab />}
      {activeTab === 'Renewals'      && <RenewalsTab />}

      <PolicyFormModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} editData={policy} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
