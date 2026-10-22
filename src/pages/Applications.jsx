import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileStack, Clock, CheckCircle2, XCircle,
  Search, SlidersHorizontal, X, Plus, Download,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Shield, MoreVertical,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'

import {
  initialApplications, APPLICATION_STATUS, formatINR,
  getAppDocuments, DOC_STATUS,
} from '../data/applicationData'
import { initialPolicyTypes } from '../data/policyData'
import { avatarColor, initials } from '../data/customerData'

function SBadge({ status, map }) {
  const c = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}
function Avatar({ name, size = 30 }) {
  const p = name.split(' ')
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials(p[0]||'', p[1]||'')}
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

// ── Detail Modal ────────────────────────────────────────────
function AppDetailModal({ open, onClose, app, onStatusChange }) {
  if (!app) return null
  const docs = getAppDocuments(app.applicationId)
  const [confirmAction, setConfirmAction] = useState(null)
  const [rejectReason, setRejectReason] = useState('Incomplete documentation or failed underwriting criteria.')

  function confirm(action) { setConfirmAction(action) }
  function doAction() {
    if (confirmAction) onStatusChange(app.applicationId, confirmAction, rejectReason)
    setConfirmAction(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { setConfirmAction(null); onClose() }} title="Application Details" size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {app.status === 'pending' && (
            <>
              <Button variant="primary" size="sm" icon={CheckCircle2} onClick={() => confirm('approved')}>Approve</Button>
              <Button variant="danger" size="sm" icon={XCircle} onClick={() => confirm('rejected')}>Reject</Button>
            </>
          )}
          {app.status === 'approved' && !app.policyCreated && (
            <Button variant="primary" size="sm" icon={Shield} onClick={() => confirm('create_policy')}>Create Policy</Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div style={{ marginBottom: 16, padding: 14, background: confirmAction === 'rejected' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${confirmAction === 'rejected' ? '#FECACA' : '#FDE68A'}`, borderRadius: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: confirmAction === 'rejected' ? '#991B1B' : '#92400E' }}>
            {confirmAction === 'create_policy' ? 'Create a policy for this approved application?' : confirmAction === 'approved' ? 'Are you sure you want to approve this application?' : 'Please provide the rejection reason:'}
          </p>
          {confirmAction === 'rejected' && (
            <div style={{ marginBottom: 10 }}>
              <input
                className="input"
                style={{ width: '100%', fontSize: 13, height: 36, padding: '0 10px' }}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant={confirmAction === 'rejected' ? 'danger' : 'primary'} size="sm" onClick={doAction}>Confirm</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Rejection Notice if already rejected */}
      {app.status === 'rejected' && (app.rejectionReason || app.reviewHistory.find(r => r.action === 'Rejected')?.note) && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>Rejection Reason</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#991B1B', fontWeight: 500 }}>
            {app.rejectionReason || app.reviewHistory.find(r => r.action === 'Rejected')?.note}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="details-grid">
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Application ID</p>
          <p style={{ margin: '2px 0', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#168BFF' }}>{app.applicationId}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</p>
          <div style={{ marginTop: 2 }}><SBadge status={app.status} map={APPLICATION_STATUS} /></div>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Customer</p>
          <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600 }}>{app.customerName}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Policy Type</p>
          <p style={{ margin: '2px 0', fontSize: 14 }}>{app.policyType}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Requested Coverage</p>
          <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 700 }}>{formatINR(app.requestedCoverage)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Date Applied</p>
          <p style={{ margin: '2px 0', fontSize: 14 }}>{app.applicationDate}</p>
        </div>
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#168BFF', textTransform: 'uppercase' }}>Associated Documents</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {docs.map(d => (
              <span key={d.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '5px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                {d.type} <SBadge status={d.status} map={DOC_STATUS} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Review history */}
      {app.reviewHistory.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#168BFF', textTransform: 'uppercase' }}>Review History</h4>
          {app.reviewHistory.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#168BFF', marginTop: 6, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#172033' }}>{r.action}</p>
                <p style={{ margin: '2px 0', fontSize: 12.5, color: '#64748B' }}>{r.note}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>{r.date} · {r.reviewer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {app.policyCreated && (
        <p style={{ marginTop: 12, fontSize: 12.5, color: '#10B981', fontWeight: 600 }}>✓ Policy has been created for this application.</p>
      )}
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]
const COLS = [
  { key: 'applicationId',    label: 'Application ID',    sortable: true },
  { key: 'customerName',     label: 'Customer',          sortable: true },
  { key: 'policyType',       label: 'Policy Type',       sortable: true },
  { key: 'requestedCoverage',label: 'Requested Coverage',sortable: true },
  { key: 'applicationDate',  label: 'Applied On',        sortable: true },
  { key: 'status',           label: 'Status',            sortable: true },
  { key: 'actions',          label: 'Actions',           sortable: false },
]

export default function Applications() {
  const navigate = useNavigate()
  const [apps, setApps]             = useState(initialApplications)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [typeFilter, setType]       = useState('')
  const [sortKey, setSortKey]       = useState('applicationDate')
  const [sortDir, setSortDir]       = useState('desc')
  const [page, setPage]             = useState(1)
  const [rowsPerPage, setRows]      = useState(8)
  const [viewApp, setViewApp]       = useState(null)
  const [toast, setToast]           = useState(null)

  const total    = apps.length
  const pending  = apps.filter(a => a.status === 'pending').length
  const approved = apps.filter(a => a.status === 'approved').length
  const rejected = apps.filter(a => a.status === 'rejected').length

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return apps.filter(a => {
      const ms = !q || a.applicationId.toLowerCase().includes(q) || a.customerName.toLowerCase().includes(q) || a.policyType.toLowerCase().includes(q)
      return ms && (!statusFilter || a.status === statusFilter) && (!typeFilter || a.policyTypeId === typeFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [apps, search, statusFilter, typeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter || typeFilter

  function sort(k) { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc') }; setPage(1) }
  function clearFilters() { setSearch(''); setStatus(''); setType(''); setPage(1) }

  function handleStatusChange(appId, action, reason) {
    setApps(prev => prev.map(a => {
      if (a.applicationId !== appId) return a
      if (action === 'create_policy') {
        if (a.policyCreated) { setToast({ message: 'Policy already created for this application.', type: 'error' }); return a }
        setToast({ message: `Demo policy creation triggered for ${a.applicationId}. In production this would generate a real policy.`, type: 'success' })
        return { ...a, policyCreated: true, reviewHistory: [...a.reviewHistory, { date: new Date().toISOString().split('T')[0], action: 'Policy Created', note: 'Demo policy record created.', reviewer: 'Admin' }] }
      }
      const note = action === 'rejected' ? (reason || 'Application rejected by admin.') : 'Application approved by admin.'
      setToast({ message: `Application ${appId} ${action}.`, type: 'success' })
      return {
        ...a,
        status: action,
        rejectionReason: action === 'rejected' ? note : a.rejectionReason,
        reviewHistory: [...a.reviewHistory, { date: new Date().toISOString().split('T')[0], action: action === 'approved' ? 'Approved' : 'Rejected', note, reviewer: 'Admin' }]
      }
    }))
  }

  return (
    <div>
      <PageHeader title="Insurance Applications" subtitle="Review, approve, and manage insurance applications." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard icon={FileStack}    color="#168BFF" bg="#EFF6FF" label="Total"    value={total}    note="All applications" />
        <KPICard icon={Clock}        color="#F59E0B" bg="#FFFBEB" label="Pending"  value={pending}  note="Awaiting review" />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Approved" value={approved} note="Ready for policy" />
        <KPICard icon={XCircle}      color="#EF4444" bg="#FEF2F2" label="Rejected" value={rejected} note="Not approved" />
      </div>

      <Card style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }} placeholder="Search ID, customer, type…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={() => {}} aria-label="Filters">
            Filters
          </Button>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 150 }} value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Statuses</option>
            {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 160 }} value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {initialPolicyTypes.map(t => <option key={t.typeId} value={t.typeId}>{t.name}</option>)}
          </select>
        </div>
      </Card>

      <Card padding={false}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Showing <strong style={{ color: '#172033' }}>{filtered.length}</strong> application{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12.5, color: '#64748B' }}>Rows:</label>
            <select className="select" style={{ height: 32, fontSize: 12.5, width: 70 }} value={rowsPerPage} onChange={e => { setRows(Number(e.target.value)); setPage(1) }}>
              {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
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
                <tr><td colSpan={COLS.length} style={{ padding: 0 }}><EmptyState title="No applications" description={hasFilters ? 'No results match.' : 'No applications yet.'} /></td></tr>
              ) : pageRows.map(a => (
                <tr key={a.applicationId} style={{ cursor: 'pointer' }} onClick={() => setViewApp(a)}>
                  <td style={{ fontWeight: 600, color: '#168BFF', fontFamily: 'monospace', fontSize: 12.5 }}>{a.applicationId}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={a.customerName} /><span style={{ fontWeight: 600, fontSize: 13 }}>{a.customerName}</span></div></td>
                  <td style={{ fontSize: 13 }}>{a.policyType}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(a.requestedCoverage)}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{a.applicationDate}</td>
                  <td><SBadge status={a.status} map={APPLICATION_STATUS} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewApp(a)} aria-label="View"><Eye size={16} /></button>
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((a, n, i, arr) => { if (i > 0 && n - arr[i-1] > 1) a.push('…'); a.push(n); return a }, [])
                .map((n, i) => n === '…' ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#94A3B8' }}>…</span>
                  : <button key={n} className={`btn btn-sm ${n === safePage ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(n)} style={{ minWidth: 32 }}>{n}</button>)}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </Card>

      <AppDetailModal open={!!viewApp} onClose={() => setViewApp(null)} app={viewApp} onStatusChange={handleStatusChange} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
