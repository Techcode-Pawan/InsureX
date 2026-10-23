import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, FilePlus2, Upload, Phone, Mail } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

const CONTACT_FIELDS = [
  ['phone', 'Phone'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'Postal code'],
]

function validateContact(f) {
  const e = {}
  if (f.phone.trim().length < 10 || f.phone.trim().length > 20) e.phone = 'Enter a phone number of 10–20 characters.'
  if (!f.address.trim()) e.address = 'Address is required.'
  if (!f.city.trim()) e.city = 'City is required.'
  if (!f.state.trim()) e.state = 'State is required.'
  if (f.postalCode.trim().length < 4 || f.postalCode.trim().length > 12) e.postalCode = 'Enter a valid postal code.'
  return e
}

function EditContactModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(CONTACT_FIELDS.map(([k]) => [k, customer[k] || ''])))
  const [errors, setErrors] = useState({})
  const action = useAction()

  async function save() {
    const e = validateContact(form)
    setErrors(e)
    if (Object.keys(e).length) return
    // Send only changed fields
    const changes = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== (customer[k] || '')))
    if (!Object.keys(changes).length) return onClose()
    try {
      await action.run(() => api.patch(`/agent/customers/${customer.id}`, changes))
      onSaved()
    } catch {
      /* shown below */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Update contact details"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
          <Button onClick={save} loading={action.pending}>Save changes</Button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Agents can update contact details only. Name, date of birth, email and ID details can be corrected by an administrator after verification.
      </p>
      <div className="form-grid">
        {CONTACT_FIELDS.map(([k, label]) => (
          <Input
            key={k}
            id={`contact-${k}`}
            label={label}
            className={k === 'address' ? 'span-2' : ''}
            value={form[k]}
            error={errors[k]}
            onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
          />
        ))}
      </div>
      {action.error && <div style={{ marginTop: 12 }}><Notice tone="error">{action.error.message}</Notice></div>}
    </Modal>
  )
}

export default function AgentCustomerDetail() {
  const { id } = useParams()
  const { data: c, loading, error, reload } = useApi(`/agent/customers/${id}`)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!c) {
    return (
      <div className="px-page">
        <Link to="/agent/customers" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} /> Customers</Link>
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      </div>
    )
  }

  return (
    <div className="px-page">
      <Link to="/agent/customers" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Customers</Link>
      <PageHead
        eyebrow={c.customerNumber}
        title={fullName(c)}
        sub={`${c.city}, ${c.state} · customer since ${date(c.registrationDate)}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => { setSaved(false); setEditing(true) }}>Edit contact</Button>
            <Link to={`/agent/documents?upload=1&customerId=${c.id}`} className="btn btn-secondary btn-sm"><Upload size={15} aria-hidden="true" /> Upload document</Link>
            <Link to={`/agent/applications/new?customerId=${c.id}`} className="btn btn-primary btn-sm"><FilePlus2 size={15} aria-hidden="true" /> New application</Link>
          </>
        }
      />

      {saved && <Notice tone="ok" style={{ marginBottom: 16 }}>Contact details updated.</Notice>}

      <div className="px-grid main-side">
        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel flush title="Policies" note={`${c.policies.length} on record`}>
            <DataState empty={c.policies.length === 0} emptyText="No policies yet.">
              <ul className="rows">
                {c.policies.map((p) => (
                  <li key={p.id}>
                    <Link to={`/agent/policies/${p.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{p.policyNumber} · {p.policyType.name}</div>
                        <div className="row-meta">Cover {inr(p.sumAssured)} · {inr(p.premiumAmount)} {titleCase(p.premiumFrequency).toLowerCase()} · expires {date(p.expiryDate)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={p.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Applications">
            <DataState empty={c.applications.length === 0} emptyText="No applications yet.">
              <ul className="rows">
                {c.applications.map((a) => (
                  <li key={a.id}>
                    <Link to={`/agent/applications/${a.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{a.applicationNumber} · {a.policyType.name}</div>
                        <div className="row-meta">Submitted {date(a.applicationDate)} · cover requested {inr(a.requestedCoverage)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={a.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Claims">
            <DataState empty={c.claims.length === 0} emptyText="No claims filed.">
              <ul className="rows">
                {c.claims.map((cl) => (
                  <li key={cl.id}>
                    <Link to={`/agent/claims/${cl.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{cl.claimNumber}</div>
                        <div className="row-meta">Filed {date(cl.claimDate)} · {inr(cl.claimedAmount)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={cl.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>

        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel title="Contact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="panel-link"><Phone size={14} aria-hidden="true" /> {c.phone}</a>
              <a href={`mailto:${c.email}`} className="panel-link" style={{ overflowWrap: 'anywhere' }}><Mail size={14} aria-hidden="true" /> {c.email}</a>
            </div>
            <Facts items={[
              ['Address', `${c.address}, ${c.city}, ${c.state} ${c.postalCode}`],
              ['Status', <StatusBadge key="s" status={c.status} />],
            ]} />
          </Panel>

          <Panel title="Identity">
            <Facts items={[
              ['Date of birth', date(c.dateOfBirth)],
              ['Gender', c.gender],
              ['ID proof', c.idProofType],
              ['ID number', <span key="id" className="mono">{c.maskedIdProofNumber}</span>],
            ]} />
          </Panel>

          <Panel flush title="Documents" action={<Link to={`/agent/documents?customerId=${c.id}`} className="panel-link">All</Link>}>
            <DataState empty={c.documents.length === 0} emptyText="No documents submitted.">
              <ul className="rows">
                {c.documents.slice(0, 6).map((d) => (
                  <li key={d.id} className="row">
                    <div className="row-main">
                      <div className="row-title">{d.name}</div>
                      <div className="row-meta">{d.documentType} · {date(d.submissionDate)}</div>
                    </div>
                    <div className="row-end"><StatusBadge status={d.verificationStatus} /></div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>
      </div>

      {editing && (
        <EditContactModal
          customer={c}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setSaved(true); reload() }}
        />
      )}
    </div>
  )
}
