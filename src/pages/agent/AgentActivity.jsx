import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Shield, Wallet, AlertCircle, Archive, RefreshCcw, Users, Activity, UserCog } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { titleCase, timeAgo, dateTime } from '../../lib/format'
import { PageHead, Panel, DataState, Pager, Segmented } from '../../components/panel'
import { RefreshBar } from '../../components/charts'

const POLL_MS = 60000

// Entity types recorded by the server's activity log (server/src/lib/events.js callers)
const FILTERS = [
  { value: '', label: 'All' },
  { value: 'InsuranceApplication', label: 'Applications' },
  { value: 'InsurancePolicy', label: 'Policies' },
  { value: 'PremiumPayment', label: 'Payments' },
  { value: 'Claim', label: 'Claims' },
  { value: 'PolicyRenewal', label: 'Renewals' },
  { value: 'Document', label: 'Documents' },
  { value: 'Customer', label: 'Customers' },
]

const ICONS = {
  InsuranceApplication: [FolderOpen, '#168BFF', '#EAF4FF'],
  InsurancePolicy: [Shield, '#0891B2', '#E6F7FF'],
  PremiumPayment: [Wallet, '#047857', '#ECFDF5'],
  Claim: [AlertCircle, '#B45309', '#FFFBEB'],
  PolicyRenewal: [RefreshCcw, '#7C3AED', '#F3EEFF'],
  Document: [Archive, '#475569', '#F1F5F9'],
  Customer: [Users, '#061426', '#E8EDF4'],
  InsuranceAgent: [UserCog, '#061426', '#E8EDF4'],
}

// Where an event can be opened in the agent workspace (only routes the agent is allowed to see)
function linkFor(e) {
  switch (e.entityType) {
    case 'InsuranceApplication': return `/agent/applications/${e.entityId}`
    case 'InsurancePolicy': return `/agent/policies/${e.entityId}`
    case 'Claim': return `/agent/claims/${e.entityId}`
    case 'Customer': return `/agent/customers/${e.entityId}`
    case 'PolicyRenewal': return '/agent/renewals'
    case 'Document': return '/agent/documents'
    case 'PremiumPayment': return e.customerId ? `/agent/customers/${e.customerId}` : '/agent/premiums'
    case 'InsuranceAgent': return '/agent/profile'
    default: return null
  }
}

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AgentActivity() {
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)
  const { data, body, loading, refreshing, error, reload, lastUpdated } = useApi('/agent/activity', { page, limit: 25, entityType }, { pollMs: POLL_MS })

  // Group consecutive events by calendar day for a readable timeline
  const groups = []
  for (const e of data || []) {
    const label = dayLabel(e.createdAt)
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] })
    groups[groups.length - 1].items.push(e)
  }

  return (
    <div className="px-page" style={{ maxWidth: 1000 }}>
      <PageHead
        title="Activity history"
        sub="Every recorded event on your assigned customers and on records linked to you: applications, policies, payments, claims, renewals and documents."
        actions={<RefreshBar lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={reload} pollMs={POLL_MS} />}
      />
      <Panel flush>
        <div className="filters">
          <Segmented label="Filter by record type" value={entityType} onChange={(v) => { setEntityType(v); setPage(1) }} options={FILTERS} />
        </div>
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length === 0}
          emptyText={entityType ? 'No events of this type yet.' : 'No activity recorded on your book yet. Events appear here as applications, payments, claims and renewals progress.'}
          rows={6}
        >
          <div>
            {groups.map((g) => (
              <div key={g.label}>
                <div className="ag-day">{g.label}</div>
                {g.items.map((e) => {
                  const [Icon, ink, bg] = ICONS[e.entityType] || [Activity, '#475569', '#F1F5F9']
                  const to = linkFor(e)
                  const content = (
                    <>
                      <span className="ag-event-icon" style={{ color: ink, background: bg }} aria-hidden="true"><Icon size={16} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="ag-event-title">{e.summary}</div>
                        <div className="ag-event-meta">{titleCase(e.action)}{e.actorRole ? ` · by ${titleCase(e.actorRole)}` : ' · system'}</div>
                      </div>
                      <time className="ag-event-time" dateTime={e.createdAt} title={dateTime(e.createdAt)}>{timeAgo(e.createdAt)}</time>
                    </>
                  )
                  return to
                    ? <Link key={e.id} to={to} className="ag-event">{content}</Link>
                    : <div key={e.id} className="ag-event">{content}</div>
                })}
              </div>
            ))}
          </div>
          <Pager body={body} page={page} onPage={setPage} />
        </DataState>
      </Panel>
    </div>
  )
}
