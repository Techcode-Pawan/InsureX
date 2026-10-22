import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive, FileText, CheckCircle2, Clock, AlertCircle, XCircle,
  Search as SearchIcon, SlidersHorizontal, X, Eye, Check,
  HelpCircle, MessageSquare, ExternalLink, Shield, Download,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
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
  initialDocuments, DOCUMENT_TYPES, DOCUMENT_STATUS,
  generateDocId,
} from '../data/documentData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ status }) {
  const c = DOCUMENT_STATUS[status] || { label: status, variant: 'gray' }
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

// ── View Document Metadata & Review Modal ─────────────────────
function DocumentReviewModal({ open, onClose, doc, onUpdateStatus, onSaveNotes }) {
  const [notes, setNotes] = useState(doc?.verificationNotes || '')
  const [actionTab, setActionTab] = useState('metadata') // 'metadata' | 'notes' | 'status'

  useEffect(() => {
    if (doc) {
      setNotes(doc.verificationNotes || '')
      setActionTab('metadata')
    }
  }, [doc])

  if (!doc) return null

  function handleSaveNotes() {
    onSaveNotes(doc.docId, notes)
    onClose()
  }

  function handleStatusChange(newStatus) {
    onUpdateStatus(doc.docId, newStatus, notes)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Document: ${doc.name}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            ID: <strong style={{ fontFamily: 'monospace' }}>{doc.docId}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {/* Notice */}
      <div style={{ padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileText size={16} style={{ color: '#168BFF', flexShrink: 0 }} /> <span><strong>Evidentiary Repository:</strong> Audit tracking for KYC, hospital bills, and incident documentation.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${actionTab === 'metadata' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActionTab('metadata')}>
          Metadata & Details
        </button>
        <button className={`btn btn-sm ${actionTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActionTab('notes')}>
          Verification Notes
        </button>
        <button className={`btn btn-sm ${actionTab === 'status' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActionTab('status')}>
          Update Status
        </button>
      </div>

      {actionTab === 'metadata' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>Document Type</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033' }}>{doc.type}</span>
          </div>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>File Attributes</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033' }}>{doc.fileSize} • {doc.fileFormat}</span>
          </div>

          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>Associated Customer</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033' }}>{doc.customerName} ({doc.customerId})</span>
          </div>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>Linked Reference</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#168BFF', fontFamily: 'monospace' }}>
              {doc.relatedType}: {doc.relatedRef}
            </span>
          </div>

          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>Submitted Date</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#172033' }}>{doc.submissionDate}</span>
          </div>
          <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11.5, color: '#64748B', display: 'block' }}>Verification State</span>
            <SBadge status={doc.status} />
          </div>

          {doc.verifiedBy && (
            <div style={{ gridColumn: '1/-1', padding: 12, background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <span style={{ fontSize: 11.5, color: '#166534', display: 'block' }}>Verified By</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>{doc.verifiedBy} on {doc.verifiedDate}</span>
            </div>
          )}
        </div>
      )}

      {actionTab === 'notes' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Assessor / Compliance Verification Notes
          </label>
          <textarea
            className="input"
            rows={5}
            style={{ width: '100%', fontSize: 13, padding: 10, resize: 'vertical' }}
            placeholder="Document discrepancies, authenticated seal numbers, hospital verification remarks..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" size="sm" onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </div>
        </div>
      )}

      {actionTab === 'status' && (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
            Update the verification lifecycle status for this evidentiary record:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <button
              onClick={() => handleStatusChange('verified')}
              style={{
                padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
                textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Mark as Verified
              </span>
              <span style={{ fontSize: 11.5, color: '#15803D' }}>Document is authentic & satisfies underwriting criteria.</span>
            </button>

            <button
              onClick={() => handleStatusChange('needs_info')}
              style={{
                padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
                textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={16} /> Needs Info
              </span>
              <span style={{ fontSize: 11.5, color: '#1D4ED8' }}>Customer or provider must supply clearer copy or seal.</span>
            </button>

            <button
              onClick={() => handleStatusChange('rejected')}
              style={{
                padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} /> Reject Document
              </span>
              <span style={{ fontSize: 11.5, color: '#B91C1C' }}>Fraudulent, expired, or irrelevant document.</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]

export default function Documents() {
  const navigate = useNavigate()
  const [documents, setDocuments]   = useState(initialDocuments)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusF]  = useState('')
  const [typeFilter, setTypeF]      = useState('')
  const [sortKey, setSortKey]       = useState('submissionDate')
  const [sortDir, setSortDir]       = useState('desc')
  const [page, setPage]             = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [toast, setToast]           = useState(null)

  // ── Sync with PostgreSQL Backend ────────────────────────
  useEffect(() => {
    let isMounted = true
    async function loadDocuments() {
      try {
        const res = await insuranceService.getDocuments({ limit: 50 })
        const list = res?.data?.data || res?.data || []
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped = list.map(d => ({
            ...d,
            docId: d.documentNumber || d.docId || d.id,
            name: d.name || 'Evidentiary Document',
            type: d.documentType ? String(d.documentType).toLowerCase() : 'other',
            customerName: d.customer
              ? `${d.customer.firstName} ${d.customer.lastName}`
              : (d.customerName || 'Policyholder'),
            relatedRef: d.policy?.policyNumber || d.claim?.claimNumber || d.relatedRef || 'POL-REF',
            fileSize: d.fileSize || '1.8 MB',
            submissionDate: d.submissionDate ? String(d.submissionDate).split('T')[0] : '2025-01-01',
            status: (d.verificationStatus || 'PENDING').toLowerCase(),
            verifiedBy: d.verifiedBy || 'System Assessor',
            verificationNotes: d.verificationNotes || '',
          }))
          const existingIds = new Set(mapped.map(m => m.docId))
          const rest = initialDocuments.filter(m => !existingIds.has(m.docId))
          setDocuments([...mapped, ...rest])
        }
      } catch (err) {
        console.warn('Live documents sync note:', err.message)
      }
    }
    loadDocuments()
    return () => { isMounted = false }
  }, [])

  // KPIs
  const totalDocs   = documents.length
  const verified    = documents.filter(d => d.status === 'verified').length
  const pending     = documents.filter(d => d.status === 'pending').length
  const needsInfo   = documents.filter(d => d.status === 'needs_info').length

  // Filter & Sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return documents.filter(d => {
      const ms = !q || d.name.toLowerCase().includes(q) || d.docId.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.relatedRef.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
      return ms && (!statusFilter || d.status === statusFilter) && (!typeFilter || d.type === typeFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [documents, search, statusFilter, typeFilter, sortKey, sortDir])

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

  function handleUpdateStatus(docId, newStatus, currentNotes) {
    const today = new Date().toISOString().split('T')[0]
    setDocuments(prev => prev.map(d => {
      if (d.docId !== docId) return d
      return {
        ...d,
        status: newStatus,
        verificationNotes: currentNotes || d.verificationNotes,
        verifiedBy: newStatus === 'verified' ? 'Admin Compliance' : d.verifiedBy,
        verifiedDate: newStatus === 'verified' ? today : d.verifiedDate,
      }
    }))
    setToast({ message: `Document ${docId} status set to ${newStatus.replace('_', ' ').toUpperCase()}.`, type: 'success' })
  }

  function handleSaveNotes(docId, newNotes) {
    setDocuments(prev => prev.map(d => d.docId === docId ? { ...d, verificationNotes: newNotes } : d))
    setToast({ message: `Verification notes updated for ${docId}.`, type: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Document Management"
        subtitle="Repository of customer KYC, medical records, surveyor reports, FIRs, and claim evidentiary documentation."
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon={Archive} color="#168BFF" bg="#EFF6FF" label="Total Files" value={totalDocs} note="Submissions tracked" />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Verified" value={verified} note="Compliance approved" />
        <KPICard icon={Clock} color="#F59E0B" bg="#FFFBEB" label="Pending" value={pending} note="Awaiting review" />
        <KPICard icon={HelpCircle} color="#6366F1" bg="#F5F3FF" label="Needs Info" value={needsInfo} note="Additional copy requested" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search filename, customer, policy, claim ref..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="select"
            style={{ height: 36, fontSize: 12.5, minWidth: 140 }}
            value={statusFilter}
            onChange={e => { setStatusF(e.target.value); setPage(1) }}
          >
            <option value="">All Statuses</option>
            {Object.entries(DOCUMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            className="select"
            style={{ height: 36, fontSize: 12.5, minWidth: 180 }}
            value={typeFilter}
            onChange={e => { setTypeF(e.target.value); setPage(1) }}
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No documents found"
            description={hasFilters ? 'No files match your current filters.' : 'No documents have been logged yet.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc ID</th>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th>Related Policy / Claim</th>
                    <th onClick={() => sort('submissionDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Submitted <SortIcon col="submissionDate" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(doc => (
                    <tr key={doc.docId}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#168BFF' }}>
                        {doc.docId}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={15} style={{ color: '#168BFF' }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#172033' }}>{doc.name}</p>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{doc.fileSize} • {doc.fileFormat}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#475569' }}>
                        {doc.type}
                      </td>
                      <td>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{doc.customerName}</p>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{doc.customerId}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#168BFF', fontWeight: 600 }}>
                          {doc.relatedRef}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748B' }}>({doc.relatedType})</span>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>
                        {doc.submissionDate}
                      </td>
                      <td>
                        <SBadge status={doc.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Eye}
                            onClick={() => setSelectedDoc(doc)}
                          >
                            Review
                          </Button>
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

      {/* Review & Verification Modal */}
      <DocumentReviewModal
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        doc={selectedDoc}
        onUpdateStatus={handleUpdateStatus}
        onSaveNotes={handleSaveNotes}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
