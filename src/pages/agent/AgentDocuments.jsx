import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Upload, Download, MessageSquareWarning, Search } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { date, fullName } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented, Notice } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEEDS_INFO', label: 'Needs info' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

const DOC_TYPES = [
  'Identity Proof', 'Address Proof', 'Income Proof', 'Medical Report', 'Hospital Bill',
  'Hospital Discharge Summary', 'Police Report (FIR)', 'Vehicle RC', 'Repair Estimate', 'Death Certificate', 'Other',
]
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 5 * 1024 * 1024

function UploadModal({ initialCustomerId, initialClaimId, onClose, onUploaded }) {
  const [form, setForm] = useState({ customerId: initialCustomerId || '', policyId: '', claimId: initialClaimId || '', name: '', documentType: '' })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const action = useAction()
  const customers = useApi('/agent/customers', { limit: 100, status: 'ACTIVE' })
  const detail = useApi(form.customerId ? `/agent/customers/${form.customerId}` : null)

  const customerOptions = (customers.data || []).map((c) => ({ value: c.id, label: `${fullName(c)} · ${c.customerNumber}` }))
  if (detail.data && !customerOptions.some((o) => o.value === detail.data.id)) {
    customerOptions.unshift({ value: detail.data.id, label: `${fullName(detail.data)} · ${detail.data.customerNumber}` })
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function pickFile(e) {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f && !form.name) setForm((x) => ({ ...x, name: f.name.replace(/\.[^.]+$/, '').slice(0, 160) }))
  }

  async function submit() {
    const e = {}
    if (!form.customerId) e.customerId = 'Select the customer.'
    if (!form.documentType) e.documentType = 'Select the document type.'
    if (form.name.trim().length < 2) e.name = 'Give the document a descriptive name.'
    if (!file) e.file = 'Choose a file.'
    else if (!ACCEPTED.includes(file.type)) e.file = 'Only PDF, PNG or JPEG files are accepted.'
    else if (file.size > MAX_BYTES) e.file = 'The file is larger than 5 MB.'
    setErrors(e)
    if (Object.keys(e).length) return

    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', form.name.trim())
    fd.append('documentType', form.documentType)
    fd.append('customerId', form.customerId)
    if (form.policyId) fd.append('policyId', form.policyId)
    if (form.claimId) fd.append('claimId', form.claimId)
    try {
      await action.run(() => api.upload('/agent/documents', fd))
      onUploaded()
    } catch {
      /* shown below */
    }
  }

  return (
    <Modal
      open
      onClose={action.pending ? () => {} : onClose}
      title="Upload a document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
          <Button icon={Upload} onClick={submit} loading={action.pending}>Upload</Button>
        </>
      }
    >
      <div className="form-grid">
        <Select id="up-customer" className="span-2" label="Customer" placeholder={customers.loading ? 'Loading…' : 'Select customer'} options={customerOptions}
          value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, policyId: '', claimId: '' }))} error={errors.customerId} />
        <Select id="up-policy" label="Related policy (optional)" disabled={!detail.data}
          options={[{ value: '', label: 'None' }, ...(detail.data?.policies || []).map((p) => ({ value: p.id, label: `${p.policyNumber} · ${p.policyType.name}` }))]}
          value={form.policyId} onChange={set('policyId')} />
        <Select id="up-claim" label="Related claim (optional)" disabled={!detail.data}
          options={[{ value: '', label: 'None' }, ...(detail.data?.claims || []).map((c) => ({ value: c.id, label: c.claimNumber }))]}
          value={form.claimId} onChange={set('claimId')} />
        <Select id="up-type" label="Document type" placeholder="Select type" options={DOC_TYPES} value={form.documentType} onChange={set('documentType')} error={errors.documentType} />
        <Input id="up-name" label="Document name" value={form.name} onChange={set('name')} maxLength={160} error={errors.name} />
        <div className="span-2">
          <label htmlFor="up-file" className="input-label">File</label>
          <input id="up-file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={pickFile}
            className="input" style={{ padding: 6, height: 'auto' }} aria-describedby="up-file-help" aria-invalid={Boolean(errors.file)} />
          <p id="up-file-help" className="field-help">PDF, PNG or JPEG, up to 5 MB. The file is stored privately and only visible to the customer, you and administrators.</p>
          {errors.file && <p className="input-error-msg" role="alert">{errors.file}</p>}
        </div>
      </div>
      {action.error && <div style={{ marginTop: 12 }}><Notice tone="error">{action.error.message}</Notice></div>}
    </Modal>
  )
}

