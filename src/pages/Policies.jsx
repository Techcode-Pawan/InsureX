import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield, ShieldCheck, Clock, CalendarClock,
  Search, SlidersHorizontal, X, Plus, Download,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, User, MoreVertical,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Toast } from '../components/ui/Toast'
import PolicyFormModal from '../components/policies/PolicyFormModal'

import {
  initialPolicies, formatINR, generatePolicyNumber,
  POLICY_STATUS, initialPolicyTypes,
} from '../data/policyData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = POLICY_STATUS[status] || { label: status, variant: 'gray' }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} style={{ color: '#CBD5E1' }} />
  return sortDir === 'asc'
    ? <ChevronUp   size={12} style={{ color: '#168BFF' }} />
    : <ChevronDown size={12} style={{ color: '#168BFF' }} />
}

function Avatar({ name, size = 30 }) {
  const parts = name.split(' ')
  const bg = avatarColor(name)
  const label = initials(parts[0] || '', parts[1] || '')
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>{label}</div>
  )
}

function KPICard({ icon: Icon, color, bg, label, value, note }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#172033', letterSpacing: '-0.5px' }}>{value}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>{note}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

function RowActions({ policy, onEdit }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(v => !v)}
        aria-label={`Actions for ${policy.policyNumber}`} aria-expanded={open} aria-haspopup="menu">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 100, marginTop: 4,
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(6,20,38,0.10)', minWidth: 170, overflow: 'hidden',
          }}>
            {[
              { icon: Eye,    label: 'View Details',   action: () => { setOpen(false); navigate(`/policies/${policy.policyId}`) } },
              { icon: Pencil, label: 'Edit Policy',    action: () => { setOpen(false); onEdit(policy) } },
              { icon: User,   label: 'View Customer',  action: () => { setOpen(false); navigate(`/customers/${policy.customerId}`) } },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} role="menuitem" className="btn btn-ghost"
                onClick={action} style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '9px 14px', gap: 9, fontSize: 13 }}>
                <Icon size={14} style={{ color: '#64748B' }} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25, 50]
const COLS = [
  { key: 'policyNumber', label: 'Policy No.',      sortable: true },
  { key: 'customerName', label: 'Customer',        sortable: true },
  { key: 'policyType',   label: 'Policy Type',     sortable: true },
  { key: 'sumAssured',   label: 'Sum Assured',     sortable: true },
  { key: 'premiumAmount',label: 'Premium',          sortable: true },
  { key: 'premiumFrequency', label: 'Frequency',   sortable: false },
  { key: 'startDate',    label: 'Start Date',      sortable: true },
  { key: 'expiryDate',   label: 'Expiry Date',     sortable: true },
  { key: 'status',       label: 'Status',          sortable: true },
  { key: 'actions',      label: 'Actions',         sortable: false },
]

