import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, RefreshCcw, FilePlus2, Wallet } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, dateTime, daysUntil, relativeDays, titleCase, fullName } from '../../lib/format'
import { PageHead, Panel, Facts, Notice, DataState, ConfirmDialog } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import '../../styles/user.css'

const WINDOW_BEFORE = 60
const GRACE_AFTER = 30
const OPEN_RENEWAL = ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD']

export default function CustomerPolicyDetail() {
  const { id } = useParams()
  const { data: p, loading, error, reload } = useApi(`/me/policies/${id}`)
  const [confirm, setConfirm] = useState(false)
  const [notes, setNotes] = useState('')
  const [flash, setFlash] = useState(null)
  const [generatedAt] = useState(() => new Date())
  const { run, pending, error: actionError, setError } = useAction()

  const days = p ? daysUntil(p.expiryDate) : null
  const openRenewal = p?.renewals?.find((r) => OPEN_RENEWAL.includes(r.status))
  const inWindow = days !== null && days <= WINDOW_BEFORE && days >= -GRACE_AFTER
  const canRequest = p && ['ACTIVE', 'EXPIRED'].includes(p.status) && inWindow && !openRenewal
  const outstanding = p?.premiums?.reduce((s, x) => s + (x.status === 'PAID' ? 0 : Number(x.remainingBalance)), 0) || 0
  const nextDue = p?.premiums?.find((x) => x.status !== 'PAID' && Number(x.remainingBalance) > 0)

  async function requestRenewal() {
    try {
      await run(() => api.post('/me/renewals', { policyId: id, ...(notes.trim() && { notes: notes.trim() }) }))
      setConfirm(false)
      setNotes('')
      setFlash('Renewal requested. We will confirm the renewal premium and let you know when your policy is renewed.')
      reload()
    } catch {
      /* shown in dialog */
    }
  }

  return (
    <div className="px-page" style={{ maxWidth: 980 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <Link to="/user/policies" className="panel-link"><ArrowLeft size={14} aria-hidden="true" /> My policies</Link>
        {p && <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print policy schedule</Button>}
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        {p && (
          <>
            <div className="print-only" style={{ marginBottom: 16 }}>
              <div className="ix-brand"><span className="ix-brand-mark">IX</span><span className="ix-brand-name">Insure<span className="x">X</span></span></div>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>Policy schedule for {fullName(p.customer)} ({p.customer?.customerNumber}), generated {dateTime(generatedAt)}</p>
            </div>
            <PageHead
              eyebrow={p.policyNumber}
              title={p.policyType?.name}
              sub={p.company?.name ? `Underwritten by ${p.company.name}` : undefined}
              actions={<StatusBadge status={p.status} />}
            />
            <div className="cp-stack">
              {flash && <Notice tone="ok">{flash}</Notice>}
              {openRenewal && (
                <Notice>
                  Renewal {openRenewal.renewalNumber} is {titleCase(openRenewal.status).toLowerCase()}: new term {date(openRenewal.newStartDate)} – {date(openRenewal.newExpiryDate)}, renewal premium {inr(openRenewal.renewalPremium)}.
                </Notice>
              )}
              {canRequest && (
                <div className="no-print">
                  <Notice tone="warn">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <span>This policy {days >= 0 ? `expires ${relativeDays(p.expiryDate)}` : `expired ${relativeDays(p.expiryDate)} and is in its grace period`}. You can request a renewal on the same terms.</span>
                      <Button size="sm" icon={RefreshCcw} onClick={() => { setError(null); setConfirm(true) }}>Request renewal</Button>
                    </div>
                  </Notice>
                </div>
              )}

              <Panel title="Coverage">
                <Facts items={[
                  ['Sum assured', inr(p.sumAssured)],
                  ['Premium', `${inr(p.premiumAmount, { exact: true })} · ${titleCase(p.premiumFrequency)}`],
                  ['Policy period', `${date(p.startDate)} – ${date(p.expiryDate)}`],
                  ['Status', titleCase(p.status)],
                  ['Outstanding premium', inr(outstanding, { exact: true })],
                  ['Next due', nextDue ? `${date(nextDue.dueDate)} (${relativeDays(nextDue.dueDate)})` : 'Nothing due'],
                  p.agent && ['Your agent', `${fullName(p.agent)}${p.agent.phone ? ` · ${p.agent.phone}` : ''}`],
                ]} />
                {p.policyType?.coverageDetails && (
                  <details className="cp-details" style={{ marginTop: 16 }}>
                    <summary>What this plan covers</summary>
                    <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{p.policyType.coverageDetails}</p>
                  </details>
                )}
                {p.policyType?.terms && (
                  <details className="cp-details" style={{ marginTop: 8 }}>
                    <summary>Terms</summary>
                    <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{p.policyType.terms}</p>
                  </details>
                )}
              </Panel>

              <Panel
                flush
                title="Premium schedule"
                action={outstanding > 0 && <Link className="btn btn-primary btn-sm no-print" to={nextDue ? `/user/payments?premium=${nextDue.id}` : '/user/payments'}><Wallet size={14} aria-hidden="true" /> Pay</Link>}
              >
                {p.premiums.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>No premium installments on record.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table" style={{ minWidth: 560 }}>
                      <thead>
                        <tr><th>Installment</th><th>Due</th><th className="numeric">Amount</th><th className="numeric">Paid</th><th className="numeric">Balance</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {p.premiums.map((x) => (
                          <tr key={x.id}>
                            <td className="mono">{x.premiumNumber}</td>
                            <td className="nowrap">{date(x.dueDate)}</td>
                            <td className="numeric">{inr(x.amount, { exact: true })}</td>
                            <td className="numeric">{inr(x.paidAmount, { exact: true })}</td>
                            <td className="numeric">{inr(x.remainingBalance, { exact: true })}</td>
                            <td><StatusBadge status={x.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <div className="px-grid cols-2">
                <Panel flush title="Beneficiaries" note={p.beneficiaries.length ? `${p.beneficiaries.reduce((s, b) => s + Number(b.allocationPercentage), 0)}% allocated` : undefined}>
                  {p.beneficiaries.length === 0 ? (
                    <p className="muted" style={{ padding: 18, margin: 0 }}>No beneficiaries recorded. Contact your agent to add a nominee.</p>
                  ) : (
                    <ul className="rows">
                      {p.beneficiaries.map((b) => (
                        <li key={b.id} className="row">
                          <div className="row-main"><div className="row-title">{b.name}</div><div className="row-meta">{b.relationship}</div></div>
                          <div className="row-end row-amount">{Number(b.allocationPercentage)}%</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel flush title="Claims on this policy" action={p.status === 'ACTIVE' && <Link to={`/user/claims/new?policy=${p.id}`} className="panel-link no-print"><FilePlus2 size={14} aria-hidden="true" /> File a claim</Link>}>
                  {p.claims.length === 0 ? (
                    <p className="muted" style={{ padding: 18, margin: 0 }}>No claims filed.</p>
                  ) : (
                    <ul className="rows">
                      {p.claims.map((c) => (
                        <li key={c.id}>
                          <Link to={`/user/claims/${c.id}`} className="row">
                            <div className="row-main"><div className="row-title">{c.claimNumber}</div><div className="row-meta">{date(c.claimDate)} · {inr(c.claimedAmount)}</div></div>
                            <StatusBadge status={c.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <Panel flush title="Renewal history">
                {p.renewals.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>
                    No renewals yet.{p.status === 'ACTIVE' && !inWindow && days > WINDOW_BEFORE ? ` Renewal opens ${WINDOW_BEFORE} days before expiry.` : ''}
                  </p>
                ) : (
                  <ul className="rows">
                    {p.renewals.map((r) => (
                      <li key={r.id} className="row">
                        <div className="row-main">
                          <div className="row-title">{r.renewalNumber}</div>
                          <div className="row-meta">{date(r.newStartDate)} – {date(r.newExpiryDate)} · {inr(r.renewalPremium)}</div>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <ConfirmDialog
              open={confirm}
              title="Request renewal?"
              confirmLabel="Request renewal"
              pending={pending}
              error={actionError}
              onConfirm={requestRenewal}
              onClose={() => setConfirm(false)}
            >
              <p style={{ marginTop: 0 }}>
                We'll prepare a renewal of {p.policyNumber} for another year on the same terms, starting {date(p.expiryDate)}.
                The renewal premium will be billed after the renewal is processed.
              </p>
              <Input label="Note for InsureX (optional)" id="renew-note" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </ConfirmDialog>
          </>
        )}
      </DataState>
    </div>
  )
}
