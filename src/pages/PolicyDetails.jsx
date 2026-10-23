import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, RefreshCcw, Download } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Panel, KpiBand, Kpi, Facts, Notice, DataState, Segmented } from '../components/panel'
import PolicyFormModal from '../components/policies/PolicyFormModal'
import RecordPaymentModal from '../components/policies/RecordPaymentModal'
import OpenRenewalModal from '../components/policies/OpenRenewalModal'
import { useApi } from '../lib/useApi'
import api from '../services/apiClient'
import { inr, date, daysUntil, fullName, titleCase } from '../lib/format'

const TABS = [
  { value: 'premiums', label: 'Premiums' },
  { value: 'payments', label: 'Payments' },
  { value: 'beneficiaries', label: 'Beneficiaries' },
  { value: 'claims', label: 'Claims' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'documents', label: 'Documents' },
]
const UNPAID = ['DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD']
const OPEN_RENEWAL = ['UPCOMING', 'OVERDUE', 'GRACE_PERIOD']

export default function PolicyDetails() {
  const { id } = useParams()
  const { data: p, loading, error, reload } = useApi(`/policies/${id}`)
  const [tab, setTab] = useState('premiums')
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(null)
  const [renewing, setRenewing] = useState(false)
  const [message, setMessage] = useState('')

  const done = (msg) => { setEditing(false); setPaying(null); setRenewing(false); setMessage(msg); reload() }

  if (loading && !p) return <DataState loading rows={6} />
  if (error) {
    return (
      <div>
        <Link to="/admin/policies" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} /> All policies</Link>
        <DataState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    )
  }
  if (!p) return null

  const premiums = p.premiums.map((x) => ({ ...x, remainingBalance: Math.max(0, Number(x.amount) - Number(x.paidAmount)) }))
  const outstanding = premiums.filter((x) => UNPAID.includes(x.status)).reduce((s, x) => s + x.remainingBalance, 0)
  const paid = p.payments.filter((x) => x.status === 'SUCCESS').reduce((s, x) => s + Number(x.amount), 0)
  const overdue = premiums.filter((x) => x.status === 'OVERDUE').length
  const left = daysUntil(p.expiryDate)
  const hasOpenRenewal = p.renewals.some((r) => OPEN_RENEWAL.includes(r.status))
  const allocated = p.beneficiaries.reduce((s, b) => s + Number(b.allocationPercentage), 0)

  return (
    <div>
      <Link to="/admin/policies" className="panel-link" style={{ marginBottom: 10 }}><ArrowLeft size={14} aria-hidden="true" /> All policies</Link>
      <PageHeader
        title={p.policyNumber}
        breadcrumbExtra={p.policyNumber}
        subtitle={`${p.policyType.name} · ${fullName(p.customer)} (${p.customer.customerNumber})`}
        actions={
          <>
            {['ACTIVE', 'EXPIRED'].includes(p.status) && !hasOpenRenewal && (
              <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={() => setRenewing(true)}>Open renewal</Button>
            )}
            <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
          </>
        }
      />
      {message && <div style={{ marginBottom: 12 }}><Notice tone="ok">{message}</Notice></div>}

      <KpiBand cols={4}>
        <Kpi label="Status" value={<StatusBadge status={p.status} />} foot={p.status === 'ACTIVE' && left !== null ? (left >= 0 ? `${left} days of cover left` : `Ended ${-left} days ago`) : undefined} tone={left !== null && left <= 30 ? 'warn' : ''} />
        <Kpi label="Sum assured" value={inr(p.sumAssured)} />
        <Kpi label="Premiums paid" value={inr(paid)} foot={`${p.payments.filter((x) => x.status === 'SUCCESS').length} confirmed payments`} />
        <Kpi label="Outstanding" value={inr(outstanding)} foot={overdue ? `${overdue} overdue installment${overdue === 1 ? '' : 's'}` : 'Nothing overdue'} tone={overdue ? 'bad' : ''} />
      </KpiBand>

      <div className="px-grid main-side" style={{ marginBottom: 16 }}>
        <Panel title="Policy details">
          <Facts items={[
            ['Plan', `${p.policyType.name} (${p.policyType.typeCode})`],
            ['Term', `${date(p.startDate)} – ${date(p.expiryDate)}`],
            ['Premium', `${inr(p.premiumAmount, { exact: true })} ${titleCase(p.premiumFrequency)}`],
            ['Insurer', p.company?.name || 'Not assigned'],
            ['Servicing agent', p.agent ? `${fullName(p.agent)} (${p.agent.agentNumber})` : 'Not assigned'],
            ['Issued from', p.applicationId ? 'Approved application' : 'Direct issuance'],
            ['Created', date(p.createdAt)],
          ]} />
        </Panel>
        <Panel title="Policyholder" action={<Link className="panel-link" to={`/admin/customers/${p.customer.id}`}>Open customer</Link>}>
          <Facts items={[
            ['Name', fullName(p.customer)],
            ['Customer no.', p.customer.customerNumber],
            ['Email', p.customer.email],
            ['Phone', p.customer.phone],
            ['City', `${p.customer.city}, ${p.customer.state}`],
          ]} />
        </Panel>
      </div>

      <Panel flush action={<Segmented label="Policy records" value={tab} onChange={setTab} options={TABS} />} title="Records">
        {tab === 'premiums' && (
          <DataState empty={premiums.length === 0} emptyText="No premium installments on this policy.">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th scope="col">Installment</th><th scope="col">Due</th><th scope="col">Billing period</th><th scope="col" className="numeric">Amount</th><th scope="col" className="numeric">Paid</th><th scope="col" className="numeric">Balance</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {premiums.map((x) => (
                    <tr key={x.id}>
                      <td className="mono">{x.premiumNumber}</td>
                      <td className="nowrap">{date(x.dueDate)}</td>
                      <td className="nowrap muted">{x.billingPeriodStart ? `${date(x.billingPeriodStart)} – ${date(x.billingPeriodEnd)}` : '—'}</td>
                      <td className="numeric">{inr(x.amount, { exact: true })}</td>
                      <td className="numeric">{inr(x.paidAmount, { exact: true })}</td>
                      <td className="numeric" style={{ fontWeight: 600 }}>{inr(x.remainingBalance, { exact: true })}</td>
                      <td><StatusBadge status={x.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        {x.remainingBalance > 0 && <Button size="sm" variant="secondary" onClick={() => setPaying(x)}>Record payment</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        )}

        {tab === 'payments' && (
          <DataState empty={p.payments.length === 0} emptyText="No payments recorded.">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th scope="col">Payment</th><th scope="col">Date</th><th scope="col">Method</th><th scope="col">Reference</th><th scope="col" className="numeric">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {p.payments.map((x) => (
                    <tr key={x.id}>
                      <td className="mono">{x.paymentNumber}</td>
                      <td className="nowrap">{date(x.paymentDate)}</td>
                      <td>{titleCase(x.paymentMethod)}</td>
                      <td className="mono">{x.transactionReference}</td>
                      <td className="numeric">{inr(x.amount, { exact: true })}</td>
                      <td>{x.status === 'PENDING' ? <Link to="/admin/verifications"><StatusBadge status="Awaiting verification" /></Link> : <StatusBadge status={x.status} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        )}

        {tab === 'beneficiaries' && (
          <DataState empty={p.beneficiaries.length === 0} emptyText="No beneficiaries nominated.">
            <ul className="rows">
              {p.beneficiaries.map((b) => (
                <li key={b.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{b.name}</div>
                    <div className="row-meta">{b.relationship}{b.phone && ` · ${b.phone}`}{b.email && ` · ${b.email}`}</div>
                  </div>
                  <div className="row-end row-amount">{Number(b.allocationPercentage)}%</div>
                </li>
              ))}
              <li className="row muted" style={{ fontSize: 12.5 }}>Total allocated: {allocated}%{allocated < 100 && ' (under-allocated)'}</li>
            </ul>
          </DataState>
        )}

        {tab === 'claims' && (
          <DataState empty={p.claims.length === 0} emptyText="No claims on this policy.">
            <ul className="rows">
              {p.claims.map((c) => (
                <li key={c.id}>
                  <Link to={`/admin/claims/${c.id}`} className="row">
                    <div className="row-main">
                      <div className="row-title">{c.claimNumber} · {c.claimType}</div>
                      <div className="row-meta">{date(c.claimDate)}</div>
                    </div>
                    <div className="row-end">
                      <div className="row-amount">{inr(c.claimedAmount)}</div>
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </DataState>
        )}

        {tab === 'renewals' && (
          <DataState empty={p.renewals.length === 0} emptyText="No renewals recorded for this policy.">
            <ul className="rows">
              {p.renewals.map((r) => (
                <li key={r.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{r.renewalNumber}</div>
                    <div className="row-meta">{date(r.newStartDate)} – {date(r.newExpiryDate)}{r.notes && ` · ${r.notes}`}</div>
                  </div>
                  <div className="row-end">
                    <div className="row-amount">{inr(r.renewalPremium)}</div>
                    <StatusBadge status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="pager"><Link to="/admin/renewals" className="panel-link">Process renewals</Link></div>
          </DataState>
        )}

        {tab === 'documents' && (
          <DataState empty={p.documents.length === 0} emptyText="No documents linked to this policy.">
            <ul className="rows">
              {p.documents.map((d) => (
                <li key={d.id} className="row">
                  <div className="row-main">
                    <div className="row-title">{d.name}</div>
                    <div className="row-meta"><span className="mono">{d.documentNumber}</span> · {d.documentType} · {date(d.submissionDate)}</div>
                  </div>
                  <div className="row-end" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge status={d.verificationStatus} />
                    {d.fileUrl && <Button size="sm" variant="secondary" icon={Download} onClick={() => api.download(`/documents/${d.id}/download`, d.name)}>Open</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </DataState>
        )}
      </Panel>

      {editing && <PolicyFormModal policy={p} onClose={() => setEditing(false)} onDone={done} />}
      <RecordPaymentModal premium={paying} policyNumber={p.policyNumber} onClose={() => setPaying(null)} onDone={done} />
      {renewing && <OpenRenewalModal policy={p} onClose={() => setRenewing(false)} onDone={done} />}
    </div>
  )
}
