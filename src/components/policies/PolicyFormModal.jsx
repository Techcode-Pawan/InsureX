import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Select from '../ui/Select'
import { Notice } from '../panel'
import { useApi, useAction } from '../../lib/useApi'
import api from '../../services/apiClient'
import { fullName } from '../../lib/format'

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

// Oversight edit for an issued policy: status, insurer and servicing agent only.
// Cover, pricing and ownership are set by underwriting and are not editable (the API enforces this too).
export default function PolicyFormModal({ policy, onClose, onDone }) {
  const companies = useApi(policy ? '/insurance-companies' : null)
  const agents = useApi(policy ? '/agents' : null)
  const [form, setForm] = useState(null)
  const action = useAction()

  useEffect(() => {
    if (policy) {
      setForm({ status: policy.status, companyId: policy.companyId || '', agentId: policy.agentId || '' })
      action.setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy])

  if (!policy || !form) return null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const cancelling = form.status === 'CANCELLED' && policy.status !== 'CANCELLED'

  async function save() {
    const payload = {}
    if (form.status !== policy.status) payload.status = form.status
    if ((form.companyId || null) !== (policy.companyId || null) && form.companyId) payload.companyId = form.companyId
    if ((form.agentId || null) !== (policy.agentId || null) && form.agentId) payload.agentId = form.agentId
    if (Object.keys(payload).length === 0) return onClose()
    await action.run(() => api.put(`/policies/${policy.id}`, payload))
    onDone('Policy updated.')
  }

  return (
    <Modal open onClose={action.pending ? () => {} : onClose} title={`Edit ${policy.policyNumber}`} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>Cancel</Button>
        <Button variant={cancelling ? 'danger' : 'primary'} onClick={save} loading={action.pending}>{cancelling ? 'Cancel policy' : 'Save changes'}</Button>
      </>
    }>
      <div style={{ display: 'grid', gap: 14 }}>
        <Select id="pf-status" label="Status" value={form.status} onChange={set('status')} options={STATUSES} />
        <Select id="pf-company" label="Insurer" value={form.companyId} onChange={set('companyId')}
          options={[{ value: '', label: 'Not assigned', disabled: true }, ...(companies.data || []).map((c) => ({ value: c.id, label: c.name }))]} />
        <Select id="pf-agent" label="Servicing agent" value={form.agentId} onChange={set('agentId')}
          options={[{ value: '', label: 'Not assigned' }, ...(agents.data || []).map((a) => ({ value: a.id, label: `${fullName(a)} (${a.agentNumber})` }))]} />
        {cancelling && <Notice tone="warn">Cancelling ends cover. The customer is notified, outstanding installments remain on record and no refund is calculated automatically.</Notice>}
        <p className="field-help" style={{ margin: 0 }}>Sum assured, premium and ownership are set at underwriting and cannot be changed here.</p>
        {action.error && <Notice tone="error">{action.error.message}</Notice>}
      </div>
    </Modal>
  )
}
