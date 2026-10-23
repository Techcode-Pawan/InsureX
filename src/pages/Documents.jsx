import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Download, X } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, DataState, Pager, Notice, ConfirmDialog, Segmented } from '../components/panel'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { date, fullName } from '../lib/format'

const STATUS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEEDS_INFO', label: 'Needs info' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

const DECISIONS = [
  { value: 'VERIFIED', label: 'Verified — document is valid' },
  { value: 'NEEDS_INFO', label: 'Needs more information' },
  { value: 'REJECTED', label: 'Rejected — not acceptable' },
  { value: 'PENDING', label: 'Back to pending' },
]

export default function Documents() {
  const [params, setParams] = useSearchParams()
  const customerId = params.get('customerId') || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(params.get('status') || '')
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/documents', {
    search: search.trim() || undefined, status, customerId: customerId || undefined, page, limit: 15,
  })
  const customer = useApi(customerId ? `/customers/${customerId}` : null)
  const [reviewing, setReviewing] = useState(null)
  const [decision, setDecision] = useState('VERIFIED')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const action = useAction()

  function openReview(d) {
    setReviewing(d)
    setDecision('VERIFIED')
    setNotes(d.verificationNotes || '')
    action.setError(null)
  }

  async function saveReview() {
    await action.run(() => api.put(`/documents/${reviewing.id}`, { verificationStatus: decision, verificationNotes: notes.trim() || undefined }))
    setMessage(`${reviewing.documentNumber} marked ${DECISIONS.find((d) => d.value === decision).label.split(' —')[0].toLowerCase()}. The customer has been notified.`)
    setReviewing(null)
    reload()
  }

  async function download(d) {
    setDownloadError('')
    try {
      await api.download(`/documents/${d.id}/download`, d.name)
    } catch (err) {
      setDownloadError(`${d.documentNumber}: ${err.message}`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Files submitted by customers and agents. Verify, reject or ask for more information."
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}
      {downloadError && <div style={{ marginBottom: 12 }}><Notice tone="error">{downloadError}</Notice></div>}

      <Panel flush>
        <div className="filters">
          <Input id="doc-search" prefixIcon={Search} aria-label="Search documents" placeholder="Document name, number or customer"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Segmented label="Verification status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS} />
          {customerId && (
            <span className="badge badge-blue" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              Customer: {customer.data ? fullName(customer.data) : '…'}
              <button type="button" aria-label="Clear customer filter" onClick={() => { params.delete('customerId'); setParams(params, { replace: true }); setPage(1) }}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'inherit' }}>
                <X size={13} />
              </button>
            </span>
          )}
        </div>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No documents match these filters.">
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
                      <div className="muted" style={{ fontSize: 12 }}>
                        <span className="mono">{d.documentNumber}</span> · {d.documentType}{d.fileFormat && ` · ${d.fileFormat}`}{d.fileSize && ` · ${d.fileSize}`}
                      </div>
                    </td>
                    <td>
                      <Link to={`/admin/customers/${d.customer?.id}`} className="table-link" style={{ fontWeight: 500 }}>{fullName(d.customer)}</Link>
                      <div className="mono">{d.customer?.customerNumber}</div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {d.policy && <div><Link to={`/admin/policies/${d.policy.id}`} className="table-link">{d.policy.policyNumber}</Link></div>}
                      {d.claim && <div><Link to={`/admin/claims/${d.claim.id}`} className="table-link">{d.claim.claimNumber}</Link></div>}
                      {!d.policy && !d.claim && <span className="muted">Customer file</span>}
                    </td>
                    <td className="nowrap">
                      {date(d.submissionDate)}
                      {d.verifiedBy && <div className="muted" style={{ fontSize: 12 }}>Reviewed by {d.verifiedBy}</div>}
                    </td>
                    <td>
                      <StatusBadge status={d.verificationStatus} />
                      {d.verificationNotes && <div className="muted" style={{ fontSize: 12, maxWidth: 220, marginTop: 2 }}>{d.verificationNotes}</div>}
                    </td>
                    <td className="nowrap" style={{ textAlign: 'right' }}>
                      {d.hasFile
                        ? <Button size="sm" variant="secondary" icon={Download} onClick={() => download(d)}>Open</Button>
                        : <span className="muted" style={{ fontSize: 12, marginRight: 6 }}>No file</span>}{' '}
                      <Button size="sm" onClick={() => openReview(d)}>Review</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>

      <ConfirmDialog
        open={Boolean(reviewing)}
        title={`Review ${reviewing?.documentNumber || ''}`}
        confirmLabel="Save decision"
        danger={decision === 'REJECTED'}
        pending={action.pending}
        error={action.error}
        onClose={() => setReviewing(null)}
        onConfirm={saveReview}
      >
        {reviewing && (
          <div style={{ display: 'grid', gap: 12, color: 'var(--color-text-primary)' }}>
            <div className="muted">{reviewing.name} · {reviewing.documentType} · {fullName(reviewing.customer)}</div>
            {!reviewing.hasFile && <Notice tone="warn">No file is stored for this record. Verify only against a document you have inspected.</Notice>}
            <Select id="doc-decision" label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)} options={DECISIONS} />
            <div>
              <label className="input-label" htmlFor="doc-review-notes">Note to customer {decision === 'VERIFIED' ? '(optional)' : '(recommended)'}</label>
              <textarea id="doc-review-notes" className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
