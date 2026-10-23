import { Link } from 'react-router-dom'
import { Compass, FilePlus2, Upload, Wallet, RefreshCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../lib/useApi'
import { inr, inrCompact, date, relativeDays, daysUntil, timeAgo, titleCase } from '../../lib/format'
import { Panel, PanelLink, DataState, Steps, Notice } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import { APP_STEPS, appStepProps } from './CustomerApplications'
import '../../styles/user.css'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function CustomerHome() {
  const { user } = useAuth()
  const { data: o, loading, error, reload } = useApi('/me/overview')

  const next = o?.upcomingPremiums?.[0]
  const overdueCount = o?.upcomingPremiums?.filter((p) => p.status === 'OVERDUE').length || 0
  const firstName = o?.profile?.firstName || user?.name?.split(' ')[0]

  return (
    <div className="px-page">
      <section className="cp-welcome" aria-label="Summary">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p>{o?.profile?.customerNumber ? `Customer ${o.profile.customerNumber}` : 'Welcome to your InsureX portal'}</p>
        </div>
        {o && (
          <dl className="cp-welcome-facts">
            <div><dt>Active policies</dt><dd>{o.activePolicies.length}</dd></div>
            <div><dt>Total cover</dt><dd>{inrCompact(o.totalCover)}</dd></div>
            <div>
              <dt>Next premium</dt>
              <dd>{next ? inr(next.remainingBalance) : '—'}</dd>
              {next && <dt style={{ marginTop: 2 }}>{daysUntil(next.dueDate) < 0 ? 'overdue since' : 'due'} {date(next.dueDate)}</dt>}
            </div>
          </dl>
        )}
      </section>

      <nav className="cp-shortcuts" aria-label="Quick actions">
        <Link to="/user/plans" className="cp-shortcut"><Compass size={20} aria-hidden="true" /><span>Explore plans<small>Compare cover and apply online</small></span></Link>
        <Link to="/user/claims/new" className="cp-shortcut"><FilePlus2 size={20} aria-hidden="true" /><span>File a claim<small>Against an active policy</small></span></Link>
        <Link to="/user/documents" className="cp-shortcut"><Upload size={20} aria-hidden="true" /><span>Upload a document<small>ID, income or claim evidence</small></span></Link>
      </nav>

      <DataState loading={loading} error={error} onRetry={reload} rows={6}>
        {o && (
          <div className="px-grid main-side">
            <div className="cp-stack">
              {overdueCount > 0 && (
                <Notice tone="warn">
                  {overdueCount === 1 ? 'One premium is' : `${overdueCount} premiums are`} overdue. <Link to="/user/payments" className="panel-link">Review payments</Link>
                </Notice>
              )}

              <Panel flush title="Your policies" action={<PanelLink to="/user/policies">All policies</PanelLink>}>
                {o.activePolicies.length === 0 ? (
                  <div style={{ padding: 18 }}>
                    <p className="muted" style={{ margin: '0 0 12px' }}>You don't have an active policy yet.</p>
                    <Link to="/user/plans" className="btn btn-primary btn-sm">Find a plan</Link>
                  </div>
                ) : (
                  <div>
                    {o.activePolicies.map((p) => (
                      <Link key={p.id} to={`/user/policies/${p.id}`} className="cp-policy">
                        <div className="cp-policy-top">
                          <div style={{ minWidth: 0 }}>
                            <div className="cp-policy-name">{p.policyType?.name}</div>
                            <div className="mono">{p.policyNumber}</div>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="cp-policy-facts">
                          <span>Cover <strong>{inr(p.sumAssured)}</strong></span>
                          <span>Premium <strong>{inr(p.premiumAmount)}</strong> {titleCase(p.premiumFrequency).toLowerCase()}</span>
                          <span>Renews <strong>{date(p.expiryDate)}</strong></span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel flush title="Upcoming premiums" action={<PanelLink to="/user/payments">Payments</PanelLink>}>
                {o.upcomingPremiums.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>Nothing due. You're all paid up.</p>
                ) : (
                  <div>
                    {o.upcomingPremiums.map((p) => (
                      <div key={p.id} className="cp-item">
                        <div className="cp-item-main">
                          <div className="cp-item-title">{p.policy?.policyType?.name}</div>
                          <div className="cp-item-meta" style={daysUntil(p.dueDate) < 0 ? { color: 'var(--status-red-text)' } : undefined}>
                            {p.policy?.policyNumber} · due {date(p.dueDate)} ({relativeDays(p.dueDate)})
                          </div>
                        </div>
                        <div className="cp-item-end">
                          <span className="cp-amount">{inr(p.remainingBalance, { exact: true })}</span>
                          <Link to={`/user/payments?premium=${p.id}`} className="btn btn-secondary btn-sm"><Wallet size={14} aria-hidden="true" /> Pay</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {o.pendingApplications.length > 0 && (
                <Panel flush title="Applications in progress" action={<PanelLink to="/user/applications">All applications</PanelLink>}>
                  <div>
                    {o.pendingApplications.map((a) => (
                      <Link key={a.id} to={`/user/applications/${a.id}`} className="cp-app-progress" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div className="cp-item-title">{a.policyType?.name}</div>
                            <div className="cp-item-meta">{a.applicationNumber} · applied {date(a.applicationDate)} · cover {inr(a.requestedCoverage)}</div>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <Steps steps={APP_STEPS} {...appStepProps(a.status)} />
                      </Link>
                    ))}
                  </div>
                </Panel>
              )}

              {o.openClaims.length > 0 && (
                <Panel flush title="Your claims" action={<PanelLink to="/user/claims">All claims</PanelLink>}>
                  <div>
                    {o.openClaims.map((c) => (
                      <Link key={c.id} to={`/user/claims/${c.id}`} className="cp-item">
                        <div className="cp-item-main">
                          <div className="cp-item-title">{titleCase(c.claimType)} claim</div>
                          <div className="cp-item-meta">{c.claimNumber} · filed {date(c.claimDate)} · {inr(c.claimedAmount)}</div>
                        </div>
                        <StatusBadge status={c.status} />
                      </Link>
                    ))}
                  </div>
                </Panel>
              )}
            </div>

            <div className="cp-stack">
              <Panel flush title="Renewals" action={<PanelLink to="/user/renewals">Renewals</PanelLink>}>
                {o.renewalOpportunities.length === 0 && o.renewalsDue.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>No renewals due in the next 60 days.</p>
                ) : (
                  <ul className="rows">
                    {o.renewalOpportunities.map((p) => (
                      <li key={p.id}>
                        <Link to={`/user/policies/${p.id}`} className="row">
                          <RefreshCcw size={16} aria-hidden="true" style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <div className="row-main">
                            <div className="row-title">{p.policyType?.name}</div>
                            <div className="row-meta">{p.policyNumber} expires {relativeDays(p.expiryDate)}. Request renewal</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                    {o.renewalsDue.map((r) => (
                      <li key={r.id} className="row">
                        <div className="row-main">
                          <div className="row-title">{r.renewalNumber}</div>
                          <div className="row-meta">{r.policy?.policyNumber} · from {date(r.newStartDate)} · {inr(r.renewalPremium)}</div>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel flush title="Recent activity">
                {o.recentActivity.length === 0 ? (
                  <p className="muted" style={{ padding: 18, margin: 0 }}>Activity on your account will appear here.</p>
                ) : (
                  <ul className="rows">
                    {o.recentActivity.map((a) => (
                      <li key={a.id} className="row" style={{ alignItems: 'flex-start' }}>
                        <div className="row-main">
                          <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{a.summary}</div>
                          <div className="row-meta">{timeAgo(a.createdAt)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {o.profile?.assignedAgent && (
                <Panel title="Need help?">
                  <p style={{ margin: 0, fontSize: 13.5 }}>
                    Your agent <strong>{o.profile.assignedAgent.firstName} {o.profile.assignedAgent.lastName}</strong> can help with cover, claims and renewals.
                  </p>
                  {o.profile.assignedAgent.phone && (
                    <a href={`tel:${o.profile.assignedAgent.phone}`} className="panel-link" style={{ marginTop: 8, display: 'inline-flex' }}>Call {o.profile.assignedAgent.phone}</a>
                  )}
                </Panel>
              )}
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
