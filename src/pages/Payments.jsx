import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCw, Download, BadgeCheck } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, Notice, DataState, Pager, Segmented } from '../components/panel'
import { useApi } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, dateTime, fullName, titleCase } from '../lib/format'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'SUCCESS', label: 'Confirmed' },
  { value: 'PENDING', label: 'Awaiting verification' },
  { value: 'FAILED', label: 'Failed' },
]

// Exports every payment matching the filter (fetched page by page from the API, max 100 per page).
async function exportCsv(status) {
  const rows = [['Payment', 'Date', 'Policy', 'Customer', 'Installment', 'Method', 'Reference', 'Amount (INR)', 'Status']]
  for (let page = 1; page <= 50; page++) {
    const res = await api.get('/payments', { status, page, limit: 100 })
    res.data.data.forEach((p) => rows.push([
      p.paymentNumber, new Date(p.paymentDate).toISOString(), p.policy?.policyNumber, fullName(p.policy?.customer),
      p.premium?.premiumNumber, p.paymentMethod, p.transactionReference, Number(p.amount), p.status,
    ]))
    if (page >= res.data.totalPages) break
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `insurex-payments-${status || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Payments() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, body, loading, error, reload } = useApi('/payments', { status, page, limit: 20 })
  const pending = useApi('/payments', { status: 'PENDING', limit: 1 })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  async function doExport() {
    setExporting(true)
    setExportError(null)
    try {
      await exportCsv(status)
    } catch (err) {
      setExportError(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Premium payments"
        subtitle="Every payment recorded against a premium installment. Only confirmed payments reduce balances."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RotateCw} onClick={() => { reload(); pending.reload() }}>Refresh</Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={doExport} loading={exporting}>Export CSV</Button>
          </>
        }
      />

      {pending.body?.total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Notice tone="warn">
            {pending.body.total} customer-submitted payment{pending.body.total === 1 ? ' is' : 's are'} awaiting verification against bank records.{' '}
            <Link to="/admin/verifications" className="table-link">Open verification queue</Link>
          </Notice>
        </div>
      )}
      {exportError && <div style={{ marginBottom: 12 }}><Notice tone="error">Export failed: {exportError.message}</Notice></div>}

      <Panel flush title="Payment history" action={<Segmented label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={FILTERS} />}>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No payments match this filter.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Payment</th><th scope="col">Date</th><th scope="col">Policy · customer</th><th scope="col">Installment</th>
                  <th scope="col">Method / reference</th><th scope="col" className="numeric">Amount</th><th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.paymentNumber}</td>
                    <td className="nowrap">{dateTime(p.paymentDate)}</td>
                    <td>
                      {p.policy ? <Link className="table-link" to={`/admin/policies/${p.policy.id}`}>{p.policy.policyNumber}</Link> : '—'}
                      <div className="muted" style={{ fontSize: 12 }}>{fullName(p.policy?.customer)}</div>
                    </td>
                    <td className="mono">{p.premium?.premiumNumber}</td>
                    <td>{titleCase(p.paymentMethod)}<div className="mono">{p.transactionReference}</div></td>
                    <td className="numeric" style={{ fontWeight: 600 }}>{inr(p.amount, { exact: true })}</td>
                    <td>
                      {p.status === 'PENDING'
                        ? <Link to="/admin/verifications" className="table-link" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12.5 }}><BadgeCheck size={14} aria-hidden="true" /> Verify</Link>
                        : <StatusBadge status={p.status} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
