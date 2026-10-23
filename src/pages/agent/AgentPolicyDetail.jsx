import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCcw, Phone } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, fullName, titleCase, daysUntil } from '../../lib/format'
import { PageHead, Panel, Facts, DataState, Notice, ConfirmDialog } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const OPEN_RENEWAL = ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD']

export default function AgentPolicyDetail() {
  const { id } = useParams()
  const { data: p, loading, error, reload } = useApi(`/agent/policies/${id}`)
  const [confirm, setConfirm] = useState(false)
  const [flash, setFlash] = useState(null)
  const action = useAction()

  if (!p) {
    return (
      <div className="px-page">
        <Link to="/agent/policies" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} /> Policies</Link>
        <Panel><DataState loading={loading} error={error} onRetry={reload} /></Panel>
      </div>
    )
  }

  const totalBilled = p.premiums.reduce((s, x) => s + Number(x.amount), 0)
  const totalPaid = p.premiums.reduce((s, x) => s + Number(x.paidAmount), 0)
  const paidPct = totalBilled ? Math.round((totalPaid / totalBilled) * 100) : 0
  const daysLeft = daysUntil(p.expiryDate)
  const hasOpenRenewal = p.renewals.some((r) => OPEN_RENEWAL.includes(r.status))
  // Server allows renewal requests from 60 days before expiry until 30 days after
  const canRequestRenewal = ['ACTIVE', 'EXPIRED'].includes(p.status) && !hasOpenRenewal && daysLeft <= 60 && daysLeft >= -30

  async function requestRenewal() {
    try {
      await action.run(() => api.post('/agent/renewals', { policyId: p.id }))
      setConfirm(false)
      setFlash('Renewal opened. An administrator will complete it once the renewal premium is settled.')
      reload()
    } catch {
      /* shown in dialog */
    }
  }

  return (
    <div className="px-page">
      <Link to="/agent/policies" className="panel-link" style={{ marginBottom: 12, display: 'inline-flex' }}><ArrowLeft size={14} aria-hidden="true" /> Policies</Link>
      <PageHead
        eyebrow={p.policyNumber}
        title={p.policyType.name}
        sub={`${fullName(p.customer)} · ${date(p.startDate)} – ${date(p.expiryDate)}`}
        actions={
          <>
            <StatusBadge status={p.status} />
            {canRequestRenewal && <Button size="sm" icon={RefreshCcw} onClick={() => { action.setError(null); setConfirm(true) }}>Open renewal</Button>}
          </>
        }
      />

      {flash && <Notice tone="ok" style={{ marginBottom: 16 }}>{flash}</Notice>}
      {p.status === 'ACTIVE' && daysLeft >= 0 && daysLeft <= 60 && !hasOpenRenewal && (
        <Notice tone="warn" style={{ marginBottom: 16 }}>This policy expires in {daysLeft} days. Talk to the customer about renewing.</Notice>
      )}

      <div className="px-grid main-side">
        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel title="Cover">
            <Facts items={[
              ['Sum assured', inr(p.sumAssured)],
              ['Installment', `${inr(p.premiumAmount)} · ${titleCase(p.premiumFrequency)}`],
              ['Insurer', p.company?.name || '—'],
              ['Start date', date(p.startDate)],
              ['Expiry date', date(p.expiryDate)],
            ]} />
            {p.policyType.coverageDetails && <p className="muted" style={{ margin: '14px 0 0', fontSize: 13 }}>{p.policyType.coverageDetails}</p>}
          </Panel>

          <Panel flush title="Premium schedule" note={`${inr(totalPaid)} paid of ${inr(totalBilled)} billed`}>
            <div style={{ padding: '12px 18px 4px' }}>
              <div className="meter" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of billed premium paid">
                <span style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <DataState empty={p.premiums.length === 0} emptyText="No premium installments have been billed.">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Installment</th>
                      <th scope="col">Due</th>
                      <th scope="col" className="numeric">Amount</th>
                      <th scope="col" className="numeric">Paid</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.premiums.map((x) => (
                      <tr key={x.id}>
                        <td className="mono">{x.premiumNumber}</td>
                        <td className="nowrap">{date(x.dueDate)}</td>
                        <td className="numeric">{inr(x.amount)}</td>
                        <td className="numeric">{inr(x.paidAmount)}</td>
                        <td><StatusBadge status={x.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataState>
          </Panel>

          <Panel flush title="Renewals">
            <DataState empty={p.renewals.length === 0} emptyText="No renewals on record for this policy.">
              <ul className="rows">
                {p.renewals.map((r) => (
                  <li key={r.id} className="row">
                    <div className="row-main">
                      <div className="row-title">{r.renewalNumber}</div>
                      <div className="row-meta">New term {date(r.newStartDate)} – {date(r.newExpiryDate)} · {inr(r.renewalPremium)}</div>
                    </div>
                    <div className="row-end"><StatusBadge status={r.status} /></div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>

        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel title="Policyholder">
            <Facts items={[
              ['Name', <Link key="n" to={`/agent/customers/${p.customer.id}`} className="table-link">{fullName(p.customer)}</Link>],
              ['Customer number', <span key="c" className="mono">{p.customer.customerNumber}</span>],
              ['Email', p.customer.email],
            ]} />
            {p.customer.phone && (
              <a href={`tel:${p.customer.phone.replace(/\s+/g, '')}`} className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
                <Phone size={14} aria-hidden="true" /> Call {p.customer.phone}
              </a>
            )}
          </Panel>

          <Panel flush title="Beneficiaries">
            <DataState empty={p.beneficiaries.length === 0} emptyText="No beneficiaries recorded.">
              <ul className="rows">
                {p.beneficiaries.map((b) => (
                  <li key={b.id} className="row">
                    <div className="row-main">
                      <div className="row-title">{b.name}</div>
                      <div className="row-meta">{b.relationship}</div>
                    </div>
                    <div className="row-end num">{Number(b.allocationPercentage)}%</div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Claims">
            <DataState empty={p.claims.length === 0} emptyText="No claims against this policy.">
              <ul className="rows">
                {p.claims.map((c) => (
                  <li key={c.id}>
                    <Link to={`/agent/claims/${c.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{c.claimNumber}</div>
                        <div className="row-meta">{date(c.claimDate)} · {inr(c.claimedAmount)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={c.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Open a renewal"
        confirmLabel="Open renewal"
        pending={action.pending}
        error={action.error}
        onConfirm={requestRenewal}
        onClose={() => setConfirm(false)}
      >
        Open a one-year renewal of <strong>{p.policyNumber}</strong> on the same terms, starting {date(p.expiryDate)}.
        The renewal premium will be one year of installments at {inr(p.premiumAmount)} ({titleCase(p.premiumFrequency).toLowerCase()}).
      </ConfirmDialog>
    </div>
  )
}
