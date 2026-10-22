import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, UserPlus, Shield,
  Search, SlidersHorizontal, X,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, FileText, MoreVertical, Download,
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
  STATUS_MAP, generateCustomerId,
  getCustomerPolicies,
} from '../data/customerData'

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ firstName, lastName, size = 36 }) {
  const bg    = avatarColor(`${firstName} ${lastName}`)
  const label = initials(firstName, lastName)
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.37, flexShrink: 0,
    }}>
      {label}
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────
function CustBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, variant: 'gray' }
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
}

// ── Sort indicator ─────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} style={{ color: '#CBD5E1' }} />
  return sortDir === 'asc'
    ? <ChevronUp   size={12} style={{ color: '#168BFF' }} />
    : <ChevronDown size={12} style={{ color: '#168BFF' }} />
}

// ── Summary KPI Card ───────────────────────────────────────────
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

// ── Action dropdown for table row ──────────────────────────────
function RowActions({ customer, onEdit, onViewPolicies }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => setOpen(v => !v)}
        aria-label={`Actions for ${customer.firstName} ${customer.lastName}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
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
              { icon: Eye,      label: 'View Details',   action: () => { setOpen(false); navigate(`/customers/${customer.customerId}`) } },
              { icon: Pencil,   label: 'Edit Customer',  action: () => { setOpen(false); onEdit(customer) } },
              { icon: FileText, label: 'View Policies',  action: () => { setOpen(false); onViewPolicies(customer) } },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                role="menuitem"
                className="btn btn-ghost"
                onClick={action}
                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '9px 14px', gap: 9, fontSize: 13 }}
              >
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
// CUSTOMERS PAGE
// ════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25, 50]

export default function Customers() {
  const navigate = useNavigate()

  // ── State ────────────────────────────────────────────────
  const [customers, setCustomers]     = useState(initialCustomers)
  const [search,    setSearch]        = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [genderFilter, setGender]     = useState('')
  const [sortKey,   setSortKey]       = useState('registrationDate')
  const [sortDir,   setSortDir]       = useState('desc')
  const [page,      setPage]          = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [formOpen,  setFormOpen]      = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [toast,     setToast]         = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // ── Derived summary stats ────────────────────────────────
  const totalCount   = customers.length
  const activeCount  = customers.filter(c => c.status === 'active').length
  const thisMonth    = customers.filter(c => {
    const d = new Date(c.registrationDate)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const withPolicies = customers.filter(c => getCustomerPolicies(c.customerId).some(p => p.policyStatus === 'active')).length

  // ── Filtering + sorting ──────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return customers
      .filter(c => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        const matchSearch = !q || fullName.includes(q) || c.customerId.toLowerCase().includes(q)
          || c.email.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
        const matchStatus = !statusFilter || c.status === statusFilter
        const matchGender = !genderFilter || c.gender === genderFilter
        return matchSearch && matchStatus && matchGender
      })
      .sort((a, b) => {
        let av = a[sortKey] || '', bv = b[sortKey] || ''
        if (sortKey === 'name') { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}` }
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      })
  }, [customers, search, statusFilter, genderFilter, sortKey, sortDir])

  // ── Pagination ───────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage    = Math.min(page, totalPages)
  const pageRows    = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)

  function sort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function clearFilters() {
    setSearch(''); setStatus(''); setGender(''); setPage(1)
  }

  const hasFilters = search || statusFilter || genderFilter

  // ── CRUD ─────────────────────────────────────────────────
  const handleAdd = useCallback((fields) => {
    const newCust = {
      ...fields,
      customerId: generateCustomerId(),
      registrationDate: new Date().toISOString().split('T')[0],
    }
    setCustomers(cs => [newCust, ...cs])
    setToast({ message: `Customer ${fields.firstName} ${fields.lastName} added successfully.`, type: 'success' })
  }, [])

  const handleEdit = useCallback((fields) => {
    setCustomers(cs => cs.map(c => c.customerId === editTarget.customerId ? { ...c, ...fields } : c))
    setToast({ message: `Customer updated successfully.`, type: 'success' })
    setEditTarget(null)
  }, [editTarget])

  function openEdit(customer) { setEditTarget(customer); setFormOpen(true) }
  function openAdd()          { setEditTarget(null);     setFormOpen(true) }
  function closeForm()        { setFormOpen(false); setEditTarget(null) }

  function handleViewPolicies(customer) {
    navigate(`/policies?customerId=${customer.customerId}`)
  }

  // ── Export CSV ───────────────────────────────────────────
  function exportCSV() {
    const headers = ['Customer ID','First Name','Last Name','Email','Phone','Gender','City','State','Status','Registration Date']
    const rows = filtered.map(c => [c.customerId, c.firstName, c.lastName, c.email, c.phone, c.gender, c.city, c.state, c.status, c.registrationDate])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'insurex-customers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Column config ─────────────────────────────────────────
  const COLS = [
    { key: 'customerId',       label: 'ID',            sortable: true  },
    { key: 'name',             label: 'Customer',      sortable: true  },
    { key: 'email',            label: 'Email',         sortable: true  },
    { key: 'phone',            label: 'Phone',         sortable: false },
    { key: 'dateOfBirth',      label: 'Date of Birth', sortable: true  },
    { key: 'gender',           label: 'Gender',        sortable: true  },
    { key: 'policies',         label: 'Policies',      sortable: false },
    { key: 'status',           label: 'Status',        sortable: true  },
    { key: 'actions',          label: 'Actions',       sortable: false },
  ]

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles and their insurance relationships."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Download} onClick={exportCSV} aria-label="Export customers CSV">
              Export
            </Button>
            <Button variant="primary" size="sm" icon={UserPlus} onClick={openAdd} id="add-customer-btn">
              Add Customer
            </Button>
          </>
        }
      />

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={Users}     color="#168BFF" bg="#EFF6FF" label="Total Customers"              value={totalCount}   note="All registered customers" />
        <KPICard icon={UserCheck} color="#10B981" bg="#F0FDF4" label="Active Customers"             value={activeCount}  note="Currently active accounts" />
        <KPICard icon={UserPlus}  color="#6366F1" bg="#F5F3FF" label="New This Month"               value={thisMonth}    note="Registered this month" />
        <KPICard icon={Shield}    color="#F59E0B" bg="#FFFBEB" label="With Active Policies"         value={withPolicies} note="Have ≥1 active policy" />
      </div>

      {/* ── Search / Filter Toolbar ─────────────────────── */}
      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search by name, ID, email, phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              aria-label="Search customers"
              id="customer-search"
            />
          </div>

          {/* Filter toggle */}
          <Button variant="secondary" size="sm" icon={SlidersHorizontal}
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
          >
            Filters {hasFilters && <span style={{ background: '#168BFF', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>!</span>}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters} aria-label="Clear all filters">
              Clear
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <select className="select" style={{ height: 36, fontSize: 13, minWidth: 160 }}
              value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_verification">Pending Verification</option>
            </select>
            <select className="select" style={{ height: 36, fontSize: 13, minWidth: 140 }}
              value={genderFilter} onChange={e => { setGender(e.target.value); setPage(1) }} aria-label="Filter by gender">
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}
      </Card>

      {/* ── Table ──────────────────────────────────────── */}
      <Card padding={false}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            Showing <strong style={{ color: '#172033' }}>{filtered.length}</strong> customer{filtered.length !== 1 ? 's' : ''}
            {hasFilters ? ' (filtered)' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12.5, color: '#64748B' }} htmlFor="rows-select">Rows:</label>
            <select
              id="rows-select"
              className="select"
              style={{ height: 32, fontSize: 12.5, width: 70 }}
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1) }}
            >
              {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" role="table" aria-label="Customer records">
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col.key} scope="col"
                    onClick={col.sortable ? () => sort(col.key) : undefined}
                    style={{ cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                    aria-sort={col.sortable && sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
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
                <tr>
                  <td colSpan={COLS.length} style={{ padding: 0 }}>
                    <EmptyState
                      title="No customers found"
                      description={hasFilters ? 'No customers match your current search or filter criteria.' : 'No customer records exist yet.'}
                      action={hasFilters && <Button variant="secondary" size="sm" icon={X} onClick={clearFilters}>Clear Filters</Button>}
                    />
                  </td>
                </tr>
              ) : pageRows.map(c => {
                const policies = getCustomerPolicies(c.customerId)
                const activeP  = policies.filter(p => p.policyStatus === 'active').length
                return (
                  <tr key={c.customerId}
                    onClick={() => navigate(`/customers/${c.customerId}`)}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/customers/${c.customerId}`)}
                    aria-label={`View details for ${c.firstName} ${c.lastName}`}
                  >
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#168BFF', fontWeight: 600 }}>
                        {c.customerId}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar firstName={c.firstName} lastName={c.lastName} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#172033' }}>
                            {c.firstName} {c.lastName}
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{c.city}, {c.state}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{c.email}</td>
                    <td style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>{c.phone}</td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{c.dateOfBirth}</td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>{c.gender}</td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>{activeP}</span>
                      {policies.length > activeP && (
                        <span style={{ fontSize: 11.5, color: '#94A3B8', marginLeft: 4 }}>
                          /{policies.length}
                        </span>
                      )}
                    </td>
                    <td><CustBadge status={c.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowActions customer={c} onEdit={openEdit} onViewPolicies={handleViewPolicies} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: '#64748B' }}>
              Page {safePage} of {totalPages} · {filtered.length} records
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1} aria-label="Previous page">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((n, i) => n === '…'
                  ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94A3B8', fontSize: 13 }}>…</span>
                  : <button key={n} className={`btn btn-sm ${n === safePage ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPage(n)} aria-label={`Page ${n}`} aria-current={n === safePage ? 'page' : undefined}
                      style={{ minWidth: 32 }}>
                      {n}
                    </button>
                )}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages} aria-label="Next page">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Modals ─────────────────────────────────────── */}
      <CustomerFormModal
        open={formOpen}
        onClose={closeForm}
        onSubmit={editTarget ? handleEdit : handleAdd}
        editData={editTarget}
      />

      {/* ── Toast ──────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
