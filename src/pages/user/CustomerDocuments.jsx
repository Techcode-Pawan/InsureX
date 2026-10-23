import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Upload, Download, FileText } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi } from '../../lib/useApi'
import { date } from '../../lib/format'
import { PageHead, Panel, Notice, DataState, Pager, Segmented } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import '../../styles/user.css'

const DOC_TYPES = ['Identity proof', 'Address proof', 'Income proof', 'Medical report', 'Claim evidence', 'Hospital bill', 'Police report', 'Other']
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'application/pdf,image/png,image/jpeg'

/**
 * Upload dialog used by the Documents page and claim detail page.
 * `fixedClaim` ({ id, claimNumber, policyId }) pins the upload to a claim.
 */
export function UploadDocumentModal(props) {
  // Mounting the dialog only while open gives every upload a fresh form.
  return props.open ? <UploadDocumentDialog {...props} /> : null
}

function UploadDocumentDialog({ onClose, onUploaded, fixedClaim, defaultType = '' }) {
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState(defaultType)
  const [policyId, setPolicyId] = useState(fixedClaim?.policyId || '')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)
  const [policies, setPolicies] = useState([])

  const claimId = fixedClaim?.id
  useEffect(() => {
    if (claimId) return
    let alive = true
    api.get('/me/policies', { limit: 50 })
      .then((r) => { if (alive) setPolicies(r.data.data) })
      .catch(() => {})
    return () => { alive = false }
  }, [claimId])

  function pickFile(e) {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, '').slice(0, 160))
  }

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (!file) v.file = 'Choose a file to upload.'
    else if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) v.file = 'Only PDF, PNG or JPEG files are accepted.'
    else if (file.size > MAX_BYTES) v.file = 'File is too large. The maximum size is 5 MB.'
    if (name.trim().length < 2) v.name = 'Give the document a short name.'
    if (!documentType) v.documentType = 'Select a document type.'
    setErrors(v)
    if (Object.keys(v).length) return

    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name.trim())
    fd.append('documentType', documentType)
    if (policyId) fd.append('policyId', policyId)
    if (fixedClaim) fd.append('claimId', fixedClaim.id)
    setPending(true)
    setServerError(null)
    try {
      const res = await api.upload('/me/documents', fd)
      onUploaded?.(res.data.data)
    } catch (err) {
      setServerError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      title={fixedClaim ? `Upload evidence for ${fixedClaim.claimNumber}` : 'Upload a document'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="doc-upload-form" icon={Upload} loading={pending}>Upload</Button>
        </>
      }
    >
      <form id="doc-upload-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        <div>
          <label htmlFor="doc-file" className="input-label">File</label>
          <input id="doc-file" type="file" accept={ACCEPT} onChange={pickFile} className="input" style={{ paddingTop: 6, height: 'auto', minHeight: 40 }} aria-invalid={!!errors.file} aria-describedby="doc-file-help" />
          <p id="doc-file-help" className={errors.file ? 'input-error-msg' : 'field-help'} role={errors.file ? 'alert' : undefined}>
            {errors.file || 'PDF, PNG or JPEG, up to 5 MB.'}
          </p>
        </div>
        <Input label="Document name" id="doc-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={160} />
        <Select label="Document type" id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} error={errors.documentType} placeholder="Select type" options={DOC_TYPES} />
        {!fixedClaim && (
          <Select
            label="Related policy (optional)"
            id="doc-policy"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            options={[{ value: '', label: 'Not linked to a policy' }, ...policies.map((p) => ({ value: p.id, label: `${p.policyNumber} · ${p.policyType?.name}` }))]}
          />
        )}
        {serverError && <Notice tone="error">{serverError.message}</Notice>}
      </form>
    </Modal>
  )
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEEDS_INFO', label: 'Needs info' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function CustomerDocuments() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [params, setParams] = useSearchParams()
  const [uploadOpen, setUploadOpenState] = useState(() => params.get('upload') === '1')
  // ?upload=1 (from the dashboard alert) opens the upload dialog; closing clears it from the URL
  const setUploadOpen = (open) => {
    setUploadOpenState(open)
    if (!open && params.get('upload')) setParams({}, { replace: true })
  }
  const [flash, setFlash] = useState(null)
  const [dlError, setDlError] = useState(null)
  const { data, body, loading, error, reload } = useApi('/me/documents', { page, limit: 15, status })

  async function download(doc) {
    setDlError(null)
    try {
      await api.download(`/me/documents/${doc.id}/download`, doc.name)
    } catch (err) {
      setDlError(err)
    }
  }

  const needsInfo = data?.filter((d) => d.verificationStatus === 'NEEDS_INFO') || []

  return (
    <div className="px-page">
      <PageHead
        title="Documents"
        sub="Upload identity, income and claim documents securely and see where each one is in verification."
        actions={<Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload document</Button>}
      />
      <div className="cp-stack">
        {flash && <Notice tone="ok">{flash}</Notice>}
        {needsInfo.length > 0 && (
          <Notice tone="warn">
            {needsInfo.length === 1 ? 'One document needs' : `${needsInfo.length} documents need`} more information. Check the notes below and upload a replacement.
          </Notice>
        )}
        {dlError && <Notice tone="error">{dlError.message}</Notice>}
        <Panel flush title="My documents" action={<Segmented label="Filter by verification status" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1) }} />}>
          <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText={status ? 'No documents with this status.' : 'No documents uploaded yet.'}>
            <div>
              {data?.map((d) => (
                <div key={d.id} className="cp-item">
                  <FileText size={20} aria-hidden="true" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <div className="cp-item-main">
                    <div className="cp-item-title">{d.name}</div>
                    <div className="cp-item-meta">
                      {d.documentType} · <span className="mono">{d.documentNumber}</span> · {date(d.submissionDate)}
                      {d.policy && <> · {d.policy.policyNumber}</>}
                      {d.claim && <> · Claim {d.claim.claimNumber}</>}
                      {d.fileFormat && <> · {d.fileFormat}{d.fileSize ? `, ${d.fileSize}` : ''}</>}
                    </div>
                    {d.verificationNotes && ['NEEDS_INFO', 'REJECTED'].includes(d.verificationStatus) && (
                      <div className="cp-item-meta" style={{ color: 'var(--status-amber-text)', marginTop: 4 }}>Note: {d.verificationNotes}</div>
                    )}
                  </div>
                  <div className="cp-item-end">
                    <StatusBadge status={d.verificationStatus} />
                    {d.hasFile && <Button size="sm" variant="ghost" icon={Download} onClick={() => download(d)} aria-label={`Download ${d.name}`}>Download</Button>}
                  </div>
                </div>
              ))}
            </div>
            <Pager body={body} page={page} onPage={setPage} />
          </DataState>
        </Panel>
      </div>

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => { setUploadOpen(false); setFlash(`${doc.name} uploaded. We'll let you know once it's verified.`); reload() }}
      />
    </div>
  )
}
