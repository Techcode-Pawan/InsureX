import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../../services/apiClient'
import { useApi, useAction } from '../../lib/useApi'
import { inr, date, fullName } from '../../lib/format'
import { PageHead, Panel, Facts, Notice, DataState, ConfirmDialog, Steps } from '../../components/panel'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { APP_STEPS, appStepProps } from './CustomerApplications'

export default function CustomerApplicationDetail() {
  const { id } = useParams()
  const { data: app, loading, error, reload } = useApi(`/me/applications/${id}`)
  const [confirm, setConfirm] = useState(false)
  const { run, pending, error: actionError, setError } = useAction()

  async function withdraw() {
    try {
      await run(() => api.post(`/me/applications/${id}/cancel`))
      setConfirm(false)
      reload()
    } catch {
      /* error shown in the dialog */
    }
  }

  return (
    <div className="px-page" style={{ maxWidth: 880 }}>
      <Link to="/user/applications" className="panel-link" style={{ marginBottom: 12 }}><ArrowLeft size={14} aria-hidden="true" /> All applications</Link>
      <DataState loading={loading} error={error} onRetry={reload}>
        {app && (
          <>
            <PageHead
              eyebrow={app.applicationNumber}
              title={app.policyType?.name}
              sub={`Submitted on ${date(app.applicationDate)}`}
              actions={
                <>
                  <StatusBadge status={app.status} />
                  {app.status === 'PENDING' && (
                    <Button variant="secondary" onClick={() => { setError(null); setConfirm(true) }}>Withdraw application</Button>
                  )}
                </>
              }
            />

            <div className="cp-stack">
              <Panel title="Progress">
                <Steps steps={APP_STEPS} {...appStepProps(app.status)} />
                <div style={{ marginTop: 18 }}>
                  {app.status === 'PENDING' && (
                    <Notice>Our underwriting team is reviewing your application. You'll get a notification as soon as there's a decision.</Notice>
                  )}
                  {app.status === 'APPROVED' && (
                    <Notice tone="ok">
                      Approved{app.reviewDate ? ` on ${date(app.reviewDate)}` : ''}.{' '}
                      {app.policy && <>Your policy <Link to={`/user/policies/${app.policy.id}`} className="panel-link">{app.policy.policyNumber}</Link> has been issued.</>}
                    </Notice>
                  )}
                  {app.status === 'REJECTED' && (
                    <Notice tone="error">
                      <strong>This application was not approved{app.reviewDate ? ` (${date(app.reviewDate)})` : ''}.</strong>
                      {app.rejectionReason && <div style={{ marginTop: 4 }}>Reason: {app.rejectionReason}</div>}
                      <div style={{ marginTop: 4 }}>You're welcome to apply again or speak to your agent about other plans.</div>
                    </Notice>
                  )}
                  {app.status === 'CANCELLED' && <Notice tone="warn">You withdrew this application.</Notice>}
                </div>
              </Panel>

              <Panel title="Application details">
                <Facts items={[
                  ['Plan', app.policyType?.name],
                  ['Requested cover', inr(app.requestedCoverage)],
                  ['Annual income', app.annualIncome ? inr(app.annualIncome) : '—'],
                  ['Employment', app.employmentStatus || '—'],
                  ['Nominee', app.nomineeName || '—'],
                  ['Nominee relationship', app.nomineeRelation || '—'],
                  app.assistedByAgent && ['Submitted with', fullName(app.assistedByAgent)],
                ]} />
              </Panel>
            </div>

            <ConfirmDialog
              open={confirm}
              title="Withdraw this application?"
              confirmLabel="Withdraw"
              danger
              pending={pending}
              error={actionError}
              onConfirm={withdraw}
              onClose={() => setConfirm(false)}
            >
              Application {app.applicationNumber} for {app.policyType?.name} will be withdrawn and will not be reviewed.
              You can submit a new application later.
            </ConfirmDialog>
          </>
        )}
      </DataState>
    </div>
  )
}
