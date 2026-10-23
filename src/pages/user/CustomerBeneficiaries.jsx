import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { PageHead, Panel, DataState, Notice } from '../../components/panel'
import '../../styles/user.css'

// Read-only view of nominees on the customer's own policies, grouped by policy.
export default function CustomerBeneficiaries() {
  const { data, loading, error, reload } = useApi('/me/beneficiaries')

  const groups = []
  for (const b of data || []) {
    let g = groups.find((x) => x.policy.id === b.policy.id)
    if (!g) groups.push((g = { policy: b.policy, items: [] }))
    g.items.push(b)
  }

  return (
    <div className="px-page" style={{ maxWidth: 880 }}>
      <PageHead title="Beneficiaries" sub="The people who receive the benefit under each of your policies." />
      <div className="cp-stack">
        <Notice>To add, remove or change a beneficiary, contact your agent or InsureX support. Changes need identity checks, so they can't be made online.</Notice>
        <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No beneficiaries are recorded on your policies.">
          {groups.map((g) => {
            const total = g.items.reduce((s, b) => s + Number(b.allocationPercentage), 0)
            return (
              <Panel
                key={g.policy.id}
                flush
                title={`${g.policy.policyType?.name} · ${g.policy.policyNumber}`}
                note={`${total}% of the benefit allocated${total < 100 ? ` · ${100 - total}% unallocated` : ''}`}
                action={<Link to={`/user/policies/${g.policy.id}`} className="panel-link">View policy</Link>}
              >
                <div>
                  {g.items.map((b) => (
                    <div key={b.id} className="cp-item">
                      <div className="cp-item-main">
                        <div className="cp-item-title">{b.name}</div>
                        <div className="cp-item-meta">{b.relationship}{b.phone ? ` · ${b.phone}` : ''}{b.email ? ` · ${b.email}` : ''}</div>
                      </div>
                      <div className="cp-item-end" style={{ minWidth: 120 }}>
                        <div style={{ width: '100%' }}>
                          <div className="cp-amount" style={{ textAlign: 'right' }}>{Number(b.allocationPercentage)}%</div>
                          <div className="meter" aria-hidden="true"><span style={{ width: `${Number(b.allocationPercentage)}%` }} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )
          })}
        </DataState>
      </div>
    </div>
  )
}
