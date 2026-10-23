import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { PageHead, DataState } from '../../components/panel'
import '../../styles/user.css'

export default function CustomerPlans() {
  const { data, loading, error, reload } = useApi('/catalog/policy-types')

  return (
    <div className="px-page">
      <PageHead
        title="Explore plans"
        sub="Compare what each plan covers and who it's for. When you're ready, apply online and track the decision from your portal."
      />
      <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No plans are open for applications right now. Please check back later.">
        <div className="px-grid cols-2">
          {data?.map((t) => (
            <article key={t.id} className="panel plan" aria-labelledby={`plan-${t.id}`}>
              <span className="plan-code">{t.typeCode}</span>
              <h3 id={`plan-${t.id}`}>{t.name}</h3>
              <p>{t.description}</p>
              <details className="cp-details">
                <summary>Coverage</summary>
                <p>{t.coverageDetails}</p>
              </details>
              <details className="cp-details">
                <summary>Who can apply</summary>
                <p>{t.eligibility}</p>
              </details>
              <details className="cp-details">
                <summary>Terms</summary>
                <p>{t.terms}</p>
              </details>
              <div className="plan-actions">
                <Link to={`/user/apply/${t.id}`} className="btn btn-primary">Apply for {t.name}</Link>
              </div>
            </article>
          ))}
        </div>
      </DataState>
    </div>
  )
}
