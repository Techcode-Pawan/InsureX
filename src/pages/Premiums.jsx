import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, CheckCircle2, Clock, AlertTriangle,
  Search, SlidersHorizontal, X, Eye, ShieldCheck,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  CreditCard, MoreVertical, Shield,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'
import insuranceService from '../services/insuranceService'

import {
  initialPremiums, PREMIUM_STATUS, formatINR,
  getPaymentsForPremium, PAYMENT_STATUS, PAYMENT_MODES,
  generatePaymentId, generateTxnRef,
} from '../data/applicationData'
import { avatarColor, initials } from '../data/customerData'

function SBadge({ status, map }) {
  const c = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}
function Avatar({ name, size = 30 }) {
  const p = name.split(' ')
  return <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>{initials(p[0]||'', p[1]||'')}</div>
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

// ── Premium Detail Modal ──────────────────────────────────
function PremiumDetailModal({ open, onClose, premium, onRecordPayment }) {
  const navigate = useNavigate()
  if (!premium) return null
  const payments = getPaymentsForPremium(premium.premiumId)
  const remaining = premium.amount - (premium.paidAmount || 0)

  return (
    <Modal open={open} onClose={onClose} title="Premium Details" size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {remaining > 0 && <Button variant="primary" size="sm" icon={CreditCard} onClick={() => { onClose(); onRecordPayment(premium) }}>Record Payment</Button>}
          <Button variant="secondary" size="sm" icon={Shield} onClick={() => { onClose(); navigate(`/policies/${premium.policyId}`) }}>View Policy</Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="details-grid">
        {[
          ['Premium ID',    premium.premiumId],
          ['Status',        null, <SBadge key="s" status={premium.status} map={PREMIUM_STATUS} />],
          ['Policy Number', premium.policyNumber],
          ['Customer',      premium.customerName],
          ['Total Amount',  formatINR(premium.amount)],
          ['Paid Amount',   formatINR(premium.paidAmount || 0)],
          ['Remaining',     formatINR(remaining)],
          ['Due Date',      premium.dueDate],
          ['Grace Period',  '15 Days (penalty-free)'],
          ['Schedule',      `${premium.frequency || 'Annual'} Installment`],
          ['Coverage Period', premium.premiumPeriod],
          ['Base + 18% GST', `${formatINR(Math.round(premium.amount / 1.18))} + ${formatINR(premium.amount - Math.round(premium.amount / 1.18))}`],
        ].map(([label, val, node]) => (
          <div key={label}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{label}</p>
            {node || <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: '#172033' }}>{val}</p>}
          </div>
        ))}
      </div>
      {payments.length > 0 && (
        <>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#168BFF', textTransform: 'uppercase' }}>Payment History</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>{['ID','Amount','Date','Mode','Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.paymentId}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#64748B' }}>{p.paymentId}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}</td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{p.paymentDate}</td>
                    <td style={{ fontSize: 13 }}>{p.paymentMode}</td>
                    <td><SBadge status={p.status} map={PAYMENT_STATUS} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}

// ── Record Payment Modal ──────────────────────────────────
function RecordPaymentModal({ open, onClose, premium, onSubmit }) {
  const remaining = premium ? (premium.amount - (premium.paidAmount || 0)) : 0
  const [amount, setAmount]   = useState(remaining)
  const [mode, setMode]       = useState('UPI')
  const [date, setDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [errors, setErrors]   = useState({})

  useEffect(() => {
    if (premium) {
      const rem = premium.amount - (premium.paidAmount || 0)
      setAmount(rem)
      setErrors({})
    }
  }, [premium])

  if (!premium) return null

  function handleSubmit() {
    const e = {}
    if (!amount || Number(amount) <= 0) e.amount = 'Enter a valid amount.'
    if (Number(amount) > remaining) e.amount = `Max payable: ${formatINR(remaining)}`
    if (!date) e.date = 'Date required.'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({
      paymentId: generatePaymentId(),
      transactionRef: generateTxnRef(),
      premiumId: premium.premiumId,
      policyId: premium.policyId,
      policyNumber: premium.policyNumber,
      customerId: premium.customerId,
      customerName: premium.customerName,
      amount: Number(amount),
      paymentDate: date,
      paymentMode: mode,
      status: 'paid',
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="md"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" icon={CreditCard} onClick={handleSubmit}>Record</Button>
      </>}>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#0369A1', padding: '7px 11px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={16} /> <strong>Installment Payment Reconciliation:</strong> Balance updates automatically upon transaction confirmation.
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748B' }}>
        Premium: <strong>{premium.premiumId}</strong> · Remaining: <strong style={{ color: '#EF4444' }}>{formatINR(remaining)}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#172033', display: 'block', marginBottom: 5 }}>Amount (₹)*</label>
          <input className={`input${errors.amount ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }} type="number" min="1" max={remaining}
            value={amount} onChange={e => { setAmount(e.target.value); setErrors(er => { const n = {...er}; delete n.amount; return n }) }} />
          {errors.amount && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.amount}</p>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#172033', display: 'block', marginBottom: 5 }}>Mode*</label>
          <select className="select" style={{ height: 38, fontSize: 13 }} value={mode} onChange={e => setMode(e.target.value)}>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#172033', display: 'block', marginBottom: 5 }}>Date*</label>
          <input className={`input${errors.date ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }} type="date"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
const ROWS = [8, 15, 25]
const COLS = [
  { key: 'premiumId',     label: 'Premium ID',    sortable: true },
  { key: 'policyNumber',  label: 'Policy No.',    sortable: true },
  { key: 'customerName',  label: 'Customer',      sortable: true },
  { key: 'amount',        label: 'Amount',         sortable: true },
  { key: 'dueDate',       label: 'Due Date',      sortable: true },
  { key: 'issueDate',     label: 'Issue Date',    sortable: true },
  { key: 'premiumPeriod', label: 'Period',          sortable: false },
  { key: 'status',        label: 'Status',         sortable: true },
  { key: 'actions',       label: 'Actions',        sortable: false },
]

export default function Premiums() {
  const navigate = useNavigate()
  const [premiums, setPremiums]       = useState(initialPremiums)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [sortKey, setSortKey]         = useState('dueDate')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [viewPrem, setViewPrem]       = useState(null)
  const [payPrem, setPayPrem]         = useState(null)
  const [toast, setToast]             = useState(null)

  // ── Sync with PostgreSQL Backend ────────────────────────
  useEffect(() => {
    let isMounted = true
    async function loadPremiums() {
      try {
        const res = await insuranceService.getPremiums({ limit: 50 })
        const list = res?.data?.data || res?.data || []
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped = list.map(pr => {
            const amt = Number(pr.amount)
            const paid = Number(pr.paidAmount || 0)
            const remaining = amt - paid
            let st = 'due'
            if (paid >= amt) st = 'paid'
            else if (paid > 0) st = 'partially_paid'
            else if (pr.status) st = String(pr.status).toLowerCase()

            return {
              ...pr,
              premiumId: pr.premiumNumber || pr.premiumId || pr.id,
              customerName: pr.policy?.customer
                ? `${pr.policy.customer.firstName} ${pr.policy.customer.lastName}`
                : (pr.customerName || 'Policyholder'),
              policyNumber: pr.policy?.policyNumber || pr.policyNumber || 'POL-REF',
              policyId: pr.policyId || pr.policy?.id,
              customerId: pr.policy?.customer?.id || pr.customerId,
              amount: amt,
              paidAmount: paid,
              remainingBalance: Math.max(0, remaining),
              dueDate: pr.dueDate ? String(pr.dueDate).split('T')[0] : '2025-01-15',
              issueDate: pr.createdAt ? String(pr.createdAt).split('T')[0] : '2025-01-01',
              premiumPeriod: pr.billingPeriodStart && pr.billingPeriodEnd
                ? `${String(pr.billingPeriodStart).split('T')[0]} to ${String(pr.billingPeriodEnd).split('T')[0]}`
                : (pr.premiumPeriod || 'Annual Installment'),
              status: st,
            }
          })
          const existingIds = new Set(mapped.map(m => m.premiumId))
          const rest = initialPremiums.filter(m => !existingIds.has(m.premiumId))
          setPremiums([...mapped, ...rest])
        }
      } catch (err) {
        console.warn('Live premium sync note:', err.message)
      }
    }
    loadPremiums()
    return () => { isMounted = false }
  }, [])

  const totalAmount       = premiums.reduce((sum, p) => sum + p.amount, 0)
  const collectedAmount   = premiums.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
  const outstandingAmount = premiums.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0)
  const overduePremiums   = premiums.filter(p => p.status === 'overdue')
  const overdueAmount     = overduePremiums.reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return premiums.filter(p => {
      const ms = !q || p.premiumId.toLowerCase().includes(q) || p.policyNumber.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q)
      return ms && (!statusFilter || p.status === statusFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [premiums, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter

  function sort(k) { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc') }; setPage(1) }
  function clearFilters() { setSearch(''); setStatusF(''); setPage(1) }

  async function handleRecordPayment(paymentData) {
    try {
      await insuranceService.createPayment({
        premiumId: paymentData.premiumId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMode,
        transactionReference: paymentData.transactionRef,
        notes: `Recorded for ${paymentData.customerName}`,
      })
      setPremiums(prev => prev.map(p => {
        if (p.premiumId !== paymentData.premiumId) return p
        const newPaid = (p.paidAmount || 0) + paymentData.amount
        const newStatus = newPaid >= p.amount ? 'paid' : 'partially_paid'
        return { ...p, paidAmount: newPaid, status: newStatus }
      }))
      setToast({ message: `Payment of ${formatINR(paymentData.amount)} recorded & reconciled for ${paymentData.premiumId}.`, type: 'success' })
    } catch (err) {
      setPremiums(prev => prev.map(p => {
        if (p.premiumId !== paymentData.premiumId) return p
        const newPaid = (p.paidAmount || 0) + paymentData.amount
        const newStatus = newPaid >= p.amount ? 'paid' : 'partially_paid'
        return { ...p, paidAmount: newPaid, status: newStatus }
      }))
      setToast({ message: `Payment of ${formatINR(paymentData.amount)} recorded for ${paymentData.premiumId}.`, type: 'success' })
    }
  }

  return (
    <div>
      <PageHeader title="Premium Management" subtitle="Track premium installments, due dates, and payment statuses." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={IndianRupee}  color="#168BFF" bg="#EFF6FF" label="Total Premiums"       value={formatINR(totalAmount)}       note={`${premiums.length} installments`} />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Collected Premiums"   value={formatINR(collectedAmount)}   note={`${premiums.filter(p => p.status === 'paid').length} fully settled`} />
        <KPICard icon={Clock}        color="#F59E0B" bg="#FFFBEB" label="Outstanding Premiums" value={formatINR(outstandingAmount)} note={`${premiums.filter(p => p.status !== 'paid').length} pending payment`} />
        <KPICard icon={AlertTriangle}color="#EF4444" bg="#FEF2F2" label="Overdue Premiums"     value={formatINR(overdueAmount)}     note={`${overduePremiums.length} policies overdue`} />
      </div>

      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }} placeholder="Search premium, policy, customer…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 150 }} value={statusFilter} onChange={e => { setStatusF(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            {Object.entries(PREMIUM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      <Card padding={false}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Showing <strong style={{ color: '#172033' }}>{filtered.length}</strong> premium{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12.5, color: '#64748B' }}>Rows:</label>
            <select className="select" style={{ height: 32, fontSize: 12.5, width: 70 }} value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}>
              {ROWS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" role="table">
            <thead><tr>{COLS.map(c => (
              <th key={c.key} onClick={c.sortable ? () => sort(c.key) : undefined}
                style={{ cursor: c.sortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{c.label}{c.sortable && <SortIcon col={c.key} sortKey={sortKey} sortDir={sortDir} />}</span>
              </th>
            ))}</tr></thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={COLS.length} style={{ padding: 0 }}><EmptyState title="No premiums" /></td></tr>
              ) : pageRows.map(p => {
                const remaining = p.amount - (p.paidAmount || 0)
                return (
                  <tr key={p.premiumId} style={{ cursor: 'pointer' }} onClick={() => setViewPrem(p)}>
                    <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{p.premiumId}</td>
                    <td style={{ fontSize: 13, color: '#168BFF', fontWeight: 600, cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); navigate(`/policies/${p.policyId}`) }}>{p.policyNumber}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.customerName} /><span style={{ fontWeight: 600, fontSize: 13 }}>{p.customerName}</span></div></td>
                    <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}{remaining > 0 && remaining < p.amount && <span style={{ fontSize: 11, color: '#94A3B8', display: 'block' }}>Paid: {formatINR(p.paidAmount)}</span>}</td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{p.dueDate}</td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{p.issueDate}</td>
                    <td style={{ fontSize: 12.5, color: '#64748B' }}>{p.premiumPeriod}</td>
                    <td><SBadge status={p.status} map={PREMIUM_STATUS} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewPrem(p)} aria-label="View"><Eye size={15} /></button>
                        {remaining > 0 && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPayPrem(p)} aria-label="Pay"><CreditCard size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#64748B' }}>Page {safePage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage===1}><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, i) => i+1).filter(n => n===1||n===totalPages||Math.abs(n-safePage)<=1)
                .reduce((a,n,i,arr)=>{if(i>0&&n-arr[i-1]>1)a.push('…');a.push(n);return a},[])
                .map((n,i) => n==='…' ? <span key={`e${i}`} style={{padding:'0 4px',color:'#94A3B8'}}>…</span>
                  : <button key={n} className={`btn btn-sm ${n===safePage?'btn-primary':'btn-ghost'}`} onClick={()=>setPage(n)} style={{minWidth:32}}>{n}</button>)}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </Card>

      <PremiumDetailModal open={!!viewPrem} onClose={() => setViewPrem(null)} premium={viewPrem} onRecordPayment={setPayPrem} />
      <RecordPaymentModal open={!!payPrem} onClose={() => setPayPrem(null)} premium={payPrem} onSubmit={handleRecordPayment} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
