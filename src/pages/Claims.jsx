import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, Clock, Search as SearchIcon, CheckCircle2, XCircle, Banknote,
  SlidersHorizontal, X, Plus, Eye,
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
  initialClaims, CLAIM_STATUS, CLAIM_TYPES,
  formatINR, generateClaimId, getCustomerPolicies, agents,
} from '../data/claimData'
import { initialCustomers, avatarColor, initials } from '../data/customerData'

// ── Shared sub-components ────────────────────────────────────────
function SBadge({ status, map }) {
  const c = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}
function Avatar({ name, size = 30 }) {
  const p = name.split(' ')
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials(p[0] || '', p[1] || '')}
    </div>
  )
}
function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} style={{ color: '#CBD5E1' }} />
  return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#168BFF' }} /> : <ChevronDown size={12} style={{ color: '#168BFF' }} />
}
function KPICard({ icon: Icon, color, bg, label, value, note }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#172033' }}>{value}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>{note}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={22} style={{ color }} /></div>
      </div>
    </Card>
  )
}

// ── Submit Claim Modal ───────────────────────────────────────────
function SubmitClaimModal({ open, onClose, onSubmit }) {
  const [fields, setFields] = useState({
    customerId: '', policyId: '', claimType: '', claimDate: new Date().toISOString().split('T')[0],
    incidentDescription: '', claimedAmount: '', documentRefs: '',
  })
  const [errors, setErrors] = useState({})

  const customerPolicies = useMemo(() => {
    if (!fields.customerId) return []
    return getCustomerPolicies(fields.customerId)
  }, [fields.customerId])

  const selectedCustomer = initialCustomers.find(c => c.customerId === fields.customerId)
  const selectedPolicy = customerPolicies.find(p => p.policyId === fields.policyId)

  function set(k, v) {
    setFields(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleCustomerChange(customerId) {
    set('customerId', customerId)
    setFields(f => ({ ...f, customerId, policyId: '' }))
  }

  function handleSubmit() {
    const e = {}
    if (!fields.customerId) e.customerId = 'Select a customer.'
    if (!fields.policyId) e.policyId = 'Select an eligible policy.'
    if (!fields.claimType) e.claimType = 'Select a claim type.'
    if (!fields.claimDate) e.claimDate = 'Date is required.'
    if (!fields.incidentDescription.trim()) e.incidentDescription = 'Describe the incident.'
    if (!fields.claimedAmount || Number(fields.claimedAmount) <= 0) e.claimedAmount = 'Enter a valid amount.'
    if (selectedPolicy && Number(fields.claimedAmount) > selectedPolicy.sumAssured) {
      e.claimedAmount = `Amount exceeds sum assured (${formatINR(selectedPolicy.sumAssured)}).`
    }
    if (Object.keys(e).length) { setErrors(e); return }

    const customer = selectedCustomer
    const policy = selectedPolicy
    const claimId = generateClaimId()
    const docRefs = fields.documentRefs.trim()
      ? fields.documentRefs.split(',').map((d, i) => ({
          docId: `CDOC-NEW-${i + 1}`, type: d.trim(), status: 'pending',
        }))
      : []

    onSubmit({
      claimId,
      customerId: customer.customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      policyId: policy.policyId,
      policyNumber: policy.policyNumber,
      policyType: policy.policyType,
      claimType: fields.claimType,
      claimDate: fields.claimDate,
      claimedAmount: Number(fields.claimedAmount),
      approvedAmount: null,
      incidentDescription: fields.incidentDescription.trim(),
      assignedAgentId: null,
      assignedAgentName: null,
      status: 'pending',
      rejectionReason: null,
      settlementDetails: null,
      documents: docRefs,
      processingHistory: [
        { date: fields.claimDate, action: 'Claim Filed', note: 'Claim submitted by customer via admin portal.', by: 'System' },
      ],
    })

    // Reset form
    setFields({
      customerId: '', policyId: '', claimType: '', claimDate: new Date().toISOString().split('T')[0],
      incidentDescription: '', claimedAmount: '', documentRefs: '',
    })
    setErrors({})
    onClose()
  }

  function handleClose() {
    setFields({
      customerId: '', policyId: '', claimType: '', claimDate: new Date().toISOString().split('T')[0],
      incidentDescription: '', claimedAmount: '', documentRefs: '',
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Submit New Claim" size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>Submit Claim</Button>
      </>}>

      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#94A3B8', padding: '7px 11px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        ℹ️ Demo only — this creates a mock claim record. No backend is connected.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Customer */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Customer *</label>
          <select className={`select${errors.customerId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.customerId} onChange={e => handleCustomerChange(e.target.value)}>
            <option value="">Select customer</option>
            {initialCustomers.filter(c => c.status === 'active').map(c => (
              <option key={c.customerId} value={c.customerId}>{c.firstName} {c.lastName} ({c.customerId})</option>
            ))}
          </select>
          {errors.customerId && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.customerId}</span>}
        </div>

        {/* Policy */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Eligible Policy *</label>
          <select className={`select${errors.policyId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.policyId} onChange={e => set('policyId', e.target.value)}
            disabled={!fields.customerId}>
            <option value="">{fields.customerId ? (customerPolicies.length ? 'Select a policy' : 'No active policies') : 'Select a customer first'}</option>
            {customerPolicies.map(p => (
              <option key={p.policyId} value={p.policyId}>{p.policyNumber} — {p.policyType} (Sum: {formatINR(p.sumAssured)})</option>
            ))}
          </select>
          {errors.policyId && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.policyId}</span>}
        </div>

        {/* Claim Type */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Claim Type *</label>
          <select className={`select${errors.claimType ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.claimType} onChange={e => set('claimType', e.target.value)}>
            <option value="">Select type</option>
            {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.claimType && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.claimType}</span>}
        </div>

        {/* Claim Date */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Claim Date *</label>
          <input type="date" className={`input${errors.claimDate ? ' error' : ''}`} style={{ height: 38, fontSize: 13, padding: '0 10px' }}
            value={fields.claimDate} onChange={e => set('claimDate', e.target.value)} />
          {errors.claimDate && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.claimDate}</span>}
        </div>

        {/* Claimed Amount */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Claimed Amount (₹) *</label>
          <input type="number" className={`input${errors.claimedAmount ? ' error' : ''}`} style={{ height: 38, fontSize: 13, padding: '0 10px' }}
            placeholder="e.g. 150000" value={fields.claimedAmount} onChange={e => set('claimedAmount', e.target.value)} />
          {errors.claimedAmount && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.claimedAmount}</span>}
        </div>

        {/* Document Refs */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Supporting Documents</label>
          <input className="input" style={{ height: 38, fontSize: 13, padding: '0 10px' }}
            placeholder="e.g. Hospital Bill, FIR Copy" value={fields.documentRefs} onChange={e => set('documentRefs', e.target.value)} />
          <span style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2, display: 'block' }}>Comma-separated document names</span>
        </div>

        {/* Incident Description */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Incident Description *</label>
          <textarea className={`input${errors.incidentDescription ? ' error' : ''}`}
            style={{ minHeight: 80, fontSize: 13, padding: '10px', resize: 'vertical' }}
            placeholder="Describe the incident in detail..."
            value={fields.incidentDescription} onChange={e => set('incidentDescription', e.target.value)} />
          {errors.incidentDescription && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.incidentDescription}</span>}
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]
const COLS = [
  { key: 'claimId',          label: 'Claim ID',       sortable: true },
  { key: 'customerName',     label: 'Customer',       sortable: true },
  { key: 'policyNumber',     label: 'Policy',         sortable: true },
  { key: 'claimType',        label: 'Type',           sortable: true },
  { key: 'claimDate',        label: 'Date',           sortable: true },
  { key: 'claimedAmount',    label: 'Amount',         sortable: true },
  { key: 'assignedAgentName',label: 'Agent',          sortable: true },
  { key: 'status',           label: 'Status',         sortable: true },
  { key: 'actions',          label: '',               sortable: false },
]

export default function Claims() {
  const navigate = useNavigate()
  const [claims, setClaims]           = useState(initialClaims)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [typeFilter, setTypeF]        = useState('')
  const [sortKey, setSortKey]         = useState('claimDate')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [submitOpen, setSubmitOpen]   = useState(false)
  const [toast, setToast]             = useState(null)

  // KPI counts
  const total       = claims.length
  const pending     = claims.filter(c => c.status === 'pending').length
  const underReview = claims.filter(c => c.status === 'under_review').length
  const approved    = claims.filter(c => c.status === 'approved').length
  const settled     = claims.filter(c => c.status === 'settled').length

  // Filtering + sorting
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return claims.filter(c => {
      const ms = !q || c.claimId.toLowerCase().includes(q) || c.customerName.toLowerCase().includes(q) || c.policyNumber.toLowerCase().includes(q) || c.claimType.toLowerCase().includes(q)
      return ms && (!statusFilter || c.status === statusFilter) && (!typeFilter || c.claimType === typeFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [claims, search, statusFilter, typeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter || typeFilter

  function sort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }
  function clearFilters() { setSearch(''); setStatusF(''); setTypeF(''); setPage(1) }

  function handleNewClaim(claim) {
    setClaims(prev => [claim, ...prev])
    setToast({ message: `Claim ${claim.claimId} submitted successfully.`, type: 'success' })
  }

  // ── Unique claim types for filter ────
  const claimTypeOptions = useMemo(() => [...new Set(claims.map(c => c.claimType))].sort(), [claims])

  return (
    <div>
      <PageHeader title="Claims Management" subtitle="File, track, and manage insurance claims from submission through settlement."
        actions={<Button variant="primary" size="sm" icon={Plus} onClick={() => setSubmitOpen(true)}>Submit Claim</Button>} />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={AlertCircle}  color="#168BFF" bg="#EFF6FF" label="Total Claims"  value={total}       note="All records" />
        <KPICard icon={Clock}        color="#F59E0B" bg="#FFFBEB" label="Pending"        value={pending}     note="Awaiting review" />
        <KPICard icon={SearchIcon}   color="#6366F1" bg="#F5F3FF" label="Under Review"   value={underReview} note="Being investigated" />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Approved"       value={approved}    note="Awaiting settlement" />
        <KPICard icon={Banknote}     color="#168BFF" bg="#EFF6FF" label="Settled"         value={settled}     note="Paid out" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }} placeholder="Search ID, customer, policy, type…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => {}} aria-label="Filters">Filters</Button>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <select className="select" style={{ height: 32, fontSize: 12.5, minWidth: 140 }}
            value={statusFilter} onChange={e => { setStatusF(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            {Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select" style={{ height: 32, fontSize: 12.5, minWidth: 160 }}
            value={typeFilter} onChange={e => { setTypeF(e.target.value); setPage(1) }}>
            <option value="">All Claim Types</option>
            {claimTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No claims found" description={hasFilters ? 'No claims match your current filters.' : 'No claims have been filed yet.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {COLS.map(col => (
                      <th key={col.key} onClick={col.sortable ? () => sort(col.key) : undefined}
                        style={col.sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {col.label} {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(c => (
                    <tr key={c.claimId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/claims/${c.claimId}`)}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#168BFF' }}>{c.claimId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={c.customerName} />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.customerName}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{c.policyNumber}</td>
                      <td style={{ fontSize: 13 }}>{c.claimType}</td>
                      <td style={{ fontSize: 13, color: '#64748B' }}>{c.claimDate}</td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{formatINR(c.claimedAmount)}</td>
                      <td style={{ fontSize: 13, color: c.assignedAgentName ? '#172033' : '#94A3B8' }}>{c.assignedAgentName || 'Unassigned'}</td>
                      <td><SBadge status={c.status} map={CLAIM_STATUS} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/claims/${c.claimId}`)} aria-label="View claim" />
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
                <select className="select" style={{ height: 28, fontSize: 12, minWidth: 52 }}
                  value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}>
                  {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>Showing {(safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, filtered.length)} of {filtered.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} aria-label="Previous" />
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, safePage - 3), safePage + 2).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`btn btn-ghost btn-sm${n === safePage ? ' active' : ''}`}
                    style={{ minWidth: 30, fontWeight: n === safePage ? 700 : 400, color: n === safePage ? '#168BFF' : '#64748B', background: n === safePage ? '#EFF6FF' : undefined, borderRadius: 6 }}>
                    {n}
                  </button>
                ))}
                <Button variant="ghost" size="sm" icon={ChevronRight} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} aria-label="Next" />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Submit Claim Modal */}
      <SubmitClaimModal open={submitOpen} onClose={() => setSubmitOpen(false)} onSubmit={handleNewClaim} />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
