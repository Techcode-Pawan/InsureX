import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserCheck, Users, Shield, AlertCircle, Plus, Search as SearchIcon,
  SlidersHorizontal, X, Eye, Edit2, Phone, Mail, Award,
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
  initialAgents, AGENT_STATUS, SPECIALIZATIONS, REGIONS,
  generateAgentId, formatINR,
} from '../data/agentData'
import { avatarColor, initials } from '../data/customerData'

// ── Helpers ───────────────────────────────────────────────────
function SBadge({ status }) {
  const c = AGENT_STATUS[status] || { label: status, variant: 'gray' }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}

function Avatar({ name, size = 32 }) {
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

// ── Add / Edit Agent Modal ────────────────────────────────────
function AgentFormModal({ open, onClose, onSubmit, initialValues }) {
  const isEdit = !!initialValues
  const [fields, setFields] = useState({
    firstName: '', lastName: '', email: '', phone: '', city: '', region: REGIONS[0],
    licenseNumber: '', specialization: SPECIALIZATIONS[0], status: 'active',
    commissionRate: '8.0', bio: '',
  })
  const [errors, setErrors] = useState({})

  // Update on open / initialValues change
  useState(() => {
    if (initialValues) {
      setFields({
        firstName: initialValues.firstName || '',
        lastName: initialValues.lastName || '',
        email: initialValues.email || '',
        phone: initialValues.phone || '',
        city: initialValues.city || '',
        region: initialValues.region || REGIONS[0],
        licenseNumber: initialValues.licenseNumber || '',
        specialization: initialValues.specialization || SPECIALIZATIONS[0],
        status: initialValues.status || 'active',
        commissionRate: String(initialValues.commissionRate || '8.0'),
        bio: initialValues.bio || '',
      })
    } else {
      setFields({
        firstName: '', lastName: '', email: '', phone: '', city: '', region: REGIONS[0],
        licenseNumber: `IRDAI-AG-${Math.floor(10000 + Math.random() * 90000)}`,
        specialization: SPECIALIZATIONS[0], status: 'active',
        commissionRate: '8.0', bio: '',
      })
    }
  }, [initialValues, open])

  function set(k, v) {
    setFields(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleSubmit() {
    const e = {}
    if (!fields.firstName.trim()) e.firstName = 'First name is required.'
    if (!fields.lastName.trim()) e.lastName = 'Last name is required.'
    if (!fields.email.trim() || !fields.email.includes('@')) e.email = 'Valid email is required.'
    if (!fields.phone.trim()) e.phone = 'Phone number is required.'
    if (!fields.licenseNumber.trim()) e.licenseNumber = 'IRDAI license number is required.'
    if (!fields.city.trim()) e.city = 'City is required.'

    if (Object.keys(e).length) { setErrors(e); return }

    onSubmit({
      ...initialValues,
      agentId: initialValues?.agentId || generateAgentId(),
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      city: fields.city.trim(),
      region: fields.region,
      licenseNumber: fields.licenseNumber.trim(),
      specialization: fields.specialization,
      status: fields.status,
      commissionRate: Number(fields.commissionRate) || 8.0,
      joiningDate: initialValues?.joiningDate || new Date().toISOString().split('T')[0],
      assignedCustomersCount: initialValues?.assignedCustomersCount ?? 0,
      assignedPoliciesCount: initialValues?.assignedPoliciesCount ?? 0,
      assignedClaimsCount: initialValues?.assignedClaimsCount ?? 0,
      rating: initialValues?.rating ?? 4.8,
      bio: fields.bio.trim(),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Agent Profile' : 'Register New Insurance Agent'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Register Agent'}</Button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>First Name *</label>
          <input className={`input${errors.firstName ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.firstName} onChange={e => set('firstName', e.target.value)} placeholder="e.g. Rahul" />
          {errors.firstName && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.firstName}</span>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Last Name *</label>
          <input className={`input${errors.lastName ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Verma" />
          {errors.lastName && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.lastName}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Email Address *</label>
          <input type="email" className={`input${errors.email ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.email} onChange={e => set('email', e.target.value)} placeholder="agent@insurex.in" />
          {errors.email && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.email}</span>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Phone Number *</label>
          <input className={`input${errors.phone ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 00000" />
          {errors.phone && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.phone}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>IRDAI License No. *</label>
          <input className={`input${errors.licenseNumber ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="IRDAI-AG-XXXXX" />
          {errors.licenseNumber && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.licenseNumber}</span>}
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>City / Location *</label>
          <input className={`input${errors.city ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
            value={fields.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Pune" />
          {errors.city && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 2, display: 'block' }}>{errors.city}</span>}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Territory / Region</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.region} onChange={e => set('region', e.target.value)}>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Specialization</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.specialization} onChange={e => set('specialization', e.target.value)}>
            {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Status</label>
          <select className="select" style={{ height: 38, fontSize: 13 }}
            value={fields.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(AGENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Commission Rate (%)</label>
          <input type="number" step="0.5" className="input" style={{ height: 38, fontSize: 13 }}
            value={fields.commissionRate} onChange={e => set('commissionRate', e.target.value)} placeholder="e.g. 8.5" />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Agent Bio / Experience Summary</label>
          <textarea className="input" style={{ minHeight: 65, fontSize: 13, padding: '8px 10px', resize: 'vertical' }}
            value={fields.bio} onChange={e => set('bio', e.target.value)} placeholder="Brief overview of advisory experience, portfolio specialization..." />
        </div>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════
const ROWS_OPTIONS = [8, 15, 25]

export default function Agents() {
  const navigate = useNavigate()
  const [agentsList, setAgentsList]   = useState(initialAgents)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusF]    = useState('')
  const [regionFilter, setRegionF]    = useState('')
  const [sortKey, setSortKey]         = useState('assignedPoliciesCount')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(8)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [toast, setToast]             = useState(null)

  // KPIs
  const totalAgents   = agentsList.length
  const activeAgents  = agentsList.filter(a => a.status === 'active').length
  const onLeaveAgents = agentsList.filter(a => a.status === 'on_leave').length
  const totalPolicies = agentsList.reduce((acc, a) => acc + (a.assignedPoliciesCount || 0), 0)

  // Filtering + Sorting
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return agentsList.filter(a => {
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase()
      const ms = !q || fullName.includes(q) || a.agentId.toLowerCase().includes(q) || a.licenseNumber.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.specialization.toLowerCase().includes(q)
      return ms && (!statusFilter || a.status === statusFilter) && (!regionFilter || a.region === regionFilter)
    }).sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [agentsList, search, statusFilter, regionFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const hasFilters = search || statusFilter || regionFilter

  function sort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  function clearFilters() { setSearch(''); setStatusF(''); setRegionF(''); setPage(1) }

  function handleSaveAgent(agentData) {
    if (editingAgent) {
      setAgentsList(prev => prev.map(a => a.agentId === agentData.agentId ? agentData : a))
      setToast({ message: `Agent ${agentData.firstName} ${agentData.lastName} updated.`, type: 'success' })
    } else {
      setAgentsList(prev => [agentData, ...prev])
      setToast({ message: `Agent ${agentData.firstName} ${agentData.lastName} registered successfully.`, type: 'success' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Insurance Agents"
        subtitle="Manage licensed agents, territorial assignments, portfolio counts, and commission rates."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingAgent(null); setModalOpen(true) }}>
            Add Agent
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPICard icon={UserCheck} color="#168BFF" bg="#EFF6FF" label="Total Agents" value={totalAgents} note="Registered advisors" />
        <KPICard icon={Users} color="#10B981" bg="#F0FDF4" label="Active Agents" value={activeAgents} note="In active deployment" />
        <KPICard icon={Award} color="#F59E0B" bg="#FFFBEB" label="On Leave" value={onLeaveAgents} note="Temporary absence" />
        <KPICard icon={Shield} color="#6366F1" bg="#F5F3FF" label="Portfolio Cover" value={totalPolicies} note="Assigned policies managed" />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              className="input input-icon-left"
              style={{ height: 36, fontSize: 13 }}
              placeholder="Search name, ID, license no, city..."
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
            {Object.entries(AGENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            className="select"
            style={{ height: 36, fontSize: 12.5, minWidth: 160 }}
            value={regionFilter}
            onChange={e => { setRegionF(e.target.value); setPage(1) }}
          >
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="No agents found"
            description={hasFilters ? 'No agents match your current search/filters.' : 'No agents currently registered.'}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button> : undefined}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th onClick={() => sort('licenseNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        License <SortIcon col="licenseNumber" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Contact Details</th>
                    <th>Specialization / Region</th>
                    <th onClick={() => sort('assignedCustomersCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Customers <SortIcon col="assignedCustomersCount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th onClick={() => sort('assignedPoliciesCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Policies <SortIcon col="assignedPoliciesCount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th onClick={() => sort('assignedClaimsCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Claims <SortIcon col="assignedClaimsCount" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(a => {
                    const fullName = `${a.firstName} ${a.lastName}`
                    return (
                      <tr key={a.agentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/agents/${a.agentId}`)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={fullName} size={34} />
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#172033' }}>{fullName}</p>
                              <span style={{ fontSize: 11.5, color: '#168BFF', fontFamily: 'monospace', fontWeight: 600 }}>{a.agentId}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                            {a.licenseNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12.5, color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Mail size={12} style={{ color: '#94A3B8' }} /> {a.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                              <Phone size={12} style={{ color: '#94A3B8' }} /> {a.phone}
                            </div>
                          </div>
                        </td>
                        <td>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#172033' }}>{a.specialization}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748B' }}>{a.city} • {a.region}</p>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
                          {a.assignedCustomersCount}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#168BFF' }}>
                          {a.assignedPoliciesCount}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: a.assignedClaimsCount > 0 ? '#F59E0B' : '#64748B' }}>
                          {a.assignedClaimsCount}
                        </td>
                        <td>
                          <SBadge status={a.status} />
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => navigate(`/agents/${a.agentId}`)}
                              aria-label="View Details"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit2}
                              onClick={() => { setEditingAgent(a); setModalOpen(true) }}
                              aria-label="Edit Agent"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
        <AgentFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingAgent(null) }}
          onSubmit={handleSaveAgent}
          initialValues={editingAgent}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
