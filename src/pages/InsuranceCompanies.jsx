import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Shield, Users, Plus, Search as SearchIcon,
  SlidersHorizontal, X, Eye, Edit2, Phone, Mail, Globe,
  MapPin, Award, CheckCircle2,
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
  initialCompanies, COMPANY_STATUS,
  generateCompanyId, formatINR,
} from '../data/companyData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ status }) {
  const c = COMPANY_STATUS[status] || { label: status, variant: 'gray' }
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

// ── Add / Edit Company Form Modal ─────────────────────────────
function CompanyFormModal({ open, onClose, onSubmit, initialValues }) {
  const isEdit = !!initialValues
  const [fields, setFields] = useState({
    name: '', registrationNumber: '', category: 'Health & Medical',
    phone: '', email: '', website: '', address: '', city: '',
    state: '', postalCode: '', status: 'active', rating: 'AAA',
    description: '',
  })
  const [errors, setErrors] = useState({})

  useState(() => {
    if (initialValues) {
      setFields({
        name: initialValues.name || '',
        registrationNumber: initialValues.registrationNumber || '',
        category: initialValues.category || 'Health & Medical',
        phone: initialValues.phone || '',
        email: initialValues.email || '',
        website: initialValues.website || '',
        address: initialValues.address || '',
        city: initialValues.city || '',
        state: initialValues.state || '',
        postalCode: initialValues.postalCode || '',
        status: initialValues.status || 'active',
        rating: initialValues.rating || 'AAA',
        description: initialValues.description || '',
      })
    } else {
      setFields({
        name: '', registrationNumber: `IRDAI/NL-${Math.floor(10 + Math.random() * 90)}/2024`,
        category: 'Health & Medical', phone: '', email: '', website: '',
        address: '', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001',
        status: 'active', rating: 'AAA', description: '',
      })
    }
  }, [initialValues, open])

  function set(k, v) {
    setFields(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleSubmit() {
    const e = {}
    if (!fields.name.trim()) e.name = 'Company name is required.'
    if (!fields.registrationNumber.trim()) e.registrationNumber = 'IRDAI registration number is required.'
    if (!fields.phone.trim()) e.phone = 'Phone number is required.'
    if (!fields.email.trim() || !fields.email.includes('@')) e.email = 'Valid contact email is required.'
    if (!fields.city.trim()) e.city = 'City is required.'

    if (Object.keys(e).length) { setErrors(e); return }

    onSubmit({
      ...initialValues,
      companyId: initialValues?.companyId || generateCompanyId(),
      name: fields.name.trim(),
      registrationNumber: fields.registrationNumber.trim(),
      category: fields.category,
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      website: fields.website.trim() || 'https://insurex.demo',
      address: fields.address.trim(),
      city: fields.city.trim(),
      state: fields.state.trim() || 'India',
      postalCode: fields.postalCode.trim(),
      status: fields.status,
      rating: fields.rating,
      description: fields.description.trim(),
      activePoliciesCount: initialValues?.activePoliciesCount ?? 0,
      associatedAgentsCount: initialValues?.associatedAgentsCount ?? 0,
      portfolioValue: initialValues?.portfolioValue ?? 0,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Underwriter Company' : 'Register Insurance Carrier / Partner'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Register Carrier'}</Button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Company Name *</label>
          <input className={`input${errors.name ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="e.g. Star Health & Allied Insurance Co." value={fields.name} onChange={e => set('name', e.target.value)} />
          {errors.name && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.name}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>IRDAI Registration No. *</label>
          <input className={`input${errors.registrationNumber ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="IRDAI/NL-XX/YYYY" value={fields.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} />
          {errors.registrationNumber && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.registrationNumber}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Insurance Category</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.category} onChange={e => set('category', e.target.value)}>
            <option value="Health & Medical">Health & Medical</option>
            <option value="General & Motor">General & Motor</option>
            <option value="Life & Pension">Life & Pension</option>
            <option value="Speciality & Travel">Speciality & Travel</option>
            <option value="Commercial & Cyber">Commercial & Cyber</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Contact Phone *</label>
          <input className={`input${errors.phone ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="+91 22 1234 5678" value={fields.phone} onChange={e => set('phone', e.target.value)} />
          {errors.phone && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.phone}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Corporate Email *</label>
          <input type="email" className={`input${errors.email ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="partners@carrier.insure" value={fields.email} onChange={e => set('email', e.target.value)} />
          {errors.email && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.email}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Website</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="https://company.insure" value={fields.website} onChange={e => set('website', e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Credit / Solvency Rating</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="e.g. AAA (Stable)" value={fields.rating} onChange={e => set('rating', e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>City *</label>
          <input className={`input${errors.city ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.city} onChange={e => set('city', e.target.value)} />
          {errors.city && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.city}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>State</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            value={fields.state} onChange={e => set('state', e.target.value)} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Head Office Address</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="Building, street, district" value={fields.address} onChange={e => set('address', e.target.value)} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Underwriting Profile Description</label>
          <textarea className="input" rows={3} style={{ width: '100%', fontSize: 13, padding: 8 }}
            placeholder="Overview of carrier network, claims turnaround, and authorized lines..."
            value={fields.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ── Company Details View Modal ────────────────────────────────
function CompanyDetailsModal({ open, onClose, company }) {
  if (!company) return null
  return (
    <Modal open={open} onClose={onClose} title={company.name} size="lg"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div>
            <span style={{ fontSize: 12, color: '#64748B' }}>IRDAI Registration</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: '#168BFF' }}>{company.registrationNumber}</p>
          </div>
          <SBadge status={company.status} />
        </div>

        <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Underwritten Policies</span>
          <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 18, color: '#172033' }}>{company.activePoliciesCount}</p>
        </div>
        <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Associated Agent Force</span>
          <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 18, color: '#168BFF' }}>{company.associatedAgentsCount}</p>
        </div>

        <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Contact Phone</span>
          <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 13 }}>{company.phone}</p>
        </div>
        <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Support Email</span>
          <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 13 }}>{company.email}</p>
        </div>

        <div style={{ gridColumn: '1/-1', padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Corporate Headquarters</span>
          <p style={{ margin: '4px 0 0', fontWeight: 500, fontSize: 13 }}>{company.address}, {company.city}, {company.state} {company.postalCode}</p>
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Carrier Overview</p>
          <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{company.description}</p>
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]

export default function InsuranceCompanies() {
  const navigate = useNavigate()
  const [companies, setCompanies]     = useState(initialCompanies)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [sortKey, setSortKey]         = useState('activePoliciesCount')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingComp, setEditingComp] = useState(null)
  const [detailsComp, setDetailsComp] = useState(null)
  const [toast, setToast]             = useState(null)

  // KPIs
  const totalCompanies   = companies.length
  const activePartners   = companies.filter(c => c.status === 'active').length
  const totalUnderwritten = companies.reduce((s, c) => s + (c.activePoliciesCount || 0), 0)
  const totalAgentsCount  = companies.reduce((s, c) => s + (c.associatedAgentsCount || 0), 0)

  // Filtering + Sorting
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return companies.filter(c => {
      const ms = !q || c.name.toLowerCase().includes(q) || c.registrationNumber.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      return ms && (!statusFilter || c.status === statusFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [companies, search, statusFilter, sortKey, sortDir])

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

  function handleSaveCompany(compData) {
    if (editingComp) {
      setCompanies(prev => prev.map(c => c.companyId === compData.companyId ? compData : c))
      setToast({ message: `Carrier ${compData.name} updated.`, type: 'success' })
    } else {
      setCompanies(prev => [compData, ...prev])
      setToast({ message: `Carrier ${compData.name} registered successfully.`, type: 'success' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Insurance Companies"
        subtitle="Underwriter network, primary insurance carriers, regulatory IRDAI registrations, and portfolio distribution."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingComp(null); setModalOpen(true) }}>
            Add Company
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon={Building2} color="#168BFF" bg="#EFF6FF" label="Insurance Carriers" value={totalCompanies} note="Authorized underwriters" />
        <KPICard icon={CheckCircle2} color="#10B981" bg="#F0FDF4" label="Active Partners" value={activePartners} note="Currently binding risk" />
        <KPICard icon={Shield} color="#8B5CF6" bg="#F5F3FF" label="Policies Bound" value={totalUnderwritten} note="Total policies underwritten" />
        <KPICard icon={Users} color="#F59E0B" bg="#FFFBEB" label="Associated Agents" value={totalAgentsCount} note="Licensed field force" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search company, IRDAI registration, city, line..."
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
            {Object.entries(COMPANY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No insurance companies found"
            description={hasFilters ? 'No carriers match your filter criteria.' : 'No insurance companies registered yet.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Registration No.</th>
                    <th>Headquarters</th>
                    <th>Contact Information</th>
                    <th onClick={() => sort('activePoliciesCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Policies <SortIcon col="activePoliciesCount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th onClick={() => sort('associatedAgentsCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Agents <SortIcon col="associatedAgentsCount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(c => (
                    <tr key={c.companyId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={18} style={{ color: '#168BFF' }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#172033' }}>{c.name}</p>
                            <span style={{ fontSize: 11.5, color: '#64748B' }}>{c.category}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                          {c.registrationNumber}
                        </span>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontSize: 13, color: '#172033' }}>{c.city}, {c.state}</p>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>PIN: {c.postalCode}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          <div>{c.phone}</div>
                          <div style={{ color: '#168BFF', marginTop: 2 }}>{c.email}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#168BFF' }}>
                        {c.activePoliciesCount}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
                        {c.associatedAgentsCount}
                      </td>
                      <td>
                        <SBadge status={c.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => setDetailsComp(c)}
                            aria-label="View Details"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit2}
                            onClick={() => { setEditingComp(c); setModalOpen(true) }}
                            aria-label="Edit Carrier"
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <CompanyFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingComp(null) }}
          onSubmit={handleSaveCompany}
          initialValues={editingComp}
        />
      )}

      {/* Details Modal */}
      {detailsComp && (
        <CompanyDetailsModal
          open={!!detailsComp}
          onClose={() => setDetailsComp(null)}
          company={detailsComp}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
