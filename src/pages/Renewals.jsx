import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCcw, Clock, CheckCircle2, AlertTriangle, AlertCircle,
  Plus, Search as SearchIcon, SlidersHorizontal, X, Eye, Check,
  Banknote, Calendar, Shield, ExternalLink,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'

import {
  initialRenewals, RENEWAL_STATUS, generateRenewalId, formatINR,
} from '../data/renewalData'
import { initialPolicies } from '../data/policyData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ status }) {
  const c = RENEWAL_STATUS[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

// ── Create Renewal Modal with Date & Policy Validation ─────────
function CreateRenewalModal({ open, onClose, onSubmit }) {
  const [selectedPolicyId, setSelectedPolicyId] = useState(initialPolicies[0]?.policyId || '')
  const [newStartDate, setNewStartDate] = useState('2025-01-11')
  const [newExpiryDate, setNewExpiryDate] = useState('2026-01-10')
  const [renewalPremium, setRenewalPremium] = useState('18500')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const policy = initialPolicies.find(p => p.policyId === selectedPolicyId)

  // Auto-populate when policy changes
  function handlePolicyChange(polId) {
    setSelectedPolicyId(polId)
    const p = initialPolicies.find(item => item.policyId === polId)
    if (p) {
      const expDate = new Date(p.expiryDate)
      const startDate = new Date(expDate)
      startDate.setDate(startDate.getDate() + 1)
      const nextExp = new Date(startDate)
      nextExp.setFullYear(nextExp.getFullYear() + 1)

      setNewStartDate(startDate.toISOString().split('T')[0])
      setNewExpiryDate(nextExp.toISOString().split('T')[0])
      setRenewalPremium(String(p.premiumAmount || 15000))
    }
  }

  function handleSubmit() {
    const e = {}
    if (!selectedPolicyId) e.policyId = 'Please select a valid policy.'
    if (!newStartDate) e.newStartDate = 'New start date is required.'
    if (!newExpiryDate) e.newExpiryDate = 'New expiry date is required.'

    if (newStartDate && newExpiryDate && new Date(newExpiryDate) <= new Date(newStartDate)) {
      e.newExpiryDate = 'New expiry date must be strictly after the start date.'
    }

    const premNum = Number(renewalPremium)
    if (isNaN(premNum) || premNum <= 0) {
      e.renewalPremium = 'Please enter a valid renewal premium amount (> 0).'
    }

    if (Object.keys(e).length) { setErrors(e); return }

    onSubmit({
      renewalId: generateRenewalId(),
      policyId: policy.policyId,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      customerName: policy.customerName,
      policyType: policy.policyType,
      previousExpiryDate: policy.expiryDate,
      newStartDate,
      newExpiryDate,
      renewalPremium: premNum,
      renewalDate: null,
      status: 'upcoming',
      paymentMethod: null,
      paymentRef: null,
      notes: notes.trim() || 'Scheduled policy renewal notice generated.',
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Policy Renewal Schedule" size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>Create Renewal</Button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Select Existing Policy *</label>
          <select className={`select${errors.policyId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={selectedPolicyId} onChange={e => handlePolicyChange(e.target.value)}>
            {initialPolicies.map(p => (
              <option key={p.policyId} value={p.policyId}>
                {p.policyNumber} — {p.customerName} ({p.policyType}) [Expires: {p.expiryDate}]
              </option>
            ))}
          </select>
          {errors.policyId && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.policyId}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Previous Expiry Date</label>
          <input className="input" disabled style={{ height: 38, fontSize: 13, background: '#F1F5F9' }}
            value={policy?.expiryDate || ''} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Renewal Premium (₹) *</label>
          <input type="number" className={`input${errors.renewalPremium ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={renewalPremium} onChange={e => setRenewalPremium(e.target.value)} />
          {errors.renewalPremium && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.renewalPremium}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>New Start Date *</label>
          <input type="date" className={`input${errors.newStartDate ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
          {errors.newStartDate && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.newStartDate}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>New Expiry Date *</label>
          <input type="date" className={`input${errors.newExpiryDate ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} />
          {errors.newExpiryDate && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.newExpiryDate}</span>}
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Renewal Notes / Instructions</label>
          <textarea className="input" rows={3} style={{ width: '100%', fontSize: 13, padding: 8 }}
            placeholder="e.g. Include 10% No Claim Bonus discount on renewal premium..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ── Process Renewal Modal (Execute Payment) ───────────────────
function ProcessRenewalModal({ open, onClose, renewal, onConfirm }) {
  if (!renewal) return null
  const [payMethod, setPayMethod] = useState('UPI')
  const [txnRef, setTxnRef] = useState(`TXN-REN-${Math.floor(10000 + Math.random() * 90000)}`)

  function handleProcess() {
    onConfirm(renewal.renewalId, {
      paymentMethod: payMethod,
      paymentRef: txnRef,
      renewalDate: new Date().toISOString().split('T')[0],
      status: 'renewed',
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Process Renewal: ${renewal.policyNumber}`} size="md"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleProcess}>Confirm & Renew</Button>
      </>}>
      <div style={{ padding: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 600 }}>
          Renewing {renewal.policyType} for {renewal.customerName}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800, color: '#15803D' }}>
          Premium Due: {formatINR(renewal.renewalPremium)}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Payment Method</label>
          <select className="select" style={{ height: 38, fontSize: 13 }} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
            <option value="UPI">UPI (Google Pay / PhonePe)</option>
            <option value="Bank Transfer">Net Banking / NEFT</option>
            <option value="Credit Card">Credit / Debit Card</option>
            <option value="Cheque">Cheque Deposit</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Transaction Reference / UTR *</label>
          <input className="input" style={{ height: 38, fontSize: 13 }} value={txnRef} onChange={e => setTxnRef(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]

export default function Renewals() {
  const navigate = useNavigate()
  const [renewals, setRenewals]       = useState(initialRenewals)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [sortKey, setSortKey]         = useState('previousExpiryDate')
  const [sortDir, setSortDir]         = useState('asc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [createOpen, setCreateOpen]   = useState(false)
  const [processRenewal, setProcessRenewal] = useState(null)
  const [toast, setToast]             = useState(null)

  // KPIs
  const totalRenewals   = renewals.length
  const upcoming        = renewals.filter(r => r.status === 'upcoming').length
  const renewedCount    = renewals.filter(r => r.status === 'renewed').length
  const overdueCount    = renewals.filter(r => r.status === 'overdue' || r.status === 'lapsed').length

  // Filter & Sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return renewals.filter(r => {
      const ms = !q || r.renewalId.toLowerCase().includes(q) || r.policyNumber.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q) || r.policyType.toLowerCase().includes(q)
      return ms && (!statusFilter || r.status === statusFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [renewals, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter

  function sort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  function clearFilters() { setSearch(''); setStatusF(''); setPage(1) }

  function handleCreateRenewal(newRecord) {
    setRenewals(prev => [newRecord, ...prev])
    setToast({ message: `Renewal schedule ${newRecord.renewalId} created.`, type: 'success' })
  }

  function handleConfirmProcess(renewalId, updateFields) {
    setRenewals(prev => prev.map(r => r.renewalId === renewalId ? { ...r, ...updateFields } : r))
    setToast({ message: `Policy renewal processed successfully!`, type: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Policy Renewals"
        subtitle="Track policy expiration dates, automated renewal notices, premium recalculations, and term extensions."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
            Schedule Renewal
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon={RefreshCcw} color="#168BFF" bg="#EFF6FF" label="Total Renewals" value={totalRenewals} note="Active schedules" />
        <KPICard icon={Clock} color="#F59E0B" bg="#FFFBEB" label="Upcoming" value={upcoming} note="Due within 90 days" />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Renewed" value={renewedCount} note="Successfully extended" />
        <KPICard icon={AlertCircle} color="#EF4444" bg="#FEF2F2" label="Overdue / Lapsed" value={overdueCount} note="Requires intervention" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search policy, customer, renewal ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="select"
            style={{ height: 36, fontSize: 12.5, minWidth: 150 }}
            value={statusFilter}
            onChange={e => { setStatusF(e.target.value); setPage(1) }}
          >
            <option value="">All Statuses</option>
            {Object.entries(RENEWAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No renewal records found"
            description={hasFilters ? 'No renewals match your current search/filters.' : 'No policy renewals scheduled.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Renewal ID</th>
                    <th>Policy Number</th>
                    <th>Customer</th>
                    <th onClick={() => sort('previousExpiryDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Previous Expiry <SortIcon col="previousExpiryDate" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>New Term Window</th>
                    <th onClick={() => sort('renewalPremium')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Renewal Premium <SortIcon col="renewalPremium" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.renewalId}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#168BFF' }}>
                        {r.renewalId}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#172033' }}>
                          {r.policyNumber}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748B' }}>{r.policyType}</span>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{r.customerName}</p>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{r.customerId}</span>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#475569' }}>
                        {r.previousExpiryDate}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#172033' }}>
                        {r.newStartDate} → {r.newExpiryDate}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>
                        {formatINR(r.renewalPremium)}
                      </td>
                      <td>
                        <SBadge status={r.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {r.status !== 'renewed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Check}
                              onClick={() => setProcessRenewal(r)}
                            >
                              Renew
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={ExternalLink}
                            onClick={() => navigate(`/policies/${r.policyId}`)}
                            aria-label="View Policy"
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

      {/* Create Renewal Modal */}
      {createOpen && (
        <CreateRenewalModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateRenewal}
        />
      )}

      {/* Process Renewal Modal */}
      {processRenewal && (
        <ProcessRenewalModal
          open={!!processRenewal}
          onClose={() => setProcessRenewal(null)}
          renewal={processRenewal}
          onConfirm={handleConfirmProcess}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
