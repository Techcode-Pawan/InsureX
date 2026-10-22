import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  GitPullRequest, Clock, CheckCircle2, XCircle, Search as SearchIcon,
  Filter, UserCheck, FileText, Check, Eye,
  X, Banknote, RefreshCw,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'

import {
  initialClaims, initialProcessing, agents,
  formatINR, CLAIM_STATUS,
} from '../data/claimData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ status, map }) {
  const c = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}

function Avatar({ name, size = 28 }) {
  const p = (name || 'Unknown').split(' ')
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials(p[0] || '', p[1] || '')}
    </div>
  )
}

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} style={{ color: '#CBD5E1' }} />
  return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#168BFF' }} /> : <ChevronDown size={12} style={{ color: '#168BFF' }} />
}

function MetricCard({ icon: Icon, color, bg, label, value, note }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 800, color: '#172033' }}>{value}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>{note}</p>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

// ── Claim Processing Action Modal ──────────────────────────────
function ProcessClaimModal({ open, onClose, claim, processing, onUpdate }) {
  // Working state
  const [activeAction, setActiveAction] = useState('notes') // 'notes' | 'agent' | 'docs' | 'approve' | 'reject' | 'settle'
  const [selectedAgent, setSelectedAgent] = useState(claim?.assignedAgentId || '')
  const [verificationNotes, setVerificationNotes] = useState(processing?.verificationNotes || '')
  const [approvedAmount, setApprovedAmount] = useState(claim?.approvedAmount ? String(claim.approvedAmount) : String(claim?.claimedAmount || ''))
  const [approvalNote, setApprovalNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState(claim?.rejectionReason || '')
  const [settlementMode, setSettlementMode] = useState('Bank Transfer')
  const [settlementRef, setSettlementRef] = useState(`TXN-SETT-${Math.floor(1000 + Math.random() * 9000)}`)
  const [documents, setDocuments] = useState(claim?.documents ? JSON.parse(JSON.stringify(claim.documents)) : [])
  const [formError, setFormError] = useState('')

  // Sync state if claim changes
  useEffect(() => {
    if (claim) {
      setSelectedAgent(claim.assignedAgentId || '')
      setVerificationNotes(processing?.verificationNotes || '')
      setApprovedAmount(claim.approvedAmount ? String(claim.approvedAmount) : String(claim.claimedAmount))
      setRejectionReason(claim.rejectionReason || '')
      setDocuments(claim.documents ? JSON.parse(JSON.stringify(claim.documents)) : [])
      setFormError('')
    }
  }, [claim, processing])

  if (!open || !claim) return null

  // Toggle document verification
  function toggleDocStatus(idx) {
    setDocuments(prev => {
      const next = [...prev]
      const current = next[idx].status
      next[idx].status = current === 'verified' ? 'pending' : 'verified'
      return next
    })
  }

  function markAllDocsVerified() {
    setDocuments(prev => prev.map(d => ({ ...d, status: 'verified' })))
  }

  // Action handlers
  function handleSaveNotes() {
    onUpdate({
      type: 'NOTES',
      verificationNotes,
    })
  }

  function handleAssignAgent() {
    if (!selectedAgent) {
      setFormError('Please select an agent to assign.')
      return
    }
    const agent = agents.find(a => a.agentId === selectedAgent)
    onUpdate({
      type: 'ASSIGN_AGENT',
      agentId: agent.agentId,
      agentName: agent.name,
    })
  }

  function handleSaveDocs() {
    onUpdate({
      type: 'DOCS',
      documents,
    })
  }

  function handleApprove() {
    const val = Number(approvedAmount)
    if (!val || val <= 0) {
      setFormError('Please enter a valid approved amount greater than 0.')
      return
    }
    if (val > claim.claimedAmount) {
      setFormError(`Approved amount cannot exceed claimed amount (${formatINR(claim.claimedAmount)}).`)
      return
    }
    onUpdate({
      type: 'APPROVE',
      approvedAmount: val,
      note: approvalNote || 'Claim approved by assessor.',
    })
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setFormError('A detailed reason for rejection is mandatory.')
      return
    }
    onUpdate({
      type: 'REJECT',
      rejectionReason: rejectionReason.trim(),
    })
  }

  function handleSettle() {
    if (!settlementRef.trim()) {
      setFormError('Transaction reference number is required.')
      return
    }
    onUpdate({
      type: 'SETTLE',
      settlementDetails: {
        settledAmount: claim.approvedAmount || claim.claimedAmount,
        settledDate: new Date().toISOString().split('T')[0],
        settledVia: settlementMode,
        txnRef: settlementRef.trim(),
      },
    })
  }

  const allDocsVerified = documents.length > 0 && documents.every(d => d.status === 'verified')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Process Claim: ${claim.claimId}`}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            Current Status: <strong>{claim.status.toUpperCase()}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {/* Overview ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          padding: '12px 16px',
          background: '#F8FAFC',
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          marginBottom: 16,
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Customer</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>{claim.customerName}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Policy No.</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#168BFF', fontFamily: 'monospace' }}>{claim.policyNumber}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Claim Type</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#172033' }}>{claim.claimType}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Claimed Amount</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#168BFF' }}>{formatINR(claim.claimedAmount)}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Status</span>
          <Badge variant={CLAIM_STATUS[claim.status]?.variant || 'gray'} dot style={{ marginTop: 2 }}>
            {CLAIM_STATUS[claim.status]?.label || claim.status}
          </Badge>
        </div>
      </div>

      {formError && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12.5, marginBottom: 14 }}>
          {formError}
        </div>
      )}

      {/* Action Sub-nav */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 10, marginBottom: 16, overflowX: 'auto' }}>
        <button
          className={`btn btn-sm ${activeAction === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('notes'); setFormError('') }}
        >
          <FileText size={14} style={{ marginRight: 4 }} /> Verification Notes
        </button>
        <button
          className={`btn btn-sm ${activeAction === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('agent'); setFormError('') }}
        >
          <UserCheck size={14} style={{ marginRight: 4 }} /> Assign Agent
        </button>
        <button
          className={`btn btn-sm ${activeAction === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('docs'); setFormError('') }}
        >
          <CheckCircle2 size={14} style={{ marginRight: 4 }} /> Verify Documents ({documents.filter(d => d.status === 'verified').length}/{documents.length})
        </button>
        <button
          className={`btn btn-sm ${activeAction === 'approve' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('approve'); setFormError('') }}
          disabled={claim.status === 'settled'}
        >
          <Check size={14} style={{ marginRight: 4 }} /> Approve Claim
        </button>
        <button
          className={`btn btn-sm ${activeAction === 'reject' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('reject'); setFormError('') }}
          disabled={claim.status === 'settled'}
        >
          <XCircle size={14} style={{ marginRight: 4 }} /> Reject Claim
        </button>
        <button
          className={`btn btn-sm ${activeAction === 'settle' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveAction('settle'); setFormError('') }}
          disabled={claim.status !== 'approved' && claim.status !== 'settled'}
        >
          <Banknote size={14} style={{ marginRight: 4 }} /> Settle Payout
        </button>
      </div>

      {/* Action Panels */}
      {/* 1. VERIFICATION NOTES */}
      {activeAction === 'notes' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#172033' }}>
            Assessor / Surveyor Investigation Notes
          </label>
          <textarea
            className="input"
            rows={5}
            style={{ width: '100%', padding: '10px', fontSize: 13, resize: 'vertical' }}
            placeholder="Record notes on loss evaluation, hospital records review, surveyor findings..."
            value={verificationNotes}
            onChange={e => setVerificationNotes(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" size="sm" onClick={handleSaveNotes}>
              Save Verification Notes
            </Button>
          </div>
        </div>
      )}

      {/* 2. ASSIGN AGENT */}
      {activeAction === 'agent' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#172033' }}>
            Assign Assessing Agent / Investigator
          </label>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B' }}>
            Select an active agent from the regional claims assessment team.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
            {agents.map(ag => (
              <div
                key={ag.agentId}
                onClick={() => setSelectedAgent(ag.agentId)}
                style={{
                  border: selectedAgent === ag.agentId ? '2px solid #168BFF' : '1px solid #E2E8F0',
                  background: selectedAgent === ag.agentId ? '#EFF6FF' : '#FFFFFF',
                  borderRadius: 8,
                  padding: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={ag.name} size={30} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#172033' }}>{ag.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{ag.region} • {ag.specialization}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={handleAssignAgent}>
              Update Assigned Agent
            </Button>
          </div>
        </div>
      )}

      {/* 3. VERIFY DOCUMENTS */}
      {activeAction === 'docs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#172033' }}>
                Document Checklist & Verification
              </label>
              {allDocsVerified && <Badge variant="green" size="sm">All Verified</Badge>}
            </div>
            <Button variant="secondary" size="sm" onClick={markAllDocsVerified} disabled={allDocsVerified}>
              Mark All as Verified
            </Button>
          </div>
          {documents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8' }}>No supporting documents uploaded with this claim.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {documents.map((doc, idx) => (
                <div
                  key={doc.docId || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: doc.status === 'verified' ? '#F0FDF4' : '#F8FAFC',
                    border: `1px solid ${doc.status === 'verified' ? '#BBF7D0' : '#E2E8F0'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: doc.status === 'verified' ? '#16A34A' : '#64748B' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#172033' }}>{doc.type}</span>
                    <span style={{ fontSize: 11.5, color: '#94A3B8', fontFamily: 'monospace' }}>({doc.docId || `DOC-${idx + 1}`})</span>
                  </div>
                  <Button
                    variant={doc.status === 'verified' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => toggleDocStatus(idx)}
                  >
                    {doc.status === 'verified' ? 'Revoke / Pending' : 'Verify Document'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={handleSaveDocs}>
              Save Document Verification
            </Button>
          </div>
        </div>
      )}

      {/* 4. APPROVE CLAIM */}
      {activeAction === 'approve' && (
        <div style={{ background: '#F0FDF4', padding: 14, borderRadius: 8, border: '1px solid #BBF7D0' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#166534' }}>
            Authorize Claim Approval
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#15803D' }}>
            Verify that all terms have been validated. You can specify a deductible or sub-limit deduction from the original claimed amount.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#166534' }}>
                Approved Amount (₹) *
              </label>
              <input
                type="number"
                className="input"
                style={{ height: 38, fontSize: 13, background: '#FFFFFF' }}
                value={approvedAmount}
                onChange={e => setApprovedAmount(e.target.value)}
              />
              <span style={{ fontSize: 11, color: '#15803D' }}>
                Original Claimed: {formatINR(claim.claimedAmount)}
              </span>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#166534' }}>
                Approval Notes / Deductibles Reason
              </label>
              <input
                type="text"
                className="input"
                style={{ height: 38, fontSize: 13, background: '#FFFFFF' }}
                placeholder="e.g. Approved less standard ₹5,000 co-pay"
                value={approvalNote}
                onChange={e => setApprovalNote(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="primary" size="sm" onClick={handleApprove} style={{ background: '#16A34A', borderColor: '#16A34A' }}>
              Confirm Approval
            </Button>
          </div>
        </div>
      )}

      {/* 5. REJECT CLAIM */}
      {activeAction === 'reject' && (
        <div style={{ background: '#FEF2F2', padding: 14, borderRadius: 8, border: '1px solid #FECACA' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
            Reject Insurance Claim
          </h4>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#B91C1C' }}>
            A formal and legally compliant rejection reason is mandatory and will be communicated to the policyholder.
          </p>
          <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#991B1B' }}>
            Reason for Rejection *
          </label>
          <textarea
            className="input"
            rows={3}
            style={{ width: '100%', fontSize: 13, background: '#FFFFFF', marginBottom: 12 }}
            placeholder="e.g. Claim filed for pre-existing illness within policy exclusion period..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={handleReject} style={{ background: '#DC2626', borderColor: '#DC2626' }}>
              Confirm Claim Rejection
            </Button>
          </div>
        </div>
      )}

      {/* 6. SETTLE PAYOUT */}
      {activeAction === 'settle' && (
        <div style={{ background: '#EFF6FF', padding: 14, borderRadius: 8, border: '1px solid #BFDBFE' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>
            Disburse Payout & Settle Claim
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#1D4ED8' }}>
            Record payment settlement details to finalize this claim.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#1E40AF' }}>
                Disbursed Amount
              </label>
              <input
                type="text"
                disabled
                className="input"
                style={{ height: 38, fontSize: 13, background: '#F1F5F9' }}
                value={formatINR(claim.approvedAmount || claim.claimedAmount)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#1E40AF' }}>
                Payment Channel
              </label>
              <select
                className="select"
                style={{ height: 38, fontSize: 13, background: '#FFFFFF' }}
                value={settlementMode}
                onChange={e => setSettlementMode(e.target.value)}
              >
                <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Direct Debit">Direct Debit</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4, color: '#1E40AF' }}>
                Transaction Ref / UTR *
              </label>
              <input
                type="text"
                className="input"
                style={{ height: 38, fontSize: 13, background: '#FFFFFF' }}
                value={settlementRef}
                onChange={e => setSettlementRef(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={handleSettle}>
              Execute Settlement & Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════════
const QUEUE_TABS = [
  { key: 'all',                label: 'All Queue' },
  { key: 'awaiting_review',    label: 'Awaiting Review' },
  { key: 'under_verification', label: 'Under Verification' },
  { key: 'approved',           label: 'Approved' },
  { key: 'settled',            label: 'Settled' },
  { key: 'rejected',           label: 'Rejected' },
]

const ROWS_OPTIONS = [8, 15, 25]

export default function ClaimProcessing() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [claims, setClaims] = useState(initialClaims)
  const [processingList, setProcessingList] = useState(initialProcessing)

  // Filters
  const [activeQueueTab, setActiveQueueTab] = useState('all')
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [sortKey, setSortKey] = useState('claimDate')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)

  // Active modal
  const [selectedClaimId, setSelectedClaimId] = useState(null)
  const [toast, setToast] = useState(null)

  // On mount or searchParam change, check for ?claimId=...
  useEffect(() => {
    const cid = searchParams.get('claimId')
    if (cid && claims.some(c => c.claimId === cid)) {
      setSelectedClaimId(cid)
    }
  }, [searchParams, claims])

  // Aggregate Metrics
  const totalInQueue = claims.length
  const awaitingReview = claims.filter(c => c.status === 'pending').length
  const underVerification = claims.filter(c => c.status === 'under_review').length
  const approvedCount = claims.filter(c => c.status === 'approved').length
  const settledCount = claims.filter(c => c.status === 'settled').length

  // Filtered Claims
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return claims.filter(c => {
      // Tab filter
      if (activeQueueTab === 'awaiting_review' && c.status !== 'pending') return false
      if (activeQueueTab === 'under_verification' && c.status !== 'under_review') return false
      if (activeQueueTab === 'approved' && c.status !== 'approved') return false
      if (activeQueueTab === 'settled' && c.status !== 'settled') return false
      if (activeQueueTab === 'rejected' && c.status !== 'rejected') return false

      // Agent filter
      if (agentFilter && c.assignedAgentId !== agentFilter) return false

      // Search
      if (q) {
        const match =
          c.claimId.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.policyNumber.toLowerCase().includes(q) ||
          c.claimType.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [claims, activeQueueTab, agentFilter, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || agentFilter || activeQueueTab !== 'all'

  function sort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setAgentFilter('')
    setActiveQueueTab('all')
    setPage(1)
  }

  // Handle Updates from Process Modal
  function handleProcessingUpdate(action) {
    const today = new Date().toISOString().split('T')[0]

    setClaims(prev => prev.map(c => {
      if (c.claimId !== selectedClaimId) return c

      const updated = { ...c }
      const newHistory = [...(updated.processingHistory || [])]

      if (action.type === 'NOTES') {
        newHistory.push({
          date: today,
          action: 'Verification Notes Updated',
          note: action.verificationNotes || 'Assessor updated notes.',
          by: 'Assessor',
        })
        setToast({ message: 'Verification notes saved successfully.', type: 'success' })
      } else if (action.type === 'ASSIGN_AGENT') {
        updated.assignedAgentId = action.agentId
        updated.assignedAgentName = action.agentName
        if (updated.status === 'pending') updated.status = 'under_review'
        newHistory.push({
          date: today,
          action: 'Agent Assigned',
          note: `${action.agentName} assigned to evaluate claim.`,
          by: 'Admin',
        })
        setToast({ message: `Assigned to ${action.agentName}.`, type: 'success' })
      } else if (action.type === 'DOCS') {
        updated.documents = action.documents
        const allOk = action.documents.every(d => d.status === 'verified')
        newHistory.push({
          date: today,
          action: allOk ? 'All Documents Verified' : 'Document Status Updated',
          note: allOk ? 'All evidentiary documents authenticated.' : 'Document verification updated.',
          by: 'Assessor',
        })
        setToast({ message: 'Document verification updated.', type: 'success' })
      } else if (action.type === 'APPROVE') {
        updated.status = 'approved'
        updated.approvedAmount = action.approvedAmount
        newHistory.push({
          date: today,
          action: 'Claim Approved',
          note: `Approved ${formatINR(action.approvedAmount)}. ${action.note}`,
          by: 'Assessor',
        })
        setToast({ message: `Claim ${updated.claimId} approved for ${formatINR(action.approvedAmount)}!`, type: 'success' })
      } else if (action.type === 'REJECT') {
        updated.status = 'rejected'
        updated.rejectionReason = action.rejectionReason
        updated.approvedAmount = 0
        newHistory.push({
          date: today,
          action: 'Claim Rejected',
          note: `Rejected: ${action.rejectionReason}`,
          by: 'Assessor',
        })
        setToast({ message: `Claim ${updated.claimId} marked as rejected.`, type: 'error' })
      } else if (action.type === 'SETTLE') {
        updated.status = 'settled'
        updated.settlementDetails = action.settlementDetails
        newHistory.push({
          date: today,
          action: 'Claim Settled',
          note: `Disbursed ${formatINR(action.settlementDetails.settledAmount)} via ${action.settlementDetails.settledVia}. Ref: ${action.settlementDetails.txnRef}`,
          by: 'Accounts',
        })
        setToast({ message: `Claim ${updated.claimId} successfully settled!`, type: 'success' })
      }

      updated.processingHistory = newHistory
      return updated
    }))

    // Also update processingList
    setProcessingList(prev => prev.map(p => {
      if (p.claimId !== selectedClaimId) return p
      const up = { ...p }
      if (action.type === 'NOTES') up.verificationNotes = action.verificationNotes
      if (action.type === 'ASSIGN_AGENT') {
        up.assignedAgentId = action.agentId
        up.assignedAgentName = action.agentName
      }
      if (action.type === 'APPROVE') {
        up.processingStatus = 'approved'
        up.approvedAmount = action.approvedAmount
      }
      if (action.type === 'REJECT') {
        up.processingStatus = 'rejected'
      }
      if (action.type === 'SETTLE') {
        up.processingStatus = 'settled'
      }
      return up
    }))
  }

  const selectedClaim = claims.find(c => c.claimId === selectedClaimId)
  const selectedProc = processingList.find(p => p.claimId === selectedClaimId)

  return (
    <div>
      <PageHeader
        title="Claim Processing Queue"
        subtitle="Review, verify, approve, reject, and disburse settlements for submitted insurance claims."
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setToast({ message: 'Queue refreshed.', type: 'success' })}>
            Refresh Queue
          </Button>
        }
      />

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MetricCard icon={GitPullRequest} color="#168BFF" bg="#EFF6FF" label="Total In Queue" value={totalInQueue} note="All submitted claims" />
        <MetricCard icon={Clock} color="#F59E0B" bg="#FFFBEB" label="Awaiting Review" value={awaitingReview} note="Needs agent assignment" />
        <MetricCard icon={SearchIcon} color="#6366F1" bg="#F5F3FF" label="Under Verification" value={underVerification} note="Assessor investigating" />
        <MetricCard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Approved" value={approvedCount} note="Ready for settlement" />
        <MetricCard icon={Banknote} color="#168BFF" bg="#EFF6FF" label="Settled" value={settledCount} note="Disbursement complete" />
      </div>

      {/* Queue Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 16, overflowX: 'auto' }}>
        {QUEUE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveQueueTab(tab.key); setPage(1) }}
            role="tab"
            aria-selected={activeQueueTab === tab.key}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: activeQueueTab === tab.key ? 700 : 500,
              color: activeQueueTab === tab.key ? '#168BFF' : '#64748B',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: `2.5px solid ${activeQueueTab === tab.key ? '#168BFF' : 'transparent'}`,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search claim ID, customer, policy number..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="select"
            style={{ height: 36, fontSize: 13, minWidth: 180 }}
            value={agentFilter}
            onChange={e => { setAgentFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Assessing Agents</option>
            {agents.map(a => (
              <option key={a.agentId} value={a.agentId}>{a.name} ({a.region})</option>
            ))}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Work Queue Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="Queue Empty"
            description={hasFilters ? 'No claims match your filter criteria.' : 'No claims waiting in this processing queue.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => sort('claimId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Claim ID <SortIcon col="claimId" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th onClick={() => sort('customerName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Customer <SortIcon col="customerName" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Policy</th>
                    <th>Claim Type</th>
                    <th onClick={() => sort('claimedAmount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Claimed (₹) <SortIcon col="claimedAmount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Assigned Agent</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(c => (
                    <tr key={c.claimId}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#168BFF' }}>
                          <span
                            onClick={() => navigate(`/claims/${c.claimId}`)}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {c.claimId}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={c.customerName} />
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.customerName}</p>
                              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{c.customerId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>
                          {c.policyNumber}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {c.claimType}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 13 }}>
                          {formatINR(c.claimedAmount)}
                        </td>
                        <td>
                          {c.assignedAgentName ? (
                            <span style={{ fontSize: 12.5, color: '#172033', fontWeight: 500 }}>
                              {c.assignedAgentName}
                            </span>
                          ) : (
                            <Badge variant="yellow" style={{ fontSize: 11 }}>Unassigned</Badge>
                          )}
                        </td>
                        <td>
                          <SBadge status={c.status} map={CLAIM_STATUS} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={GitPullRequest}
                              onClick={() => setSelectedClaimId(c.claimId)}
                            >
                              Process
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => navigate(`/claims/${c.claimId}`)}
                              aria-label="View Details"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #EDF2F7', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748B' }}>
                Rows:
                <select
                  className="select"
                  style={{ height: 28, fontSize: 12, minWidth: 52 }}
                  value={rowsPerPage}
                  onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}
                >
                  {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>Showing {(safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Previous"
                />
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, safePage - 3), safePage + 2).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`btn btn-ghost btn-sm${n === safePage ? ' active' : ''}`}
                    style={{
                      minWidth: 30,
                      fontWeight: n === safePage ? 700 : 400,
                      color: n === safePage ? '#168BFF' : '#64748B',
                      background: n === safePage ? '#EFF6FF' : undefined,
                      borderRadius: 6,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ChevronRight}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Next"
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Interactive Process Modal */}
      <ProcessClaimModal
        open={!!selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
        claim={selectedClaim}
        processing={selectedProc}
        onUpdate={handleProcessingUpdate}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
