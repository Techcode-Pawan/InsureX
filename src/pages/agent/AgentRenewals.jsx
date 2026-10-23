import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCcw, Phone } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, relativeDays, daysUntil, fullName, titleCase } from '../../lib/format'
import { PageHead, Panel, DataState, Notice, Segmented, ConfirmDialog } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'GRACE_PERIOD', label: 'Grace period' },
  { value: 'RENEWED', label: 'Renewed' },
  { value: 'LAPSED', label: 'Lapsed' },
]

export default function AgentRenewals() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useApi('/agent/renewals', { status })
  const [target, setTarget] = useState(null)
  const [notes, setNotes] = useState('')
  const [flash, setFlash] = useState(null)
  const action = useAction()

  async function openRenewal() {
    try {
      await action.run(() => api.post('/agent/renewals', { policyId: target.id, ...(notes.trim() && { notes: notes.trim() }) }))
      setFlash(`Renewal opened for ${target.policyNumber}.`)
      setTarget(null)
      reload()
    } catch {
      /* shown in dialog */
    }
  }

  const opportunities = data?.opportunities || []
  const renewals = data?.renewals || []

  return (
    <div className="px-page">
      <PageHead
        eyebrow="Follow-ups"
        title="Renewals"
        sub="Policies coming up for renewal and the renewals already in progress. Renewals open 60 days before expiry; administrators complete them once the renewal premium is paid."
      />

      {flash && <Notice tone="ok" style={{ marginBottom: 16 }}>{flash}</Notice>}

      <div className="px-grid">
        <Panel flush title="Opportunities" note="Active policies expiring within 90 days with no renewal open yet">
          <DataState loading={loading} error={error} onRetry={reload} empty={opportunities.length === 0} emptyText="No policies in your book need a renewal conversation right now.">
            <ul className="rows">
              {opportunities.map((p) => {
                const days = daysUntil(p.expiryDate)
                const inWindow = days <= 60
                return (
                  <li key={p.id} className="row" style={{ flexWrap: 'wrap' }}>
                    <div className="row-main">
                      <div className="row-title">
                        <Link to={`/agent/policies/${p.id}`} className="table-link">{p.policyNumber}</Link> · {p.policyType.name}
                      </div>
                      <div className="row-meta">
                        <Link to={`/agent/customers/${p.customer.id}`} className="table-link">{fullName(p.customer)}</Link>
                        {' '}· expires {date(p.expiryDate)} ({relativeDays(p.expiryDate)}) · {inr(p.premiumAmount)} {titleCase(p.premiumFrequency).toLowerCase()}
                      </div>
                    </div>
                    {p.customer.phone && (
                      <a href={`tel:${p.customer.phone.replace(/\s+/g, '')}`} className="icon-btn" aria-label={`Call ${fullName(p.customer)}`} title={p.customer.phone}>
                        <Phone size={16} aria-hidden="true" />
                      </a>
                    )}
                    <div className="row-end">
                      {inWindow ? (
                        <Button size="sm" variant="secondary" icon={RefreshCcw} onClick={() => { action.setError(null); setNotes(''); setTarget(p) }}>Open renewal</Button>
                      ) : (
                        <span className="muted" style={{ fontSize: 12.5 }}>Opens in {days - 60} days</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </DataState>
        </Panel>

        <Panel
          flush
          title="Renewals in progress and history"
          action={<Segmented label="Renewal status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />}
        >
          <DataState loading={loading} error={error} onRetry={reload} empty={renewals.length === 0} emptyText="No renewals match this filter.">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Renewal</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Current expiry</th>
                    <th scope="col">New term</th>
                    <th scope="col" className="numeric">Renewal premium</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="mono">{r.renewalNumber}</span>
                        <div className="table-subtext"><Link to={`/agent/policies/${r.policy.id}`} className="table-link">{r.policy.policyNumber}</Link> · {r.policy.policyType?.name}</div>
                      </td>
                      <td>{fullName(r.policy.customer)}</td>
                      <td className="nowrap">{date(r.previousExpiryDate)}</td>
                      <td className="nowrap">{date(r.newStartDate)} – {date(r.newExpiryDate)}</td>
                      <td className="numeric">{inr(r.renewalPremium)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        title="Open a renewal"
        confirmLabel="Open renewal"
        pending={action.pending}
        error={action.error}
        onConfirm={openRenewal}
        onClose={() => setTarget(null)}
      >
        {target && (
          <>
            <p style={{ marginTop: 0 }}>
              Renew <strong>{target.policyNumber}</strong> for {fullName(target.customer)} for one year on the same terms, starting {date(target.expiryDate)}.
            </p>
            <label htmlFor="renewal-notes" className="input-label">Note for the administrator (optional)</label>
            <textarea id="renewal-notes" className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Customer confirmed renewal by phone" />
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
