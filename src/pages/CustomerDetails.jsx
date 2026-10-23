import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, ArrowLeft, Download } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Facts, Notice, DataState, ConfirmDialog, Segmented } from '../components/panel'
import CustomerFormModal from '../components/customers/CustomerFormModal'
import { useApi, useAction } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, inrCompact, date, dateTime, fullName } from '../lib/format'

function AgentAssignment({ customer, onChanged }) {
  const agents = useApi('/agents', { status: 'ACTIVE' })
  const [agentId, setAgentId] = useState(customer.assignedAgentId || '')
  const [confirming, setConfirming] = useState(false)
  const action = useAction()
  const changed = (agentId || null) !== (customer.assignedAgentId || null)
  const chosen = agents.data?.find((a) => a.id === agentId)

  async function save() {
    await action.run(() => api.put(`/admin/customers/${customer.id}/agent`, { agentId: agentId || null }))
    setConfirming(false)
    onChanged()
  }

  return (
    <Panel title="Servicing agent" note="The assigned agent can see this customer's policies, applications, premiums and claims.">
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          {customer.assignedAgent
            ? <><Link to={`/admin/agents/${customer.assignedAgent.id}`} className="table-link" style={{ fontWeight: 600 }}>{fullName(customer.assignedAgent)}</Link> <span className="mono">{customer.assignedAgent.agentNumber}</span>
              {customer.assignedAgent.status !== 'ACTIVE' && <> · <StatusBadge status={customer.assignedAgent.status} /></>}</>
            : <span style={{ color: 'var(--status-amber-text)' }}>No agent assigned</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Select id="assign-agent" label="Change to" className="" value={agentId} onChange={(e) => setAgentId(e.target.value)}
            options={[{ value: '', label: 'No agent (unassigned)' }, ...(agents.data || []).map((a) => ({ value: a.id, label: `${fullName(a)} · ${a.agentNumber} · ${a.region}` }))]} />
          <Button variant="secondary" disabled={!changed} onClick={() => setConfirming(true)}>Update</Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Change servicing agent?"
        confirmLabel="Change agent"
        pending={action.pending}
        error={action.error}
        onClose={() => { setConfirming(false); action.setError(null) }}
        onConfirm={save}
      >
        {chosen
          ? <>{fullName(chosen)} ({chosen.agentNumber}) will gain access to {fullName(customer)}'s records{customer.assignedAgent ? <> and {fullName(customer.assignedAgent)} will lose it</> : null}. The new agent is notified.</>
          : <>{customer.assignedAgent ? fullName(customer.assignedAgent) : 'The current agent'} will lose access to this customer's records.</>}
      </ConfirmDialog>
    </Panel>
  )
}

const TABS = [
  { value: 'policies', label: 'Policies' },
  { value: 'applications', label: 'Applications' },
  { value: 'claims', label: 'Claims' },
  { value: 'documents', label: 'Documents' },
]

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: c, loading, error, reload } = useApi(`/customers/${id}`)
  const [tab, setTab] = useState('policies')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const del = useAction()

  async function doDelete() {
    await del.run(() => api.delete(`/customers/${id}`))
    navigate('/admin/customers', { replace: true })
  }

  if (loading || error || !c) {
    return (
      <div>
        <PageHeader title="Customer" breadcrumbExtra="Customer record" />
        <Panel><DataState loading={loading} error={error} onRetry={reload} rows={6} /></Panel>
      </div>
    )
  }

  const activePolicies = c.policies.filter((p) => p.status === 'ACTIVE')
  const outstanding = c.policies.flatMap((p) => p.premiums).filter((pr) => pr.status !== 'PAID')
    .reduce((s, pr) => s + Number(pr.amount) - Number(pr.paidAmount), 0)
  const openClaims = c.claims.filter((cl) => ['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(cl.status))

  return (
    <div>
      <PageHeader
        title={fullName(c)}
        breadcrumbExtra={c.customerNumber}
        subtitle={<><span className="mono">{c.customerNumber}</span> · registered {date(c.registrationDate)}</>}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/admin/customers')}>Customers</Button>
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleting(true)}>Delete</Button>
          </>
        }
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Active policies" value={activePolicies.length} foot={`${c.policies.length} total`} />
        <Kpi label="Total cover (active)" value={inrCompact(activePolicies.reduce((s, p) => s + Number(p.sumAssured), 0))} />
        <Kpi label="Outstanding premiums" value={inr(outstanding)} tone={outstanding > 0 ? 'warn' : ''} foot={outstanding > 0 ? 'Unpaid installments' : 'Nothing outstanding'} />
        <Kpi label="Open claims" value={openClaims.length} foot={`${c.claims.length} total`} />
      </KpiBand>

      <div className="px-grid main-side" style={{ marginBottom: 16 }}>
        <Panel title="Profile" action={<StatusBadge status={c.status} />}>
          <Facts items={[
            ['Email', c.email],
            ['Phone', c.phone],
            ['Date of birth', date(c.dateOfBirth)],
            ['Gender', c.gender],
            ['Address', `${c.address}, ${c.city}, ${c.state} ${c.postalCode}`],
            ['ID proof', `${c.idProofType} · ${c.maskedIdProofNumber}`],
            ['Portal login', c.user ? `${c.user.email}${c.user.isActive ? '' : ' (deactivated)'}` : 'None'],
            ['Last portal sign-in', c.user?.lastLoginAt ? dateTime(c.user.lastLoginAt) : '—'],
          ]} />
        </Panel>
        <AgentAssignment customer={c} onChanged={() => { setMessage('Servicing agent updated.'); reload() }} />
      </div>

      <Panel flush title="Records" action={<Segmented label="Record type" value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, label: `${t.label} (${c[t.value].length})` }))} />}>
        {tab === 'policies' && (
          <DataState empty={c.policies.length === 0} emptyText="No policies.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Policy</th><th scope="col">Plan</th><th scope="col" className="numeric">Sum assured</th><th scope="col" className="numeric">Premium</th><th scope="col">Expiry</th><th scope="col">Status</th></tr></thead>
              <tbody>{c.policies.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/admin/policies/${p.id}`} className="table-link mono">{p.policyNumber}</Link></td>
                  <td>{p.policyType?.name}</td>
                  <td className="numeric">{inr(p.sumAssured)}</td>
                  <td className="numeric">{inr(p.premiumAmount)} <span className="muted" style={{ fontSize: 12 }}>/ {p.premiumFrequency.toLowerCase().replace('_', '-')}</span></td>
                  <td className="nowrap">{date(p.expiryDate)}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
        {tab === 'applications' && (
          <DataState empty={c.applications.length === 0} emptyText="No applications.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Application</th><th scope="col">Plan</th><th scope="col" className="numeric">Cover requested</th><th scope="col">Submitted</th><th scope="col">Status</th></tr></thead>
              <tbody>{c.applications.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.applicationNumber}</td>
                  <td>{a.policyType?.name}</td>
                  <td className="numeric">{inr(a.requestedCoverage)}</td>
                  <td className="nowrap">{date(a.applicationDate)}</td>
                  <td><StatusBadge status={a.status} />{a.rejectionReason && <div className="muted" style={{ fontSize: 12 }}>{a.rejectionReason}</div>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
        {tab === 'claims' && (
          <DataState empty={c.claims.length === 0} emptyText="No claims.">
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Claim</th><th scope="col">Type</th><th scope="col">Date</th><th scope="col" className="numeric">Claimed</th><th scope="col" className="numeric">Approved</th><th scope="col">Status</th></tr></thead>
              <tbody>{c.claims.map((cl) => (
                <tr key={cl.id}>
                  <td><Link to={`/admin/claims/${cl.id}`} className="table-link mono">{cl.claimNumber}</Link></td>
                  <td>{cl.claimType}</td>
                  <td className="nowrap">{date(cl.claimDate)}</td>
                  <td className="numeric">{inr(cl.claimedAmount)}</td>
                  <td className="numeric">{cl.approvedAmount != null ? inr(cl.approvedAmount) : '—'}</td>
                  <td><StatusBadge status={cl.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </DataState>
        )}
        {tab === 'documents' && (
          <DataState empty={c.documents.length === 0} emptyText="No documents.">
            <ul className="rows">{c.documents.map((d) => (
              <li key={d.id} className="row">
                <div className="row-main">
                  <div className="row-title">{d.name}</div>
                  <div className="row-meta"><span className="mono">{d.documentNumber}</span> · {d.documentType} · {date(d.submissionDate)}{d.verifiedBy && ` · reviewed by ${d.verifiedBy}`}</div>
                </div>
                <div className="row-end" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <StatusBadge status={d.verificationStatus} />
                  {d.hasFile && <Button size="sm" variant="secondary" icon={Download} onClick={() => api.download(`/documents/${d.id}/download`, d.name)}>Open</Button>}
                </div>
              </li>
            ))}</ul>
          </DataState>
        )}
      </Panel>

      <CustomerFormModal open={editing} customer={c} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); setMessage('Customer record updated.'); reload() }} />
      <ConfirmDialog
        open={deleting}
        title={`Delete ${c.customerNumber}?`}
        confirmLabel="Delete permanently"
        danger
        pending={del.pending}
        error={del.error}
        onClose={() => { setDeleting(false); del.setError(null) }}
        onConfirm={doDelete}
      >
        This permanently removes the customer record. Customers with any policies, applications, claims or documents cannot be deleted — set them to Inactive instead. This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
