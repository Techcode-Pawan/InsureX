import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Shield, AlertCircle, Calendar,
  User, Mail, Phone, MapPin, FileText, CheckCircle2,
  Clock, XCircle, Banknote, GitPullRequest, ExternalLink,
  ChevronRight, ArrowRight, Check, AlertTriangle,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Toast } from '../components/ui/Toast'

import {
  initialClaims, initialProcessing, agents,
  formatINR, CLAIM_STATUS, VERIFICATION_STATUS,
  getCustomerById,
} from '../data/claimData'
import { initialPolicies } from '../data/policyData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ map, status }) {
  const cfg = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}

function InfoRow({ icon: Icon, label, value, isLink, to }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
      <Icon size={15} style={{ color: '#94A3B8', marginTop: 2, flexShrink: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748B', minWidth: 130 }}>{label}</span>
        {isLink ? (
          <Link to={to} style={{ fontSize: 13.5, fontWeight: 600, color: '#168BFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {value} <ExternalLink size={12} />
          </Link>
        ) : (
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033', textAlign: 'right' }}>{value}</span>
        )}
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

const TABS = ['Overview', 'Supporting Documents', 'Processing History', 'Settlement Details']

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
            padding: '10px 18px',
            fontSize: 13.5,
            fontWeight: active === tab ? 700 : 500,
            color: active === tab ? '#168BFF' : '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: `2.5px solid ${active === tab ? '#168BFF' : 'transparent'}`,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export default function ClaimDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [claims] = useState(initialClaims)
  const [activeTab, setActiveTab] = useState('Overview')
  const [toast, setToast] = useState(null)

  const claim = claims.find(c => c.claimId === id)

  // ── Not found ──────────────────────────────────────────
  if (!claim) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={32} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#172033' }}>Claim Not Found</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>
          No claim record with ID <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{id}</code> was found.
        </p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/claims')}>Back to Claims</Button>
      </div>
    )
  }

  const customer = getCustomerById(claim.customerId)
  const policy = initialPolicies.find(p => p.policyId === claim.policyId || p.policyNumber === claim.policyNumber)
  const processing = initialProcessing.find(p => p.claimId === claim.claimId)

  const statusCfg = CLAIM_STATUS[claim.status] || { label: claim.status, variant: 'gray' }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={`Claim: ${claim.claimId}`}
        subtitle={`${claim.customerName} • ${claim.policyType} (${claim.policyNumber})`}
        breadcrumbExtra={claim.claimId}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate('/claims')}>
              Back to Claims
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={GitPullRequest}
              onClick={() => navigate(`/claim-processing?claimId=${claim.claimId}`)}
            >
              Open in Processing Queue
            </Button>
          </div>
        }
      />

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MiniKPI
          icon={Banknote}
          color="#168BFF"
          bg="#EFF6FF"
          label="Claimed Amount"
          value={formatINR(claim.claimedAmount)}
        />
        <MiniKPI
          icon={CheckCircle2}
          color="#10B981"
          bg="#F0FDF4"
          label="Approved Amount"
          value={claim.approvedAmount ? formatINR(claim.approvedAmount) : (claim.status === 'rejected' ? '₹0 (Rejected)' : 'Pending')}
        />
        <MiniKPI
          icon={Shield}
          color="#6366F1"
          bg="#F5F3FF"
          label="Claim Type"
          value={claim.claimType}
        />
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim Status</p>
              <Badge variant={statusCfg.variant} dot style={{ fontSize: 13, padding: '4px 10px' }}>
                {statusCfg.label}
              </Badge>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} style={{ color: '#64748B' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Claim Summary */}
          <Card>
            <CardHeader title="Claim Information" />
            <InfoRow icon={AlertCircle} label="Claim ID" value={claim.claimId} />
            <InfoRow icon={Shield} label="Claim Type" value={claim.claimType} />
            <InfoRow icon={Calendar} label="Date of Filing" value={claim.claimDate} />
            <InfoRow icon={Banknote} label="Claimed Amount" value={formatINR(claim.claimedAmount)} />
            <InfoRow
              icon={CheckCircle2}
              label="Approved Amount"
              value={claim.approvedAmount ? formatINR(claim.approvedAmount) : 'Pending Assessment'}
            />
            <InfoRow
              icon={User}
              label="Assigned Agent"
              value={claim.assignedAgentName || 'Unassigned'}
            />
            {processing && (
              <InfoRow
                icon={GitPullRequest}
                label="Processing File"
                value={processing.processingId}
              />
            )}
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader
              title="Customer Information"
              actions={
                customer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => navigate(`/customers/${customer.customerId}`)}
                  >
                    Profile
                  </Button>
                )
              }
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: avatarColor(claim.customerName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {initials(claim.customerName.split(' ')[0], claim.customerName.split(' ')[1])}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#172033' }}>{claim.customerName}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{claim.customerId}</p>
              </div>
            </div>
            {customer ? (
              <>
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={Phone} label="Phone" value={customer.phone} />
                <InfoRow icon={MapPin} label="Location" value={`${customer.city}, ${customer.state}`} />
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#94A3B8', margin: '8px 0' }}>Customer profile details available in directory.</p>
            )}
          </Card>

          {/* Policy Info */}
          <Card>
            <CardHeader
              title="Associated Insurance Policy"
              actions={
                policy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => navigate(`/policies/${policy.policyId}`)}
                  >
                    Policy File
                  </Button>
                )
              }
            />
            <InfoRow
              icon={Shield}
              label="Policy Number"
              value={claim.policyNumber}
              isLink={!!policy}
              to={policy ? `/policies/${policy.policyId}` : '#'}
            />
            <InfoRow icon={FileText} label="Policy Type" value={claim.policyType} />
            {policy && (
              <>
                <InfoRow icon={Banknote} label="Sum Assured" value={formatINR(policy.sumAssured)} />
                <InfoRow icon={Banknote} label="Premium" value={`${formatINR(policy.premiumAmount)} / ${policy.premiumFrequency}`} />
                <InfoRow icon={Calendar} label="Policy Term" value={`${policy.startDate} → ${policy.expiryDate}`} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>Policy Status:</span>
                  <Badge variant={policy.status === 'active' ? 'green' : 'yellow'}>{policy.status}</Badge>
                </div>
              </>
            )}
          </Card>

          {/* Incident Description */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card>
              <CardHeader title="Incident & Damage Description" />
              <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, lineHeight: 1.6, color: '#334155' }}>
                {claim.incidentDescription}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPORTING DOCUMENTS */}
      {activeTab === 'Supporting Documents' && (
        <Card>
          <CardHeader
            title="Attached Documents & Evidence"
            subtitle={`${claim.documents?.length || 0} files recorded for this claim`}
          />
          {(!claim.documents || claim.documents.length === 0) ? (
            <EmptyState
              title="No documents uploaded"
              description="No supporting document references were provided during submission."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {claim.documents.map((doc, idx) => {
                const isVerified = doc.status === 'verified'
                return (
                  <div
                    key={doc.docId || idx}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 14,
                      background: isVerified ? '#F0FDF4' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: isVerified ? '#DCFCE7' : '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={18} style={{ color: isVerified ? '#16A34A' : '#168BFF' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#172033', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.type}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748B', fontFamily: 'monospace' }}>
                          {doc.docId || `DOC-${idx + 1}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: 11.5, color: '#64748B' }}>Verification Status:</span>
                      <SBadge map={VERIFICATION_STATUS} status={doc.status || 'pending'} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: PROCESSING HISTORY */}
      {activeTab === 'Processing History' && (
        <Card>
          <CardHeader
            title="Claim Timeline & Audit Trail"
            subtitle="Full log of assessor reviews, actions, and status transitions"
          />
          {(!claim.processingHistory || claim.processingHistory.length === 0) ? (
            <EmptyState
              title="No history recorded"
              description="No processing steps have been logged for this claim yet."
            />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24, marginTop: 10 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: '#E2E8F0',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {claim.processingHistory.map((step, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    {/* Circle marker */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -24,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: idx === claim.processingHistory.length - 1 ? '#168BFF' : '#94A3B8',
                        border: '3px solid #FFFFFF',
                        boxShadow: '0 0 0 2px #E2E8F0',
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: '#172033' }}>{step.action}</span>
                        <span style={{ fontSize: 11.5, color: '#94A3B8' }}>•</span>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{step.date}</span>
                        <Badge variant="blue" style={{ fontSize: 11, padding: '2px 6px' }}>{step.by}</Badge>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                        {step.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: SETTLEMENT DETAILS */}
      {activeTab === 'Settlement Details' && (
        <Card>
          <CardHeader title="Settlement & Payment Execution" />
          {claim.status === 'settled' && claim.settlementDetails ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', marginBottom: 12 }}>
                  <CheckCircle2 size={20} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Claim Fully Settled</span>
                </div>
                <InfoRow icon={Banknote} label="Settled Amount" value={formatINR(claim.settlementDetails.settledAmount)} />
                <InfoRow icon={Calendar} label="Settlement Date" value={claim.settlementDetails.settledDate} />
                <InfoRow icon={FileText} label="Payment Method" value={claim.settlementDetails.settledVia} />
                <InfoRow icon={Shield} label="Transaction Ref" value={claim.settlementDetails.txnRef} />
              </div>
              <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#172033' }}>Settlement Notes</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  The settlement amount of {formatINR(claim.settlementDetails.settledAmount)} was disbursed directly to the registered customer bank account. All supporting medical and surveyor vouchers have been archived in accordance with insurance statutory requirements.
                </p>
              </div>
            </div>
          ) : claim.status === 'rejected' ? (
            <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', marginBottom: 10 }}>
                <XCircle size={20} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Claim Rejected</span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13.5, color: '#991B1B', fontWeight: 500 }}>
                Reason for Rejection:
              </p>
              <div style={{ padding: '10px 14px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: 13 }}>
                {claim.rejectionReason || 'Claim does not satisfy policy underwriting criteria.'}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', background: '#F8FAFC', borderRadius: 10, border: '1px dashed #CBD5E1' }}>
              <Clock size={32} style={{ color: '#94A3B8', margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#172033' }}>Settlement Pending</h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
                This claim is currently <strong>{statusCfg.label}</strong>. Settlement will become available once the claim has been reviewed and approved in the processing queue.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={GitPullRequest}
                onClick={() => navigate(`/claim-processing?claimId=${claim.claimId}`)}
              >
                Proceed to Claim Processing
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
