import { useState, useMemo, useEffect } from 'react'
import {
  Search, Plus, X, Pencil, Eye, MoreVertical,
  Shield, Heart, Car, Home, Plane, Package,
  ChevronRight, SlidersHorizontal,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'

import {
  initialPolicyTypes, initialPolicies, countPoliciesByType,
} from '../data/policyData'

// ── Icon map ─────────────────────────────────────────────────
const ICON_MAP = { Shield, Heart, Car, Home, Plane, Package }
const ICON_COLORS = {
  Shield: { color: '#168BFF', bg: '#EFF6FF' },
  Heart:  { color: '#EF4444', bg: '#FEF2F2' },
  Car:    { color: '#F59E0B', bg: '#FFFBEB' },
  Home:   { color: '#10B981', bg: '#F0FDF4' },
  Plane:  { color: '#6366F1', bg: '#F5F3FF' },
  Package:{ color: '#64748B', bg: '#F1F5F9' },
}

// ── Type form validation ─────────────────────────────────────
function validateType(f) {
  const e = {}
  if (!f.name?.trim()) e.name = 'Name is required.'
  if (!f.code?.trim()) e.code = 'Code is required.'
  if (!f.description?.trim()) e.description = 'Description is required.'
  return e
}

const EMPTY_TYPE = {
  name: '', code: '', description: '', coverageDetails: '',
  eligibility: '', terms: '', status: 'active', icon: 'Shield',
}

const ICON_OPTIONS = Object.keys(ICON_MAP)

// ── Type Form Modal ──────────────────────────────────────────
function TypeFormModal({ open, onClose, onSubmit, editData = null }) {
  const isEdit = !!editData
  const [fields, setFields] = useState(EMPTY_TYPE)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFields(editData ? { ...EMPTY_TYPE, ...editData } : EMPTY_TYPE)
      setErrors({})
    }
  }, [open, editData])

  function set(key, val) {
    setFields(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    const errs = validateType(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 400))
    onSubmit(fields)
    setSubmitting(false)
    onClose()
  }

  function Field({ label, required, error, children }) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#172033', marginBottom: 5 }}>
          {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        </label>
        {children}
        {error && <p role="alert" style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>}
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Policy Type' : 'Add Policy Type'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" size="sm" loading={submitting} onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Add Type'}
        </Button>
      </>}
    >
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#94A3B8', padding: '7px 11px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        ℹ️ Demo form — changes are local only.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', marginBottom: 14 }}>
          <Field label="Type Name" required error={errors.name}>
            <input className={`input${errors.name ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              placeholder="Life Insurance" value={fields.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Code" required error={errors.code}>
            <input className={`input${errors.code ? ' error' : ''}`} style={{ height: 38, fontSize: 13 }}
              placeholder="LIFE" value={fields.code} onChange={e => set('code', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Icon">
            <select className="select" style={{ height: 38, fontSize: 13 }} value={fields.icon} onChange={e => set('icon', e.target.value)}>
              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="select" style={{ height: 38, fontSize: 13 }} value={fields.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <Field label="Description" required error={errors.description}>
          <textarea className={`input${errors.description ? ' error' : ''}`}
            style={{ fontSize: 13, minHeight: 60, resize: 'vertical' }} placeholder="Brief description…"
            value={fields.description} onChange={e => set('description', e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Coverage Details">
          <textarea className="input" style={{ fontSize: 13, minHeight: 50, resize: 'vertical' }}
            placeholder="Coverage scope…" value={fields.coverageDetails} onChange={e => set('coverageDetails', e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Eligibility Criteria">
          <textarea className="input" style={{ fontSize: 13, minHeight: 50, resize: 'vertical' }}
            placeholder="Who is eligible…" value={fields.eligibility} onChange={e => set('eligibility', e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Terms Summary">
          <textarea className="input" style={{ fontSize: 13, minHeight: 50, resize: 'vertical' }}
            placeholder="Key terms…" value={fields.terms} onChange={e => set('terms', e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}

// ── Detail Modal ─────────────────────────────────────────────
function TypeDetailModal({ open, onClose, type }) {
  if (!type) return null
  const IconComp = ICON_MAP[type.icon] || Shield
  const ic = ICON_COLORS[type.icon] || ICON_COLORS.Shield
  const assocCount = countPoliciesByType(initialPolicies, type.typeId)

  function Section({ title, text }) {
    if (!text) return null
    return (
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#168BFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{text}</p>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Policy Type Details" size="lg"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconComp size={26} style={{ color: ic.color }} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#172033' }}>{type.name}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94A3B8' }}>{type.code}</span>
            <Badge variant={type.status === 'active' ? 'green' : 'gray'} dot>{type.status === 'active' ? 'Active' : 'Inactive'}</Badge>
            <span style={{ fontSize: 12, color: '#64748B' }}>{assocCount} associated polic{assocCount !== 1 ? 'ies' : 'y'}</span>
          </div>
        </div>
      </div>
      <Section title="Description" text={type.description} />
      <Section title="Coverage Details" text={type.coverageDetails} />
      <Section title="Eligibility Criteria" text={type.eligibility} />
      <Section title="Terms Summary" text={type.terms} />
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════
export default function PolicyTypes() {
  const [types, setTypes]           = useState(initialPolicyTypes)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [toast, setToast]           = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return types.filter(t => {
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
      const matchStatus = !statusFilter || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [types, search, statusFilter])

  const hasFilters = search || statusFilter

  function handleAdd(fields) {
    const newType = { ...fields, typeId: `PTYPE-${Date.now()}` }
    setTypes(ts => [...ts, newType])
    setToast({ message: `Policy type "${fields.name}" added.`, type: 'success' })
  }
  function handleEdit(fields) {
    setTypes(ts => ts.map(t => t.typeId === editTarget.typeId ? { ...t, ...fields } : t))
    setToast({ message: 'Policy type updated.', type: 'success' })
    setEditTarget(null)
  }
  function openEdit(type) { setEditTarget(type); setFormOpen(true) }
  function openAdd()      { setEditTarget(null);  setFormOpen(true) }
  function closeForm()    { setFormOpen(false); setEditTarget(null) }

  return (
    <div>
      <PageHeader title="Policy Types" subtitle="Define and manage insurance product categories."
        actions={<Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Type</Button>} />

      {/* Search */}
      <Card style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input className="input input-icon-left" style={{ height: 36, fontSize: 13 }}
              placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ height: 36, fontSize: 13, minWidth: 140 }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setStatus('') }}>Clear</Button>}
        </div>
      </Card>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <Card><EmptyState title="No policy types found" description={hasFilters ? 'No types match your search.' : 'No policy types have been created.'} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(type => {
            const IconComp = ICON_MAP[type.icon] || Shield
            const ic = ICON_COLORS[type.icon] || ICON_COLORS.Shield
            const assocCount = countPoliciesByType(initialPolicies, type.typeId)
            return (
              <Card key={type.typeId} style={{ cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(22,139,255,0.10)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                onClick={() => setViewTarget(type)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: ic.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComp size={24} style={{ color: ic.color }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge variant={type.status === 'active' ? 'green' : 'gray'} dot>
                      {type.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#172033' }}>{type.name}</h3>
                <p style={{ margin: '0 0 2px', fontSize: 12, fontFamily: 'monospace', color: '#94A3B8' }}>{type.code}</p>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748B', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {type.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    <strong style={{ color: '#172033' }}>{assocCount}</strong> polic{assocCount !== 1 ? 'ies' : 'y'}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Edit ${type.name}`}
                      onClick={() => openEdit(type)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" aria-label={`View ${type.name}`}
                      onClick={() => setViewTarget(type)}><Eye size={14} /></button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <TypeFormModal open={formOpen} onClose={closeForm} onSubmit={editTarget ? handleEdit : handleAdd} editData={editTarget} />
      <TypeDetailModal open={!!viewTarget} onClose={() => setViewTarget(null)} type={viewTarget} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
