import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart, Users, Shield, Plus, Search as SearchIcon,
  SlidersHorizontal, X, Edit2, Trash2, Phone, Mail,
  AlertCircle, CheckCircle2, Percent,
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
  initialBeneficiaries, RELATIONSHIP_OPTIONS,
  generateBeneficiaryId, getPolicyTotalAllocation,
} from '../data/beneficiaryData'
import { initialPolicies } from '../data/policyData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ───────────────────────────────────────────────────
function Avatar({ name, size = 30 }) {
  const p = (name || '').split(' ')
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

// ── Add / Edit Beneficiary Modal with Collective 100% Validation ──
function BeneficiaryFormModal({ open, onClose, onSubmit, initialValues, allBeneficiaries }) {
  const isEdit = !!initialValues
  const [fields, setFields] = useState({
    name: '', policyId: '', relationship: RELATIONSHIP_OPTIONS[0],
    allocation: '100', phone: '', email: '', dateOfBirth: '1995-01-01',
    idProofType: 'Aadhaar', idProofNumber: '', address: '',
  })
  const [errors, setErrors] = useState({})

  useState(() => {
    if (initialValues) {
      setFields({
        name: initialValues.name || '',
        policyId: initialValues.policyId || '',
        relationship: initialValues.relationship || RELATIONSHIP_OPTIONS[0],
        allocation: String(initialValues.allocation || '100'),
        phone: initialValues.phone || '',
        email: initialValues.email || '',
        dateOfBirth: initialValues.dateOfBirth || '1995-01-01',
        idProofType: initialValues.idProofType || 'Aadhaar',
        idProofNumber: initialValues.idProofNumber || '',
        address: initialValues.address || '',
      })
    } else {
      setFields({
        name: '', policyId: initialPolicies[0]?.policyId || '',
        relationship: RELATIONSHIP_OPTIONS[0], allocation: '50',
        phone: '', email: '', dateOfBirth: '1995-01-01',
        idProofType: 'Aadhaar', idProofNumber: '', address: '',
      })
    }
  }, [initialValues, open])

  function set(k, v) {
    setFields(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  // Calculate current allocation used by OTHER beneficiaries for this policy
  const currentUsedAllocation = useMemo(() => {
    if (!fields.policyId) return 0
    return getPolicyTotalAllocation(allBeneficiaries, fields.policyId, initialValues?.beneficiaryId)
  }, [allBeneficiaries, fields.policyId, initialValues])

  const maxAllowedAllocation = Math.max(0, 100 - currentUsedAllocation)

  function handleSubmit() {
    const e = {}
    if (!fields.name.trim()) e.name = 'Beneficiary name is required.'
    if (!fields.policyId) e.policyId = 'Please select a policy.'
    if (!fields.relationship) e.relationship = 'Please select relationship.'
    if (!fields.phone.trim()) e.phone = 'Phone number is required.'

    const allocNum = Number(fields.allocation)
    if (isNaN(allocNum) || allocNum <= 0 || allocNum > 100) {
      e.allocation = 'Allocation must be a percentage between 1 and 100.'
    } else if (currentUsedAllocation + allocNum > 100) {
      e.allocation = `Collective allocations for this policy cannot exceed 100%. Currently used: ${currentUsedAllocation}%. Maximum allowed for this beneficiary: ${maxAllowedAllocation}%.`
    }

    if (Object.keys(e).length) { setErrors(e); return }

    const policy = initialPolicies.find(p => p.policyId === fields.policyId)

    onSubmit({
      ...initialValues,
      beneficiaryId: initialValues?.beneficiaryId || generateBeneficiaryId(),
      name: fields.name.trim(),
      policyId: fields.policyId,
      policyNumber: policy?.policyNumber || 'POL-UNKNOWN',
      policyType: policy?.policyType || 'General',
      customerId: policy?.customerId || 'CUST-UNKNOWN',
      customerName: policy?.customerName || 'Customer',
      relationship: fields.relationship,
      allocation: allocNum,
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      dateOfBirth: fields.dateOfBirth,
      idProofType: fields.idProofType,
      idProofNumber: fields.idProofNumber.trim(),
      address: fields.address.trim(),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Beneficiary' : 'Add Policy Beneficiary'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add Beneficiary'}</Button>
      </>}>

      {/* Allocation policy notice */}
      <div style={{ padding: '8px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, marginBottom: 14, fontSize: 12.5, color: '#0369A1' }}>
        ℹ️ <strong>Allocation Rule:</strong> Total beneficiary allocation across a single policy cannot exceed 100%.
        Currently assigned to other beneficiaries for this policy: <strong>{currentUsedAllocation}%</strong> (Remaining available: <strong>{maxAllowedAllocation}%</strong>).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Associated Policy *</label>
          <select className={`select${errors.policyId ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.policyId} onChange={e => set('policyId', e.target.value)}>
            {initialPolicies.map(p => (
              <option key={p.policyId} value={p.policyId}>
                {p.policyNumber} — {p.customerName} ({p.policyType})
              </option>
            ))}
          </select>
          {errors.policyId && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.policyId}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Beneficiary Full Name *</label>
          <input className={`input${errors.name ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="e.g. Anjali Mehta" value={fields.name} onChange={e => set('name', e.target.value)} />
          {errors.name && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.name}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Relationship to Policyholder *</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.relationship} onChange={e => set('relationship', e.target.value)}>
            {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Allocation Share (%) *</label>
          <input type="number" min="1" max="100" className={`input${errors.allocation ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.allocation} onChange={e => set('allocation', e.target.value)} />
          {errors.allocation && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.allocation}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Phone Number *</label>
          <input className={`input${errors.phone ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            placeholder="+91 98765 43210" value={fields.phone} onChange={e => set('phone', e.target.value)} />
          {errors.phone && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.phone}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Email Address</label>
          <input type="email" className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="beneficiary@email.com" value={fields.email} onChange={e => set('email', e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Date of Birth</label>
          <input type="date" className="input" style={{ height: 38, fontSize: 13 }}
            value={fields.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>ID Proof Type</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.idProofType} onChange={e => set('idProofType', e.target.value)}>
            <option value="Aadhaar">Aadhaar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="Passport">Passport</option>
            <option value="Birth Certificate">Birth Certificate</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>ID Proof Number</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="e.g. XXXX-XXXX-1234" value={fields.idProofNumber} onChange={e => set('idProofNumber', e.target.value)} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Residential Address</label>
          <input className="input" style={{ height: 38, fontSize: 13 }}
            placeholder="Street address, city, state" value={fields.address} onChange={e => set('address', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]

export default function Beneficiaries() {
  const navigate = useNavigate()
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries)
  const [search, setSearch]               = useState('')
  const [relFilter, setRelFilter]         = useState('')
  const [sortKey, setSortKey]             = useState('allocation')
  const [sortDir, setSortDir]             = useState('desc')
  const [page, setPage]                   = useState(1)
  const [rowsPerPage, setRowsPerPage]     = useState(8)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingBen, setEditingBen]       = useState(null)
  const [toast, setToast]                 = useState(null)

  // KPIs
  const totalBeneficiaries = beneficiaries.length
  const uniquePolicies     = new Set(beneficiaries.map(b => b.policyId)).size
  const primaryBeneficiaries = beneficiaries.filter(b => b.allocation >= 50).length
  const avgAllocation      = Math.round(beneficiaries.reduce((acc, b) => acc + b.allocation, 0) / (totalBeneficiaries || 1))

  // Filtering + Sorting
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return beneficiaries.filter(b => {
      const ms = !q || b.name.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || b.policyNumber.toLowerCase().includes(q) || b.beneficiaryId.toLowerCase().includes(q)
      return ms && (!relFilter || b.relationship === relFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [beneficiaries, search, relFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || relFilter

  function sort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  function clearFilters() { setSearch(''); setRelFilter(''); setPage(1) }

  function handleSaveBeneficiary(data) {
    if (editingBen) {
      setBeneficiaries(prev => prev.map(b => b.beneficiaryId === data.beneficiaryId ? data : b))
      setToast({ message: `Beneficiary ${data.name} updated successfully.`, type: 'success' })
    } else {
      setBeneficiaries(prev => [data, ...prev])
      setToast({ message: `Beneficiary ${data.name} linked with ${data.allocation}% allocation.`, type: 'success' })
    }
  }

  function handleDeleteBeneficiary(id) {
    setBeneficiaries(prev => prev.filter(b => b.beneficiaryId !== id))
    setToast({ message: 'Beneficiary removed.', type: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Policy Beneficiaries"
        subtitle="Manage nominated beneficiaries, familial relationships, and claim allocation percentages across policies."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingBen(null); setModalOpen(true) }}>
            Add Beneficiary
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon={Heart} color="#168BFF" bg="#EFF6FF" label="Total Beneficiaries" value={totalBeneficiaries} note="Nominees on record" />
        <KPICard icon={Shield} color="#10B981" bg="#F0FDF4" label="Covered Policies" value={uniquePolicies} note="Policies with nominees" />
        <KPICard icon={CheckCircle2} color="#8B5CF6" bg="#F5F3FF" label="Primary Nominees" value={primaryBeneficiaries} note="Allocation ≥ 50%" />
        <KPICard icon={Percent} color="#F59E0B" bg="#FFFBEB" label="Avg. Allocation" value={`${avgAllocation}%`} note="Per named beneficiary" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search beneficiary, policyholder, policy no..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="select"
            style={{ height: 36, fontSize: 12.5, minWidth: 160 }}
            value={relFilter}
            onChange={e => { setRelFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Relationships</option>
            {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No beneficiaries found"
            description={hasFilters ? 'No nominees match your current filters.' : 'No beneficiaries have been added yet.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Beneficiary ID</th>
                    <th>Nominee Name</th>
                    <th>Customer (Policyholder)</th>
                    <th>Policy Number</th>
                    <th>Relationship</th>
                    <th>Contact Info</th>
                    <th onClick={() => sort('allocation')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Allocation <SortIcon col="allocation" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(b => (
                    <tr key={b.beneficiaryId}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#168BFF' }}>
                        {b.beneficiaryId}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={b.name} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#172033' }}>{b.name}</p>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>DOB: {b.dateOfBirth}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{b.customerName}</p>
                        <span style={{ fontSize: 11.5, color: '#64748B', fontFamily: 'monospace' }}>{b.customerId}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#168BFF', fontWeight: 600 }}>
                          {b.policyNumber}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748B' }}>{b.policyType}</span>
                      </td>
                      <td>
                        <Badge variant="blue">{b.relationship}</Badge>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} style={{ color: '#94A3B8' }} /> {b.phone}
                          </div>
                          {b.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Mail size={11} style={{ color: '#94A3B8' }} /> {b.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 44, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${b.allocation}%`, height: '100%', background: b.allocation === 100 ? '#10B981' : '#168BFF' }} />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: b.allocation === 100 ? '#10B981' : '#172033' }}>
                            {b.allocation}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit2}
                            onClick={() => { setEditingBen(b); setModalOpen(true) }}
                            aria-label="Edit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteBeneficiary(b.beneficiaryId)}
                            aria-label="Delete"
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

      {/* Add / Edit Beneficiary Modal */}
      {modalOpen && (
        <BeneficiaryFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingBen(null) }}
          onSubmit={handleSaveBeneficiary}
          initialValues={editingBen}
          allBeneficiaries={beneficiaries}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