function NeedsInfoModal({ doc, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const action = useAction()

  async function submit() {
    if (note.trim().length < 5) return setErr('Explain what the customer needs to provide (at least 5 characters).')
    setErr(null)
    try {
      await action.run(() => api.patch(`/agent/documents/${doc.id}`, { verificationStatus: 'NEEDS_INFO', verificationNotes: note.trim() }))
      onDone()
    } catch {
      /* shown below */
    }
  }

  return (
    <Modal
      open
      size="sm"
      onClose={action.pending ? () => {} : onClose}
      title="Request more information"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
          <Button onClick={submit} loading={action.pending}>Send request</Button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{doc.name}</strong> will be marked “Needs info” and the customer will be notified with your note. Final verification is done by an administrator.
      </p>
      <label htmlFor="ni-note" className="input-label">What's missing?</label>
      <textarea id="ni-note" className="input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The scan is cut off; please upload all pages of the discharge summary." />
      {err && <p className="input-error-msg" role="alert">{err}</p>}
      {action.error && <div style={{ marginTop: 12 }}><Notice tone="error">{action.error.message}</Notice></div>}
    </Modal>
  )
}

export default function AgentDocuments() {
  const [params, setParams] = useSearchParams()
  const customerId = params.get('customerId') || ''
  const [status, setStatus] = useState(params.get('status') || '')
  const [page, setPage] = useState(1)
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(params.get('upload') === '1')
  const [infoDoc, setInfoDoc] = useState(null)
  const [flash, setFlash] = useState(null)
  const [dlError, setDlError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setSearch(term.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [term])

  const { data, body, loading, error, reload } = useApi('/agent/documents', { page, limit: 20, status, search, customerId })

  function closeUpload() {
    setUploading(false)
    if (params.get('upload')) {
      const next = new URLSearchParams(params)
      next.delete('upload')
      next.delete('claimId')
      setParams(next, { replace: true })
    }
  }

  async function download(d) {
    setDlError(null)
    try {
      await api.download(`/agent/documents/${d.id}/download`, d.name)
    } catch (err) {
      setDlError(err.message)
    }
  }

  return (
    <div className="px-page">
      <PageHead
        eyebrow="Follow-ups"
        title="Documents"
        sub="Documents submitted by or for your customers. Help customers complete submissions; administrators make the final verification decision."
        actions={<Button size="sm" icon={Upload} onClick={() => setUploading(true)}>Upload document</Button>}
      />

      {flash && <Notice tone="ok" style={{ marginBottom: 16 }}>{flash}</Notice>}
      {dlError && <Notice tone="error" style={{ marginBottom: 16 }}>{dlError}</Notice>}

      <Panel flush>
        <div className="filters">
          <div className="input-wrapper">
            <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
            <label htmlFor="doc-filter" className="sr-only">Search documents</label>
            <input id="doc-filter" className="input input-icon-left" placeholder="Document name, number or customer" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Segmented label="Verification status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
          {customerId && (
            <Button variant="ghost" size="sm" onClick={() => { const n = new URLSearchParams(params); n.delete('customerId'); setParams(n) }}>
              Showing one customer · clear
            </Button>
          )}
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0}
          emptyText={status || search || customerId ? 'No documents match these filters.' : 'No documents have been submitted for your customers yet.'}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Linked to</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div className="table-subtext">{d.documentType} · <span className="mono">{d.documentNumber}</span>{d.fileSize ? ` · ${d.fileSize}` : ''}</div>
                    </td>
                    <td><Link to={`/agent/customers/${d.customer.id}`} className="table-link">{fullName(d.customer)}</Link></td>
                    <td className="nowrap">
                      {d.policy ? <Link to={`/agent/policies/${d.policy.id}`} className="table-link">{d.policy.policyNumber}</Link> : null}
                      {d.claim ? <div><Link to={`/agent/claims/${d.claim.id}`} className="table-link">{d.claim.claimNumber}</Link></div> : null}
                      {!d.policy && !d.claim && <span className="muted">—</span>}
                    </td>
                    <td className="nowrap">{date(d.submissionDate)}</td>
                    <td>
                      <StatusBadge status={d.verificationStatus} />
                      {d.verificationNotes && <div className="table-subtext" style={{ maxWidth: 260, whiteSpace: 'normal' }}>{d.verificationNotes}</div>}
                    </td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      {d.hasFile && (
                        <Button variant="ghost" size="icon" aria-label={`Download ${d.name}`} title="Download" onClick={() => download(d)}>
                          <Download size={16} />
                        </Button>
                      )}
                      {d.verificationStatus === 'PENDING' && (
                        <Button variant="ghost" size="icon" aria-label={`Request more information for ${d.name}`} title="Request more information" onClick={() => setInfoDoc(d)}>
                          <MessageSquareWarning size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      {uploading && (
        <UploadModal
          initialCustomerId={customerId}
          initialClaimId={params.get('claimId') || ''}
          onClose={closeUpload}
          onUploaded={() => { closeUpload(); setFlash('Document uploaded and queued for verification.'); reload() }}
        />
      )}
      {infoDoc && (
        <NeedsInfoModal
          doc={infoDoc}
          onClose={() => setInfoDoc(null)}
          onDone={() => { setInfoDoc(null); setFlash('The customer has been asked for more information.'); reload() }}
        />
      )}
    </div>
  )
}
