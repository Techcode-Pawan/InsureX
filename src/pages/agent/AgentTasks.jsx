import { Link } from 'react-router-dom'
import { CalendarClock, FileWarning, FolderOpen, AlertCircle, RefreshCcw, Phone } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, relativeDays, fullName } from '../../lib/format'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHead, Panel, PanelLink, KpiBand, Kpi, DataState } from '../../components/panel'

// Every item comes from the agent-scoped API (/api/agent/*), so only the agent's own book appears.
function Section({ id, title, note, icon: Icon, to, linkLabel, state, empty, children }) {
  return (
    <Panel id={id} flush title={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icon size={16} aria-hidden="true" />{title}</span>} note={note} action={<PanelLink to={to}>{linkLabel}</PanelLink>}>
      <DataState loading={state.loading} error={state.error} onRetry={state.reload} empty={empty} emptyText="Nothing to follow up here.">
        <ul className="rows">{children}</ul>
      </DataState>
    </Panel>
  )
}

export default function AgentTasks() {
  const overdue = useApi('/agent/premiums', { status: 'OVERDUE', limit: 8 })
  const docs = useApi('/agent/documents', { status: 'NEEDS_INFO', limit: 8 })
  const pendingDocs = useApi('/agent/documents', { status: 'PENDING', limit: 8 })
  const apps = useApi('/agent/applications', { status: 'PENDING', limit: 8 })
  const claims = useApi('/agent/claims', { status: 'UNDER_REVIEW', limit: 8 })
  const renewals = useApi('/agent/renewals')

  const opportunities = renewals.data?.opportunities || []
  const docRows = [...(docs.data || []), ...(pendingDocs.data || [])]
  const docState = { loading: docs.loading || pendingDocs.loading, error: docs.error || pendingDocs.error, reload: () => { docs.reload(); pendingDocs.reload() } }

  return (
    <div className="px-page">
      <PageHead eyebrow="Tasks & follow-ups" title="What needs your attention" sub="Built from your assigned customers' live records. Items drop off automatically once they are resolved." />

      <KpiBand cols={5}>
        <Kpi label="Overdue premiums" value={overdue.body ? overdue.body.total : '—'} tone={overdue.body?.total ? 'bad' : ''} to="#overdue" />
        <Kpi label="Documents" value={docs.body && pendingDocs.body ? docs.body.total + pendingDocs.body.total : '—'} foot="pending or needing info" to="#documents" />
        <Kpi label="Pending applications" value={apps.body ? apps.body.total : '—'} to="#applications" />
        <Kpi label="Claims under review" value={claims.body ? claims.body.total : '—'} to="#claims" />
        <Kpi label="Renewals to open" value={renewals.data ? opportunities.length : '—'} foot="expiring within 90 days" to="#renewals" />
      </KpiBand>

      <div className="px-grid cols-2">
        <Section id="overdue" title="Overdue premiums" note="Call the customer to arrange payment" icon={CalendarClock} to="/agent/premiums" linkLabel="All dues" state={overdue} empty={overdue.data?.length === 0}>
          {overdue.data?.map((p) => (
            <li key={p.id} className="row">
              <div className="row-main">
                <div className="row-title">{fullName(p.policy?.customer)}</div>
                <div className="row-meta"><span className="mono">{p.policy?.policyNumber}</span> · due {date(p.dueDate)} ({relativeDays(p.dueDate)})</div>
              </div>
              <div className="row-end"><div className="row-amount">{inr(p.remainingBalance)}</div><StatusBadge status={p.status} /></div>
            </li>
          ))}
        </Section>

        <Section id="documents" title="Documents" note="Chase missing information or files awaiting review" icon={FileWarning} to="/agent/documents" linkLabel="Documents" state={docState} empty={docRows.length === 0}>
          {docRows.slice(0, 8).map((d) => (
            <li key={d.id}>
              <Link to={`/agent/customers/${d.customer?.id}`} className="row">
                <div className="row-main">
                  <div className="row-title">{d.name}</div>
                  <div className="row-meta">{fullName(d.customer)} · {d.documentType} · {date(d.submissionDate)}</div>
                </div>
                <div className="row-end"><StatusBadge status={d.verificationStatus} /></div>
              </Link>
            </li>
          ))}
        </Section>

        <Section id="applications" title="Pending applications" note="Awaiting underwriting; make sure documents are complete" icon={FolderOpen} to="/agent/applications" linkLabel="Applications" state={apps} empty={apps.data?.length === 0}>
          {apps.data?.map((a) => (
            <li key={a.id}>
              <Link to={`/agent/applications/${a.id}`} className="row">
                <div className="row-main">
                  <div className="row-title">{fullName(a.customer)} · {a.policyType?.name}</div>
                  <div className="row-meta"><span className="mono">{a.applicationNumber}</span> · submitted {relativeDays(a.applicationDate)}</div>
                </div>
                <div className="row-end row-amount">{inr(a.requestedCoverage)}</div>
              </Link>
            </li>
          ))}
        </Section>

        <Section id="claims" title="Claims under review" note="Support the customer while the claim is assessed" icon={AlertCircle} to="/agent/claims" linkLabel="Claims" state={claims} empty={claims.data?.length === 0}>
          {claims.data?.map((c) => (
            <li key={c.id}>
              <Link to={`/agent/claims/${c.id}`} className="row">
                <div className="row-main">
                  <div className="row-title">{fullName(c.customer)} · {c.claimType}</div>
                  <div className="row-meta"><span className="mono">{c.claimNumber}</span> · {date(c.claimDate)}</div>
                </div>
                <div className="row-end"><div className="row-amount">{inr(c.claimedAmount)}</div><StatusBadge status={c.status} /></div>
              </Link>
            </li>
          ))}
        </Section>
      </div>

      <div style={{ height: 16 }} />
      <Section id="renewals" title="Renewals to open" note="Policies expiring within 90 days without an open renewal" icon={RefreshCcw} to="/agent/renewals" linkLabel="Renewals" state={renewals} empty={opportunities.length === 0}>
        {opportunities.slice(0, 10).map((p) => (
          <li key={p.id} className="row">
            <div className="row-main">
              <div className="row-title">{fullName(p.customer)} · {p.policyType?.name}</div>
              <div className="row-meta"><span className="mono">{p.policyNumber}</span> · expires {date(p.expiryDate)} ({relativeDays(p.expiryDate)})</div>
            </div>
            <div className="row-end">
              {p.customer?.phone && <a className="panel-link" href={`tel:${p.customer.phone}`}><Phone size={13} aria-hidden="true" /> {p.customer.phone}</a>}
            </div>
          </li>
        ))}
      </Section>
    </div>
  )
}
