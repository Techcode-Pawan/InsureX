import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Banknote, CheckCircle2, Clock, XCircle, Plus,
  Search, X, Eye, Printer,
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
  initialPayments, PAYMENT_STATUS, PAYMENT_MODES, formatINR,
  generatePaymentId, generateTxnRef, initialPremiums,
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

// ── Payment Detail & Receipt Modal ────────────────────────
function PaymentDetailModal({ open, onClose, payment }) {
  if (!payment) return null
  const navigate = useNavigate()

  return (
    <Modal open={open} onClose={onClose} title="Payment Receipt" size="md"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print Receipt</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => { onClose(); navigate(`/policies/${payment.policyId}`) }}>View Policy</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      }>
      
      {/* Styled Printable Receipt Voucher */}
      <div style={{
        background: '#FAFBFD',
        border: '1.5px dashed #CBD5E1',
        borderRadius: 12,
        padding: '20px',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      }}>
        {/* Receipt Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#061426', letterSpacing: '-0.02em' }}>Insure<span style={{ color: '#168BFF' }}>X</span></span>
              <span style={{ fontSize: 11, background: '#EFF6FF', color: '#168BFF', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>OFFICIAL RECEIPT</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Insurance Management & Settlement</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <SBadge status={payment.status} map={PAYMENT_STATUS} />
            <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'monospace', color: '#64748B' }}>{payment.paymentDate} · 11:30 AM</p>
          </div>
        </div>

        {/* Amount Highlight */}
        <div style={{ textAlign: 'center', padding: '12px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #EDF2F7', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Amount Transacted</p>
          <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900, color: '#10B981' }}>{formatINR(payment.amount)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#94A3B8' }}>Payment Mode: {payment.paymentMode}</p>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }} className="details-grid">
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Payment ID</p>
            <p style={{ margin: '2px 0', fontFamily: 'monospace', fontWeight: 700, color: '#172033' }}>{payment.paymentId}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Transaction Ref</p>
            <p style={{ margin: '2px 0', fontFamily: 'monospace', fontWeight: 700, color: '#168BFF', wordBreak: 'break-all' }}>{payment.transactionRef}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Customer Name</p>
            <p style={{ margin: '2px 0', fontWeight: 600, color: '#172033' }}>{payment.customerName}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Policy Number</p>
            <p style={{ margin: '2px 0', fontWeight: 600, color: '#172033' }}>{payment.policyNumber}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Premium Schedule ID</p>
            <p style={{ margin: '2px 0', fontFamily: 'monospace', color: '#64748B' }}>{payment.premiumId || '—'}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Settlement Status</p>
            <p style={{ margin: '2px 0', fontWeight: 600, color: payment.status === 'paid' ? '#10B981' : '#F59E0B' }}>
              {payment.status === 'paid' ? 'Settled & Reconciled' : 'Pending Clearance'}
            </p>
          </div>
        </div>

        {/* Footer info / Authorized watermark */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Digitally verified transaction receipt</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10B981' }}>
            ✓ Verified by InsureX Accounts
          </span>
        </div>
      </div>
    </Modal>
  )
}