export default function Policies() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCustFilter = searchParams.get('customerId') || ''

  const [policies, setPolicies]       = useState(initialPolicies)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [typeFilter, setType]         = useState('')
  const [custFilter, setCust]         = useState(initialCustFilter)
  const [sortKey, setSortKey]         = useState('startDate')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [formOpen, setFormOpen]       = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [toast, setToast]             = useState(null)
  const [showFilters, setShowFilters] = useState(!!initialCustFilter)

  // ── KPI ─────────────────────────────────────────────
  const totalCount   = policies.length
  const activeCount  = policies.filter(p => p.status === 'active').length
  const pendingCount = policies.filter(p => p.status === 'pending').length
  const today = new Date()
  const soon30 = new Date(today); soon30.setDate(soon30.getDate() + 30)
  const expiringSoon = policies.filter(p => {
    if (p.status !== 'active') return false
    const exp = new Date(p.expiryDate)
    return exp >= today && exp <= soon30
  }).length

  // ── Filter + sort ───────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return policies
      .filter(p => {
        const matchSearch = !q || p.policyNumber.toLowerCase().includes(q)
          || p.customerName.toLowerCase().includes(q)
          || p.policyType.toLowerCase().includes(q)
        const matchStatus = !statusFilter || p.status === statusFilter
        const matchType   = !typeFilter   || p.policyTypeId === typeFilter
        const matchCust   = !custFilter   || p.customerId === custFilter
        return matchSearch && matchStatus && matchType && matchCust
      })
      .sort((a, b) => {
        let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
        if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      })
  }, [policies, search, statusFilter, typeFilter, custFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter || typeFilter || custFilter

  function sort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }
  function clearFilters() { setSearch(''); setStatus(''); setType(''); setCust(''); setPage(1) }

  // ── CRUD ────────────────────────────────────────────
  function handleAdd(fields) {
    const newPol = { ...fields, policyId: `POL-${Date.now()}`, policyNumber: generatePolicyNumber() }
    setPolicies(ps => [newPol, ...ps])
    setToast({ message: `Policy ${newPol.policyNumber} created successfully.`, type: 'success' })
  }
  function handleEdit(fields) {
    setPolicies(ps => ps.map(p => p.policyId === editTarget.policyId ? { ...p, ...fields } : p))
    setToast({ message: 'Policy updated successfully.', type: 'success' })
    setEditTarget(null)
  }
  function openEdit(policy) { setEditTarget(policy); setFormOpen(true) }
  function openAdd()        { setEditTarget(null);   setFormOpen(true) }
  function closeForm()      { setFormOpen(false); setEditTarget(null) }

  function exportCSV() {
    const headers = ['Policy No.','Customer','Type','Sum Assured','Premium','Frequency','Start','Expiry','Status']
    const rows = filtered.map(p => [p.policyNumber, p.customerName, p.policyType, p.sumAssured, p.premiumAmount, p.premiumFrequency, p.startDate, p.expiryDate, p.status])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'insurex-policies.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Insurance Policies"
        subtitle="Manage policy records, coverage, premiums, and policy status."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Download} onClick={exportCSV}>Export</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={openAdd} id="add-policy-btn">Add Policy</Button>
          </>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={Shield}       color="#168BFF" bg="#EFF6FF" label="Total Policies"  value={totalCount}   note="All policy records" />
        <KPICard icon={ShieldCheck}   color="#10B981" bg="#F0FDF4" label="Active Policies" value={activeCount}  note="Currently in force" />
        <KPICard icon={Clock}         color="#F59E0B" bg="#FFFBEB" label="Pending"          value={pendingCount} note="Awaiting activation" />
        <KPICard icon={CalendarClock} color="#EF4444" bg="#FEF2F2" label="Expiring Soon"    value={expiringSoon} note="Within 30 days" />
      </div>

      {/* Search & Filter toolbar */}
      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }}
              placeholder="Search policy number, customer, type…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} aria-label="Search policies" />
          </div>
          <Button variant="secondary" size="sm" icon={SlidersHorizontal}
            onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}>
            Filters {hasFilters && <span style={{ background: '#168BFF', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>!</span>}
          </Button>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
        {showFilters && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <select className="select" style={{ height: 36, fontSize: 13, minWidth: 150 }}
              value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="active">Active</option><option value="pending">Pending</option>
              <option value="expired">Expired</option><option value="cancelled">Cancelled</option>
            </select>
            <select className="select" style={{ height: 36, fontSize: 13, minWidth: 160 }}
              value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="Filter by type">
              <option value="">All Types</option>
              {initialPolicyTypes.map(t => <option key={t.typeId} value={t.typeId}>{t.name}</option>)}
            </select>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            Showing <strong style={{ color: '#172033' }}>{filtered.length}</strong> polic{filtered.length !== 1 ? 'ies' : 'y'}
            {hasFilters ? ' (filtered)' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12.5, color: '#64748B' }} htmlFor="pol-rows">Rows:</label>
            <select id="pol-rows" className="select" style={{ height: 32, fontSize: 12.5, width: 70 }}
              value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}>
              {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" role="table" aria-label="Insurance policies">
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col.key} scope="col"
                    onClick={col.sortable ? () => sort(col.key) : undefined}
                    style={{ cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                    aria-sort={col.sortable && sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={COLS.length} style={{ padding: 0 }}>
                  <EmptyState title="No policies found"
                    description={hasFilters ? 'No policies match your search or filters.' : 'No policy records exist yet.'}
                    action={hasFilters && <Button variant="secondary" size="sm" icon={X} onClick={clearFilters}>Clear Filters</Button>} />
                </td></tr>
              ) : pageRows.map(p => (
                <tr key={p.policyId} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/policies/${p.policyId}`)}
                  tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(`/policies/${p.policyId}`)}>
                  <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{p.policyNumber}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={p.customerName} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.customerName}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{p.policyType}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(p.sumAssured)}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(p.premiumAmount)}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{p.premiumFrequency}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{p.startDate}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{p.expiryDate}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowActions policy={p} onEdit={openEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#64748B' }}>Page {safePage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1} aria-label="Previous page"><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push('…'); acc.push(n); return acc }, [])
                .map((n, i) => n === '…'
                  ? <span key={`e-${i}`} style={{ padding: '0 4px', color: '#94A3B8', fontSize: 13 }}>…</span>
                  : <button key={n} className={`btn btn-sm ${n === safePage ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPage(n)} style={{ minWidth: 32 }}>{n}</button>
                )}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages} aria-label="Next page"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </Card>

      <PolicyFormModal open={formOpen} onClose={closeForm} onSubmit={editTarget ? handleEdit : handleAdd} editData={editTarget} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
