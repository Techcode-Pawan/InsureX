import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FolderOpen, CheckCircle2, Shield, RefreshCcw, Archive, Phone, UserPlus, FilePlus2, Upload,
} from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, relativeDays, daysUntil, fullName, timeAgo } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Panel, PanelLink, KpiBand, Kpi, DataState, Notice, ConfirmDialog } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const STATUS_ORDER = { OVERDUE: 0, GRACE_PERIOD: 1, PARTIALLY_PAID: 2, DUE: 3 }

export default function AgentWorkspace() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi('/agent/overview')
  const [renewTarget, setRenewTarget] = useState(null)
  const [flash, setFlash] = useState(null)
  const action = useAction()
  // Computed once per visit (render must stay pure)
  const [today] = useState(() => ({
    label: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    greeting: greeting(),
  }))

  const profile = data?.profile
  const m = data?.metrics
  const followUps = [...(data?.followUpPremiums || [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || new Date(a.dueDate) - new Date(b.dueDate)
  )

  async function openRenewal() {
    try {
      await action.run(() => api.post('/agent/renewals', { policyId: renewTarget.id }))
      setFlash(`Renewal opened for ${renewTarget.policyNumber}. An administrator will process it.`)
      setRenewTarget(null)
      reload()
    } catch {
      /* error shown in dialog */
    }
  }

  return (
    <div className="px-page">
      <PageHead
        eyebrow={today.label}
        title={`${today.greeting}, ${profile?.firstName || user?.name?.split(' ')[0] || ''}`}
        sub={profile ? `${profile.agentNumber} · ${profile.region} · ${profile.specialization}${profile.company ? ` · ${profile.company.name}` : ''}` : 'Your book of business at a glance.'}
        actions={
          <>
            <Link to="/agent/customers/new" className="btn btn-secondary btn-sm"><UserPlus size={15} aria-hidden="true" /> Register customer</Link>
            <Link to="/agent/applications/new" className="btn btn-secondary btn-sm"><FilePlus2 size={15} aria-hidden="true" /> New application</Link>
            <Link to="/agent/documents?upload=1" className="btn btn-secondary btn-sm"><Upload size={15} aria-hidden="true" /> Upload document</Link>
          </>
        }
      />

      {flash && <Notice tone="ok" style={{ marginBottom: 16 }}>{flash}</Notice>}
      {error && <Notice tone="error" style={{ marginBottom: 16 }}>{error.message} <button type="button" className="panel-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={reload}>Retry</button></Notice>}

      <KpiBand cols={6}>
        <Kpi icon={Users} label="Assigned customers" value={m ? m.assignedCustomers : '—'} to="/agent/customers" />
        <Kpi icon={FolderOpen} label="Applications in progress" value={m ? m.applicationsInProgress : '—'} to="/agent/applications?status=PENDING" foot="Awaiting underwriting" />
        <Kpi icon={CheckCircle2} label="Approved applications" value={m ? m.approvedApplications : '—'} to="/agent/applications?status=APPROVED" />
        <Kpi icon={Shield} label="Policies managed" value={m ? m.policiesManaged : '—'} to="/agent/policies" foot="Active" />
        <Kpi icon={RefreshCcw} label="Upcoming renewals" value={m ? m.upcomingRenewals : '—'} to="/agent/renewals" foot="Expiring in 60 days" tone={m?.upcomingRenewals ? 'warn' : ''} />
        <Kpi icon={Archive} label="Pending documents" value={m ? m.pendingDocuments : '—'} to="/agent/documents?status=PENDING" tone={m?.pendingDocuments ? 'warn' : ''} />
      </KpiBand>

      <div className="px-grid main-side">
        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel
            flush
            title="Follow up today"
            note="Premiums overdue or due within 30 days, most urgent first"
            action={<PanelLink to="/agent/premiums">All dues</PanelLink>}
          >
            <DataState loading={loading} error={null} empty={followUps.length === 0} emptyText="No premium follow-ups needed right now. Every installment in your book is paid or not yet due.">
              <ul className="rows">
                {followUps.map((p) => {
                  const c = p.policy.customer
                  const d = daysUntil(p.dueDate)
                  return (
                    <li key={p.id} className="row">
                      <div className="row-main">
                        <div className="row-title">
                          <Link to={`/agent/customers/${c.id}`} className="table-link">{fullName(c)}</Link>
                        </div>
                        <div className="row-meta">
                          {p.policy.policyNumber} · {p.premiumNumber} · due {date(p.dueDate)} ({relativeDays(p.dueDate)})
                        </div>
                      </div>
                      <div className="row-end">
                        <div className="row-amount">{inr(p.remainingBalance)}</div>
                        <div style={{ marginTop: 2 }}><StatusBadge status={d < 0 && p.status === 'DUE' ? 'OVERDUE' : p.status} /></div>
                      </div>
                      {c.phone && (
                        <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="icon-btn" aria-label={`Call ${fullName(c)} on ${c.phone}`} title={c.phone}>
                          <Phone size={16} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </DataState>
          </Panel>

          <Panel
            flush
            title="Renewal opportunities"
            note="Policies in your book expiring within 60 days"
            action={<PanelLink to="/agent/renewals">Renewals</PanelLink>}
          >
            <DataState loading={loading} error={null} empty={(data?.expiringPolicies || []).length === 0} emptyText="No policies in your book expire in the next 60 days.">
              <ul className="rows">
                {data?.expiringPolicies.map((p) => (
                  <li key={p.id} className="row">
                    <div className="row-main">
                      <div className="row-title">
                        <Link to={`/agent/policies/${p.id}`} className="table-link">{p.policyNumber}</Link> · {p.policyType.name}
                      </div>
                      <div className="row-meta">
                        {fullName(p.customer)}{p.customer.phone ? ` · ${p.customer.phone}` : ''} · expires {date(p.expiryDate)} ({relativeDays(p.expiryDate)})
                      </div>
                    </div>
                    <div className="row-end">
                      {p.renewalStatus ? (
                        <StatusBadge status={p.renewalStatus} />
                      ) : (
                        <Button size="sm" variant="secondary" icon={RefreshCcw} onClick={() => { action.setError(null); setRenewTarget(p) }}>
                          Open renewal
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>

        <div className="px-grid" style={{ alignContent: 'start' }}>
          <Panel flush title="Recent applications" action={<PanelLink to="/agent/applications">All</PanelLink>}>
            <DataState loading={loading} error={null} empty={(data?.recentApplications || []).length === 0} emptyText="No applications yet. Start one for a customer in your book.">
              <ul className="rows">
                {data?.recentApplications.map((a) => (
                  <li key={a.id}>
                    <Link to={`/agent/applications/${a.id}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{fullName(a.customer)}</div>
                        <div className="row-meta">{a.applicationNumber} · {a.policyType.name} · {inr(a.requestedCoverage)}</div>
                      </div>
                      <div className="row-end"><StatusBadge status={a.status} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>

          <Panel flush title="Recent activity" note="Events on your customers' records">
            <DataState loading={loading} error={null} empty={(data?.recentActivity || []).length === 0} emptyText="No recorded activity on your book yet.">
              <ul className="rows">
                {data?.recentActivity.map((e) => (
                  <li key={e.id} className="row">
                    <div className="row-main">
                      <div className="row-meta" style={{ whiteSpace: 'normal', color: 'var(--color-text-primary)' }}>{e.summary}</div>
                    </div>
                    <div className="row-end muted" style={{ fontSize: 12 }}>{timeAgo(e.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </DataState>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(renewTarget)}
        title="Open a renewal"
        confirmLabel="Open renewal"
        pending={action.pending}
        error={action.error}
        onConfirm={openRenewal}
        onClose={() => setRenewTarget(null)}
      >
        {renewTarget && (
          <>
            This opens a renewal for policy <strong>{renewTarget.policyNumber}</strong> ({fullName(renewTarget.customer)}) on the
            same terms for one more year, starting {date(renewTarget.expiryDate)}. An administrator completes the renewal once the
            renewal premium is settled. Renewals can be opened from 60 days before expiry.
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
