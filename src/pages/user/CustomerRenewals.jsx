import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { inr, date, daysUntil, relativeDays } from '../../lib/format'
import { PageHead, Panel, DataState, Notice } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import '../../styles/user.css'

const WINDOW_BEFORE = 60
const GRACE_AFTER = 30

export default function CustomerRenewals() {
  const renewals = useApi('/me/renewals')
  const policies = useApi('/me/policies', { limit: 50 })

  const openPolicyIds = new Set((renewals.data || []).filter((r) => ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD'].includes(r.status)).map((r) => r.policyId))
  const eligible = (policies.data || []).filter((p) => {
    const d = daysUntil(p.expiryDate)
    return ['ACTIVE', 'EXPIRED'].includes(p.status) && d <= WINDOW_BEFORE && d >= -GRACE_AFTER && !openPolicyIds.has(p.id)
  })
  const upcoming = (policies.data || [])
    .filter((p) => p.status === 'ACTIVE' && daysUntil(p.expiryDate) > WINDOW_BEFORE)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))

  return (
    <div className="px-page">
      <PageHead title="Renewals" sub={`Renewal opens ${WINDOW_BEFORE} days before a policy expires, with a ${GRACE_AFTER}-day grace period after expiry.`} />
      <div className="cp-stack">
        {eligible.length > 0 && (
          <Panel flush title="Ready to renew" note="These policies are inside the renewal window.">
            <div>
              {eligible.map((p) => (
                <div key={p.id} className="cp-item">
                  <div className="cp-item-main">
                    <div className="cp-item-title">{p.policyType?.name} · {p.policyNumber}</div>
                    <div className="cp-item-meta">
                      {daysUntil(p.expiryDate) >= 0 ? `Expires ${date(p.expiryDate)} (${relativeDays(p.expiryDate)})` : `Expired ${date(p.expiryDate)}, in grace period`}
                    </div>
                  </div>
                  <div className="cp-item-end">
                    <Link to={`/user/policies/${p.id}`} className="btn btn-primary btn-sm">Review &amp; request renewal</Link>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel flush title="Renewal requests">
          <DataState loading={renewals.loading} error={renewals.error} onRetry={renewals.reload} empty={renewals.data?.length === 0} emptyText="No renewals yet.">
            <div>
              {renewals.data?.map((r) => (
                <Link key={r.id} to={`/user/policies/${r.policyId}`} className="cp-item">
                  <div className="cp-item-main">
                    <div className="cp-item-title">{r.policy?.policyType?.name} · {r.policy?.policyNumber}</div>
                    <div className="cp-item-meta">
                      <span className="mono">{r.renewalNumber}</span> · New term {date(r.newStartDate)} – {date(r.newExpiryDate)}
                      {r.renewalDate && ` · Renewed ${date(r.renewalDate)}`}
                    </div>
                  </div>
                  <div className="cp-item-end">
                    <span className="cp-amount">{inr(r.renewalPremium)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          </DataState>
        </Panel>

        {policies.data && upcoming.length > 0 && (
          <Panel flush title="Coming up later">
            <ul className="rows">
              {upcoming.map((p) => (
                <li key={p.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{p.policyType?.name} · {p.policyNumber}</div>
                    <div className="row-meta">Expires {date(p.expiryDate)} · renewal opens {relativeDays(new Date(new Date(p.expiryDate).getTime() - WINDOW_BEFORE * 86400000))}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {policies.error && <Notice tone="error">{policies.error.message}</Notice>}
      </div>
    </div>
  )
}