// ── Add Payment Modal ─────────────────────────────────────
function AddPaymentModal({ open, onClose, onSubmit, premiums }) {
  const [fields, setFields] = useState({ premiumId: '', amount: '', mode: 'UPI', date: new Date().toISOString().split('T')[0] })
  const [errors, setErrors] = useState({})

  const selectedPrem = premiums.find(p => p.premiumId === fields.premiumId)
  const maxAmount = selectedPrem ? selectedPrem.amount - (selectedPrem.paidAmount || 0) : 0

  function set(k, v) { setFields(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n }) }

  function handleSubmit() {
    const e = {}
    if (!fields.premiumId) e.premiumId = 'Select a premium.'
    if (!fields.amount || Number(fields.amount) <= 0) e.amount = 'Enter a valid amount.'
    if (selectedPrem && Number(fields.amount) > maxAmount) e.amount = `Max: ${formatINR(maxAmount)}`
    if (!fields.date) e.date = 'Date required.'
    if (Object.keys(e).length) { setErrors(e); return }

    onSubmit({
      paymentId: generatePaymentId(),
      transactionRef: generateTxnRef(),
      premiumId: fields.premiumId,
      policyId: selectedPrem?.policyId || '',
      policyNumber: selectedPrem?.policyNumber || '',
      customerId: selectedPrem?.customerId || '',
      customerName: selectedPrem?.customerName || '',
      amount: Number(fields.amount),
      paymentDate: fields.date,
      paymentMode: fields.mode,
      status: 'paid',
    })
    setFields({ premiumId: '', amount: '', mode: 'UPI', date: new Date().toISOString().split('T')[0] })
    onClose()
  }

  const unpaidPremiums = premiums.filter(p => (p.amount - (p.paidAmount || 0)) > 0)

  return (
    <Modal open={open} onClose={onClose} title="Record New Payment" size="md"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>Record Payment</Button>
      </>}>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#94A3B8', padding: '7px 11px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        ℹ️ Demo only — no real payment gateway is involved.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Premium*</label>
          <select className={`select${errors.premiumId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.premiumId} onChange={e => { set('premiumId', e.target.value); set('amount', '') }}>
            <option value="">Select unpaid premium</option>
            {unpaidPremiums.map(p => (
              <option key={p.premiumId} value={p.premiumId}>
                {p.premiumId} — {p.customerName} — {p.policyNumber} — Due: {formatINR(p.amount - (p.paidAmount||0))}
              </option>
            ))}
          </select>
          {errors.premiumId && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.premiumId}</p>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Amount (₹)*</label>
          <input className={`input${errors.amount ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }} type="number" min="1"
            placeholder={maxAmount ? `Max ${formatINR(maxAmount)}` : ''} value={fields.amount} onChange={e => set('amount', e.target.value)} />
          {errors.amount && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.amount}</p>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Mode*</label>
          <select className="select" style={{ height: 38, fontSize: 13 }} value={fields.mode} onChange={e => set('mode', e.target.value)}>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Date*</label>
          <input className={`input${errors.date ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }} type="date"
            value={fields.date} onChange={e => set('date', e.target.value)} />
          {errors.date && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.date}</p>}
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
const ROWS = [8, 15, 25, 50]
const COLS = [
  { key: 'paymentId',      label: 'Payment ID',   sortable: true },
  { key: 'transactionRef', label: 'TXN Ref',      sortable: true },
  { key: 'customerName',   label: 'Customer',     sortable: true },
  { key: 'policyNumber',   label: 'Policy No.',   sortable: true },
  { key: 'premiumId',      label: 'Premium',       sortable: false },
  { key: 'amount',         label: 'Amount',        sortable: true },
  { key: 'paymentDate',    label: 'Date',          sortable: true },
  { key: 'paymentMode',    label: 'Mode',          sortable: true },
  { key: 'status',         label: 'Status',        sortable: true },
  { key: 'actions',        label: '',              sortable: false },
]

export default function Payments() {
  const navigate = useNavigate()
  const [payments, setPayments]       = useState(initialPayments)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [modeFilter, setModeF]        = useState('')
  const [sortKey, setSortKey]         = useState('paymentDate')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [viewPay, setViewPay]         = useState(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [toast, setToast]             = useState(null)

  const totalCount     = payments.length
  const paidPayments   = payments.filter(p => p.status === 'paid')
  const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0)
  const paidCount      = paidPayments.length
  const pendingCount   = payments.filter(p => p.status === 'pending').length
  const failedCount    = payments.filter(p => p.status === 'failed').length

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return payments.filter(p => {
      const ms = !q || p.paymentId.toLowerCase().includes(q) || p.transactionRef.toLowerCase().includes(q)
        || p.customerName.toLowerCase().includes(q) || p.policyNumber.toLowerCase().includes(q)
      return ms && (!statusFilter || p.status === statusFilter) && (!modeFilter || p.paymentMode === modeFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [payments, search, statusFilter, modeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter || modeFilter

  function sort(k) { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc') }; setPage(1) }
  function clearFilters() { setSearch(''); setStatusF(''); setModeF(''); setPage(1) }

  function handleAddPayment(payData) {
    setPayments(prev => [payData, ...prev])
    setToast({ message: `Payment ${payData.paymentId} recorded (${formatINR(payData.amount)}).`, type: 'success' })
  }

  return (
    <div>
      <PageHeader title="Premium Payments" subtitle="Track payment transactions, statuses, and payment history."
        actions={<Button variant="primary" size="sm" icon={Plus} onClick={() => setAddOpen(true)}>Record Payment</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={Banknote}     color="#168BFF" bg="#EFF6FF" label="Total Collected" value={formatINR(totalCollected)} note={`${paidCount} settled payments`} />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Successful"      value={paidCount}                  note="Completed" />
        <KPICard icon={Clock}        color="#F59E0B" bg="#FFFBEB" label="Pending"         value={pendingCount}               note="Awaiting clearance" />
        <KPICard icon={XCircle}      color="#EF4444" bg="#FEF2F2" label="Failed"          value={failedCount}                note="Unsuccessful / declined" />
      </div>

      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }} placeholder="Search ID, TXN ref, customer, policy…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 140 }} value={statusFilter} onChange={e => { setStatusF(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 140 }} value={modeFilter} onChange={e => { setModeF(e.target.value); setPage(1) }}>
            <option value="">All Modes</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      <Card padding={false}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Showing <strong style={{ color: '#172033' }}>{filtered.length}</strong> payment{filtered.length !== 1 ? 's' : ''}</span>
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
                <tr><td colSpan={COLS.length} style={{ padding: 0 }}><EmptyState title="No payments" description={hasFilters ? 'No results match.' : 'No payments recorded yet.'} /></td></tr>
              ) : pageRows.map(p => (
                <tr key={p.paymentId} style={{ cursor: 'pointer' }} onClick={() => setViewPay(p)}>
                  <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{p.paymentId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748B' }}>{p.transactionRef}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.customerName} /><span style={{ fontWeight: 600, fontSize: 13 }}>{p.customerName}</span></div></td>
                  <td style={{ fontSize: 13, color: '#168BFF', fontWeight: 600, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); navigate(`/policies/${p.policyId}`) }}>{p.policyNumber}</td>
                  <td style={{ fontSize: 12.5, color: '#64748B' }}>{p.premiumId || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(p.amount)}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{p.paymentDate}</td>
                  <td style={{ fontSize: 13 }}>{p.paymentMode}</td>
                  <td><SBadge status={p.status} map={PAYMENT_STATUS} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewPay(p)} aria-label="View"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#64748B' }}>Page {safePage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage===1}><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, i)=>i+1).filter(n=>n===1||n===totalPages||Math.abs(n-safePage)<=1)
                .reduce((a,n,i,arr)=>{if(i>0&&n-arr[i-1]>1)a.push('…');a.push(n);return a},[])
                .map((n,i) => n==='…' ? <span key={`e${i}`} style={{padding:'0 4px',color:'#94A3B8'}}>…</span>
                  : <button key={n} className={`btn btn-sm ${n===safePage?'btn-primary':'btn-ghost'}`} onClick={()=>setPage(n)} style={{minWidth:32}}>{n}</button>)}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </Card>

      <PaymentDetailModal open={!!viewPay} onClose={() => setViewPay(null)} payment={viewPay} />
      <AddPaymentModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAddPayment} premiums={initialPremiums} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
