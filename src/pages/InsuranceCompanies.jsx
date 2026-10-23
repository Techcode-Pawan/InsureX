import { useEffect, useState } from 'react'
import { Building2, Search, Pencil } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, DataState, Segmented, Notice } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'INACTIVE', label: 'Inactive' },
]
const FIELDS = ['name', 'shortName', 'registrationNumber', 'category', 'phone', 'email', 'website', 'address', 'city', 'state', 'postalCode', 'status', 'rating', 'description']
const EMPTY = Object.fromEntries(FIELDS.map((k) => [k, k === 'status' ? 'ACTIVE' : '']))

// Mirrors server companySchema.
function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Required.'
  if (f.registrationNumber.trim().length < 3) e.registrationNumber = 'At least 3 characters.'
  if (f.category.trim().length < 2) e.category = 'Required.'
  if (f.phone.trim().length < 5) e.phone = 'Enter a phone number.'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email.'
  if (f.address.trim().length < 2) e.address = 'Required.'
  if (f.city.trim().length < 2) e.city = 'Required.'
  if (f.state.trim().length < 2) e.state = 'Required.'
  if (f.postalCode.trim().length < 4) e.postalCode = 'Enter a valid postal code.'
  return e
}

function CompanyFormModal({ open, company, onClose, onSaved }) {
  const isEdit = Boolean(company)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const action = useAction()

  useEffect(() => {
    if (open) {
      setF(company ? Object.fromEntries(FIELDS.map((k) => [k, company[k] ?? ''])) : EMPTY)
      setErrors({})
      action.setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company])

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    // Optional fields are omitted when blank so the server keeps them unset.
    const payload = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ''))
    try {
      const res = await action.run(() => (isEdit ? api.put(`/insurance-companies/${company.id}`, payload) : api.post('/insurance-companies', payload)))
      onSaved(res.data.data)
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])))
    }
  }

  const field = (k, label, props = {}) => <Input id={`co-${k}`} label={label} value={f[k]} onChange={set(k)} error={errors[k]} {...props} />

  return (
    <Modal open={open} onClose={action.pending ? () => {} : onClose} title={isEdit ? `Edit ${company.name}` : 'Add insurance company'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button><Button type="submit" form="company-form" loading={action.pending}>{isEdit ? 'Save changes' : 'Add company'}</Button></>}>
      <form id="company-form" className="form-grid" onSubmit={submit} noValidate>
        {action.error && <div className="span-2"><Notice tone="error">{action.error.message}</Notice></div>}
        {field('name', 'Legal name', { required: true })}
        {field('shortName', 'Short name')}
        {field('registrationNumber', 'Registration number (IRDAI)', { required: true })}
        {field('category', 'Category', { required: true, placeholder: 'e.g. Health, Life, General' })}
        {field('phone', 'Phone', { type: 'tel', required: true })}
        {field('email', 'Email', { type: 'email', required: true })}
        {field('website', 'Website')}
        {field('rating', 'Credit rating')}
        {field('address', 'Address', { className: 'span-2', required: true })}
        {field('city', 'City', { required: true })}
        {field('state', 'State', { required: true })}
        {field('postalCode', 'Postal code', { required: true })}
        <Select id="co-status" label="Status" value={f.status} onChange={set('status')} options={STATUSES} />
        <div className="span-2">
          <label className="input-label" htmlFor="co-desc">Description</label>
          <textarea id="co-desc" className="input" maxLength={2000} value={f.description} onChange={set('description')} />
        </div>
      </form>
    </Modal>
  )
}

export default function InsuranceCompanies() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit
  const [message, setMessage] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, reload } = useApi('/insurance-companies', { search: query || undefined, status: status || undefined })
  const all = useApi('/insurance-companies')

  return (
    <div>
      <PageHeader title="Insurance companies" subtitle="Carriers and underwriters whose products are issued through InsureX."
        actions={<Button icon={Building2} onClick={() => setEditing(null)}>Add company</Button>} />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <KpiBand cols={3}>
        <Kpi label="Companies" value={all.data ? all.data.length : '—'} foot={all.data && `${all.data.filter((c) => c.status === 'ACTIVE').length} active`} />
        <Kpi label="Policies underwritten" value={all.data ? all.data.reduce((s, c) => s + c._count.policies, 0) : '—'} />
        <Kpi label="Affiliated agents" value={all.data ? all.data.reduce((s, c) => s + c._count.agents, 0) : '—'} />
      </KpiBand>

      <Panel flush>
        <div className="filters">
          <Input id="co-search" prefixIcon={Search} placeholder="Name, registration no., city, category" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search companies" />
          <Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...STATUSES]} />
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No companies match.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Company</th><th scope="col">Registration</th><th scope="col">Category</th><th scope="col">Contact</th>
                  <th scope="col">Location</th><th scope="col">Rating</th><th scope="col" className="numeric">Policies</th><th scope="col" className="numeric">Agents</th>
                  <th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}{c.shortName && <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{c.shortName}</div>}</td>
                    <td className="mono">{c.registrationNumber}</td>
                    <td>{c.category}</td>
                    <td>{c.email}<div className="muted" style={{ fontSize: 12 }}>{c.phone}</div></td>
                    <td>{c.city}, {c.state}</td>
                    <td>{c.rating || '—'}</td>
                    <td className="numeric">{c._count.policies}</td>
                    <td className="numeric">{c._count.agents}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Panel>

      <CompanyFormModal open={editing !== undefined} company={editing || null} onClose={() => setEditing(undefined)}
        onSaved={(c) => { setMessage(`${c.name} ${editing ? 'updated' : 'added'}.`); setEditing(undefined); reload(); all.reload() }} />
    </div>
  )
}
