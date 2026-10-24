import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, ArrowLeft, Link2 } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Facts, Notice, DataState, Segmented } from '../components/panel'
import { AgentFormModal, AccessLinkModal, LoginBadge } from './Agents'
import api from '../services/apiClient'
import { useApi, useAction } from '../lib/useApi'
import { inr, inrCompact, date, dateTime, fullName } from '../lib/format'

const TABS = [
  { value: 'assignedCustomers', label: 'Customers' },
  { value: 'policies', label: 'Policies' },
  { value: 'assistedApplications', label: 'Applications' },
  { value: 'claims', label: 'Claims' },
]

export default function AgentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: a, loading, error, reload } = useApi(`/agents/${id}`)
  const [tab, setTab] = useState('assignedCustomers')
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [link, setLink] = useState(null)
  const linkAction = useAction()

  if (loading || error || !a) {
    return (
      <div>
        <PageHeader title="Agent" breadcrumbExtra="Agent profile" />
        <Panel><DataState loading={loading} error={error} onRetry={reload} rows={6} /></Panel>
      </div>
    )
  }

  async function issueLink() {
    try {
      const res = await linkAction.run(() => api.post(`/agents/${a.id}/access-link`))
      setLink(res.data.data)
      reload()
    } catch { /* shown via linkAction.error */ }
  }
  const linkLabel = a.loginStatus === 'NONE' ? 'Create login' : a.loginStatus === 'PENDING_ACTIVATION' ? 'New activation link' : 'Password reset link'

  const activePolicies = a.policies.filter((p) => p.status === 'ACTIVE')
  const decided = a.assistedApplications.filter((x) => ['APPROVED', 'REJECTED'].includes(x.status))
  const approved = decided.filter((x) => x.status === 'APPROVED').length

  return (
    <div>
      <PageHeader
        title={fullName(a)}
        breadcrumbExtra={a.agentNumber}
        subtitle={<><span className="mono">{a.agentNumber}</span> · {a.specialization} · {a.region}</>}
        actions={<>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/admin/agents')}>Agents</Button>
          {a.status !== 'INACTIVE' && a.loginStatus !== 'DISABLED' && (
            <Button variant="secondary" size="sm" icon={Link2} onClick={issueLink} loading={linkAction.pending}>{linkLabel}</Button>
          )}
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
        </>}
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}
      {linkAction.error && <div style={{ marginBottom: 12 }}><Notice tone="error">{linkAction.error.message}</Notice></div>}
      {a.loginStatus === 'NONE' && <div style={{ marginBottom: 12 }}><Notice tone="warn">This agent has no login yet, so they cannot use the agent workspace. Use <strong>Create login</strong> to generate a one-time activation link.</Notice></div>}
      {a.loginStatus === 'PENDING_ACTIVATION' && <div style={{ marginBottom: 12 }}><Notice>Waiting for this agent to activate their account{a.login?.inviteExpiresAt ? ` (link expires ${dateTime(a.login.inviteExpiresAt)})` : ''}. Generate a new activation link if theirs was lost or expired.</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Assigned customers" value={a.assignedCustomers.length} />
        <Kpi label="Active policies" value={activePolicies.length} foot={`${inrCompact(activePolicies.reduce((s, p) => s + Number(p.sumAssured), 0))} sum assured`} />
        <Kpi label="Applications assisted" value={a.assistedApplications.length} foot={decided.length ? `${Math.round((approved / decided.length) * 100)}% approved of ${decided.length} decided` : 'None decided yet'} />
        <Kpi label="Claims handled" value={a.claims.length} />
      </KpiBand>

      <Panel title="Profile" action={<StatusBadge status={a.status} />} className="" >
        <Facts items={[
          ['Email', a.email],
          ['Phone', a.phone],
          ['Department', a.department || '—'],
          ['Branch', a.branch || '—'],
          ['City / region', `${a.city} · ${a.region}`],
          ['Office address', a.address || '—'],
          ['Licence number', a.licenseNumber],
          ['Company', a.company?.name || '—'],
          ['Commission rate', `${Number(a.commissionRate)}%`],
          ['Joined', date(a.joiningDate)],
          ['Login', <LoginBadge key="login" status={a.loginStatus} />],
          ['Last sign-in', a.user?.lastLoginAt ? dateTime(a.user.lastLoginAt) : '—'],
        ]} />
        {a.bio && <p className="muted" style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: 1.55 }}>{a.bio}</p>}
      </Panel>

      <div style={{ height: 16 }} />
      <Panel flush title="Book of business" action={<Segmented label="Record type" value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, label: `${t.label} (${a[t.value].length})` }))} />}>
        {tab === 'assignedCustomers' && (
          <DataState empty={a.assignedCustomers.length === 0} emptyText="No customers are assigned to this agent.">
            <ul className="rows">{a.assignedCustomers.map((c) => (
              <li key={c.id}><Link to={`/admin/customers/${c.id}`} className="row">
                <div className="row-main"><div className="row-title">{fullName(c)}</div><div className="row-meta"><span className="mono">{c.customerNumber}</span> · {c.city} · {c.phone}</div></div>
                <div className="row-end"><StatusBadge status={c.status} /></div>
              </Link></li>
            ))}</ul>
          </DataState>
        )}
        {tab === 'policies' && (
          <DataState empty={a.policies.length === 0} emptyText="No policies are linked to this agent.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Policy</th><th scope="col">Customer</th><th scope="col">Plan</th><th scope="col" className="numeric">Sum assured</th><th scope="col">Expiry</th><th scope="col">Status</th></tr></thead>
              <tbody>{a.policies.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/admin/policies/${p.id}`} className="table-link mono">{p.policyNumber}</Link></td>
                  <td>{fullName(p.customer)}</td><td>{p.policyType?.name}</td>
                  <td className="numeric">{inr(p.sumAssured)}</td><td className="nowrap">{date(p.expiryDate)}</td><td><StatusBadge status={p.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
        {tab === 'assistedApplications' && (
          <DataState empty={a.assistedApplications.length === 0} emptyText="This agent has not submitted any applications.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Application</th><th scope="col">Customer</th><th scope="col">Plan</th><th scope="col" className="numeric">Cover</th><th scope="col">Submitted</th><th scope="col">Status</th></tr></thead>
              <tbody>{a.assistedApplications.map((x) => (
                <tr key={x.id}>
                  <td className="mono">{x.applicationNumber}</td><td>{fullName(x.customer)}</td><td>{x.policyType?.name}</td>
                  <td className="numeric">{inr(x.requestedCoverage)}</td><td className="nowrap">{date(x.applicationDate)}</td><td><StatusBadge status={x.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
        {tab === 'claims' && (
          <DataState empty={a.claims.length === 0} emptyText="No claims are assigned to this agent.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Claim</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col" className="numeric">Claimed</th><th scope="col">Status</th></tr></thead>
              <tbody>{a.claims.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/admin/claims/${c.id}`} className="table-link mono">{c.claimNumber}</Link></td>
                  <td>{fullName(c.customer)}</td><td className="nowrap">{date(c.claimDate)}</td>
                  <td className="numeric">{inr(c.claimedAmount)}</td><td><StatusBadge status={c.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
      </Panel>

      <AccessLinkModal link={link} agentName={fullName(a)} onClose={() => setLink(null)} />
      <AgentFormModal open={editing} agent={a} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setMessage('Agent profile updated.'); reload() }} />
    </div>
  )
}
