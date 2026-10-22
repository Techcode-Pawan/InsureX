import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Phone, Mail, MapPin, Calendar,
  Shield, IndianRupee, AlertCircle, FileText,
  Users, CheckCircle2, XCircle, Clock, User,
  CreditCard, Banknote, RefreshCcw, UserPlus,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Toast } from '../components/ui/Toast'
import CustomerFormModal from '../components/customers/CustomerFormModal'

import {
  initialCustomers, avatarColor, initials,
  STATUS_MAP, getCustomerPolicies, getCustomerPayments,
  getCustomerClaims, getCustomerDocuments, getCustomerBeneficiaries,
} from '../data/customerData'

// ── Helpers ─────────────────────────────────────────────────────
function formatINR(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

// ── Avatar (large) ───────────────────────────────────────────────
function Avatar({ firstName, lastName, size = 72 }) {
  const bg    = avatarColor(`${firstName} ${lastName}`)
  const label = initials(firstName, lastName)
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.36, flexShrink: 0,
    }}>
      {label}
    </div>
  )
}

// ── Status badge ─────────────────────────────────────────────────
function CustBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, variant: 'gray' }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}

// ── Info row ─────────────────────────────────────────────────────
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

// ── KPI mini card ─────────────────────────────────────────────────
function MiniKPI({ icon: Icon, color, bg, label, value }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#172033', letterSpacing: '-0.5px' }}>{value}</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

// ── Status badge mapping for claim/payment statuses ───────────────
const CLAIM_STATUS = {
  approved:     { label: 'Approved',     variant: 'green' },
  under_review: { label: 'Under Review', variant: 'blue' },
  pending:      { label: 'Pending',      variant: 'yellow' },
  rejected:     { label: 'Rejected',     variant: 'red' },
  settled:      { label: 'Settled',      variant: 'green' },
}
const PAYMENT_STATUS = {
  paid:    { label: 'Paid',    variant: 'green' },
  pending: { label: 'Pending', variant: 'yellow' },
  failed:  { label: 'Failed',  variant: 'red' },
}
const POLICY_STATUS = {
  active:    { label: 'Active',    variant: 'green' },
  expired:   { label: 'Expired',  variant: 'red' },
  cancelled: { label: 'Cancelled',variant: 'gray' },
  pending:   { label: 'Pending',  variant: 'yellow' },
}
const DOC_STATUS = {
  verified: { label: 'Verified', variant: 'green' },
  pending:  { label: 'Pending',  variant: 'yellow' },
  rejected: { label: 'Rejected', variant: 'red' },
}

// ── Activity timeline item ────────────────────────────────────────
function TimelineItem({ icon: Icon, color, bg, title, detail, date }) {
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color }} />
        </div>
        <div style={{ width: 1, flex: 1, background: '#E2E8F0', marginTop: 6 }} />
      </div>
      <div style={{ paddingBottom: 8 }}>
        <p style={{ margin: '4px 0 2px', fontSize: 13.5, fontWeight: 600, color: '#172033' }}>{title}</p>
        <p style={{ margin: '0 0 2px', fontSize: 12.5, color: '#64748B' }}>{detail}</p>
        <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>{date}</p>
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────
const TABS = ['Overview', 'Policies', 'Payments', 'Claims', 'Documents', 'Beneficiaries']

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 20, overflowX: 'auto' }}>
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          role="tab"
          aria-selected={active === tab}
          style={{
            padding: '10px 18px', fontSize: 13.5, fontWeight: active === tab ? 700 : 500,
            color: active === tab ? '#168BFF' : '#64748B',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2.5px solid ${active === tab ? '#168BFF' : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// CUSTOMER DETAILS PAGE
// ════════════════════════════════════════════════════════════
export default function CustomerDetails() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  // Use local mutable state so edits reflect immediately
  const [customers, setCustomers] = useState(initialCustomers)
  const customer = customers.find(c => c.customerId === id)

  const [activeTab,  setActiveTab]  = useState('Overview')
  const [editOpen,   setEditOpen]   = useState(false)
  const [toast,      setToast]      = useState(null)

  // ── Not found ──────────────────────────────────────────────
  if (!customer) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={32} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#172033' }}>Customer Not Found</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>No customer with ID <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{id}</code> was found.</p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    )
  }

  // ── Derived data ───────────────────────────────────────────
  const policies     = getCustomerPolicies(customer.customerId)
  const payments     = getCustomerPayments(customer.customerId)
  const claims       = getCustomerClaims(customer.customerId)
  const documents    = getCustomerDocuments(customer.customerId)
  const beneficiaries = getCustomerBeneficiaries(customer.customerId)

  const activePolicies  = policies.filter(p => p.policyStatus === 'active').length
  const totalPremium    = policies.reduce((s, p) => s + p.premiumAmount, 0)
  const openClaims      = claims.filter(c => ['pending', 'under_review'].includes(c.claimStatus)).length

  function handleEdit(fields) {
    setCustomers(cs => cs.map(c => c.customerId === customer.customerId ? { ...c, ...fields } : c))
    setToast({ message: 'Customer details updated successfully.', type: 'success' })
    setEditOpen(false)
  }

  // ── TAB: Overview ──────────────────────────────────────────
  function OverviewTab() {
    const timelineItems = [
      { icon: UserPlus, color: '#168BFF', bg: '#EFF6FF', title: 'Customer Registered', detail: `${customer.firstName} ${customer.lastName} joined InsureX`, date: customer.registrationDate },
      ...policies.map(p => ({ icon: Shield, color: '#10B981', bg: '#F0FDF4', title: 'Policy Issued', detail: `${p.policyNumber} — ${p.policyType}`, date: p.startDate })),
      ...payments.map(p => ({ icon: Banknote, color: '#6366F1', bg: '#F5F3FF', title: 'Payment Recorded', detail: `${formatINR(p.amount)} via ${p.paymentMode}`, date: p.paymentDate })),
      ...claims.map(c => ({ icon: AlertCircle, color: '#F59E0B', bg: '#FFFBEB', title: 'Claim Filed', detail: c.description, date: c.claimDate })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 16 }} className="details-grid">
        {/* Contact info */}
        <Card>
          <CardHeader title="Contact Information" />
          <InfoRow icon={Mail}     label="Email"     value={customer.email} />
          <InfoRow icon={Phone}    label="Phone"     value={customer.phone} />
          <InfoRow icon={MapPin}   label="Address"   value={`${customer.address}, ${customer.city}, ${customer.state} – ${customer.postalCode}`} />
          <InfoRow icon={Calendar} label="Date of Birth" value={customer.dateOfBirth} />
          <InfoRow icon={User}     label="Gender"    value={customer.gender} />
          <InfoRow icon={FileText} label={customer.idProofType} value={customer.maskedIdProofNumber} />
        </Card>

        {/* Activity timeline */}
        <Card>
          <CardHeader title="Activity Timeline" />
          {timelineItems.length === 0
            ? <EmptyState title="No activity yet" description="No activity recorded for this customer." />
            : timelineItems.map((item, i) => <TimelineItem key={i} {...item} />)
          }
        </Card>
      </div>
    )
  }

  // ── TAB: Policies ──────────────────────────────────────────
  function PoliciesTab() {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">Associated Policies</h3></div>
        {policies.length === 0
          ? <EmptyState title="No policies" description="This customer has no insurance policies yet." />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Policy No.', 'Type', 'Premium', 'Start Date', 'End Date', 'Status'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {policies.map(p => {
                    const st = POLICY_STATUS[p.policyStatus] || { label: p.policyStatus, variant: 'gray' }
                    return (
                      <tr key={p.policyId}>
                        <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{p.policyNumber}</td>
                        <td>{p.policyType}</td>
                        <td style={{ fontWeight: 600 }}>{formatINR(p.premiumAmount)}</td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>{p.startDate}</td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>{p.endDate}</td>
                        <td><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    )
  }

  // ── TAB: Payments ──────────────────────────────────────────
  function PaymentsTab() {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">Payment History</h3></div>
        {payments.length === 0
          ? <EmptyState title="No payments" description="No payment records for this customer yet." />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Payment ID', 'Policy', 'Amount', 'Date', 'Mode', 'Status'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const st = PAYMENT_STATUS[p.paymentStatus] || { label: p.paymentStatus, variant: 'gray' }
                    return (
                      <tr key={p.paymentId}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{p.paymentId}</td>
                        <td style={{ fontSize: 13, color: '#168BFF', fontWeight: 600 }}>{p.policyId}</td>
                        <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}</td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>{p.paymentDate}</td>
                        <td style={{ fontSize: 13 }}>{p.paymentMode}</td>
                        <td><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    )
  }

  // ── TAB: Claims ────────────────────────────────────────────
  function ClaimsTab() {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">Claims</h3></div>
        {claims.length === 0
          ? <EmptyState title="No claims" description="No claims have been filed for this customer." />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Claim ID', 'Policy', 'Claimed Amount', 'Claim Date', 'Description', 'Status'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {claims.map(c => {
                    const st = CLAIM_STATUS[c.claimStatus] || { label: c.claimStatus, variant: 'gray' }
                    return (
                      <tr key={c.claimId}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{c.claimId}</td>
                        <td style={{ color: '#168BFF', fontWeight: 600, fontSize: 13 }}>{c.policyId}</td>
                        <td style={{ fontWeight: 700, color: '#EF4444' }}>{formatINR(c.claimedAmount)}</td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>{c.claimDate}</td>
                        <td style={{ fontSize: 13, color: '#64748B', maxWidth: 200 }}>{c.description}</td>
                        <td><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    )
  }

  // ── TAB: Documents ─────────────────────────────────────────
  function DocumentsTab() {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">Documents & Verification</h3></div>
        {documents.length === 0
          ? <EmptyState title="No documents" description="No documents have been submitted for this customer." />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Document ID', 'Document Type', 'Submission Date', 'Verification Status'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => {
                    const st = DOC_STATUS[d.verificationStatus] || { label: d.verificationStatus, variant: 'gray' }
                    return (
                      <tr key={d.documentId}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{d.documentId}</td>
                        <td style={{ fontWeight: 600 }}>{d.documentType}</td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>{d.submissionDate}</td>
                        <td><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    )
  }

  // ── TAB: Beneficiaries ─────────────────────────────────────
  function BeneficiariesTab() {
    return (
      <Card padding={false}>
        <div style={{ padding: '16px 20px' }}><h3 className="card-title">Beneficiaries</h3></div>
        {beneficiaries.length === 0
          ? <EmptyState title="No beneficiaries" description="No beneficiaries have been registered for this customer's policies." />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Beneficiary ID', 'Name', 'Relationship', 'Policy', 'Allocation'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map(b => (
                    <tr key={b.beneficiaryId}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{b.beneficiaryId}</td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td style={{ fontSize: 13, color: '#64748B' }}>{b.relationshipWithCustomer}</td>
                      <td style={{ fontSize: 13, color: '#168BFF', fontWeight: 600 }}>{b.policyId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 10, maxWidth: 80 }}>
                            <div style={{ width: `${b.allocationPercentage}%`, height: '100%', background: '#168BFF', borderRadius: 10 }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>{b.allocationPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        subtitle={customer.customerId}
        breadcrumbExtra="Customer Details"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/customers')}>
              Back
            </Button>
            <Button variant="primary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit Customer
            </Button>
          </>
        }
      />

      {/* Profile card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar firstName={customer.firstName} lastName={customer.lastName} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#172033' }}>
                {customer.firstName} {customer.lastName}
              </h2>
              <CustBadge status={customer.status} />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#94A3B8', fontFamily: 'monospace' }}>{customer.customerId}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={13} />{customer.email}
              </span>
              <span style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={13} />{customer.phone}
              </span>
              <span style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={13} />{customer.city}, {customer.state}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '4px 10px', background: '#F1F5F9', borderRadius: 20, color: '#64748B' }}>
              {customer.idProofType}: {customer.maskedIdProofNumber}
            </span>
            <span style={{ fontSize: 12, padding: '4px 10px', background: '#F1F5F9', borderRadius: 20, color: '#64748B' }}>
              Joined: {customer.registrationDate}
            </span>
          </div>
        </div>
      </Card>

      {/* Summary KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <MiniKPI icon={Shield}      color="#168BFF" bg="#EFF6FF" label="Total Policies"    value={policies.length} />
        <MiniKPI icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Active Policies"  value={activePolicies} />
        <MiniKPI icon={IndianRupee} color="#8B5CF6" bg="#F5F3FF" label="Total Premium"     value={formatINR(totalPremium)} />
        <MiniKPI icon={AlertCircle} color="#F59E0B" bg="#FFFBEB" label="Open Claims"       value={openClaims} />
      </div>

      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview'      && <OverviewTab />}
      {activeTab === 'Policies'      && <PoliciesTab />}
      {activeTab === 'Payments'      && <PaymentsTab />}
      {activeTab === 'Claims'        && <ClaimsTab />}
      {activeTab === 'Documents'     && <DocumentsTab />}
      {activeTab === 'Beneficiaries' && <BeneficiariesTab />}

      {/* Edit modal */}
      <CustomerFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        editData={customer}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

