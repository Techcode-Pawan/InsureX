import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { inr, date, dateTime, titleCase, fullName } from '../../lib/format'
import { DataState, Notice } from '../../components/panel'
import Button from '../../components/ui/Button'
import '../../styles/user.css'

// Printable receipt generated from the confirmed payment record. Only issued once a payment is SUCCESS.
export default function CustomerReceipt() {
  const { id } = useParams()
  const { data: pay, loading, error, reload } = useApi(`/me/payments/${id}`)
  const [generatedAt] = useState(() => new Date())

  return (
    <div className="px-page" style={{ maxWidth: 760 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/user/payments" className="panel-link"><ArrowLeft size={14} aria-hidden="true" /> Payments</Link>
        {pay?.status === 'SUCCESS' && <Button icon={Printer} variant="secondary" onClick={() => window.print()}>Print or save as PDF</Button>}
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        {pay && pay.status !== 'SUCCESS' && (
          <Notice tone={pay.status === 'FAILED' ? 'error' : 'info'}>
            {pay.status === 'PENDING'
              ? 'This payment is awaiting verification. A receipt is issued once InsureX confirms it with the bank.'
              : 'This payment could not be verified, so no receipt has been issued. Contact your agent or InsureX support if you believe this is a mistake.'}
          </Notice>
        )}
        {pay?.status === 'SUCCESS' && (
          <article className="doc-sheet" aria-label="Payment receipt">
            <div className="doc-sheet-head">
              <div>
                <div className="ix-brand"><span className="ix-brand-mark" aria-hidden="true">IX</span><span className="ix-brand-name">Insure<span className="x">X</span></span></div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>Premium payment receipt</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2>Receipt {pay.paymentNumber}</h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>Payment date {date(pay.paymentDate)}</p>
              </div>
            </div>

            <dl className="facts" style={{ marginBottom: 20 }}>
              <div><dt>Received from</dt><dd>{fullName(pay.policy?.customer)}</dd></div>
              <div><dt>Customer number</dt><dd>{pay.policy?.customer?.customerNumber}</dd></div>
              <div><dt>Policy</dt><dd>{pay.policy?.policyNumber}</dd></div>
              <div><dt>Plan</dt><dd>{pay.policy?.policyType?.name}</dd></div>
            </dl>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Description</th><th>Method</th><th>Reference</th><th className="r">Amount</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Premium {pay.premium?.premiumNumber}
                      {pay.premium?.billingPeriodStart && (
                        <div className="muted" style={{ fontSize: 12 }}>Period {date(pay.premium.billingPeriodStart)} – {date(pay.premium.billingPeriodEnd)}</div>
                      )}
                    </td>
                    <td>{titleCase(pay.paymentMethod)}</td>
                    <td className="mono">{pay.transactionReference}</td>
                    <td className="r"><strong>{inr(pay.amount, { exact: true })}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <dl className="facts" style={{ marginTop: 20 }}>
              <div><dt>Installment amount</dt><dd>{inr(pay.premium?.amount, { exact: true })}</dd></div>
              <div><dt>Total paid on installment</dt><dd>{inr(pay.premium?.paidAmount, { exact: true })}</dd></div>
              <div><dt>Balance on installment</dt><dd>{inr(Math.max(0, Number(pay.premium?.amount) - Number(pay.premium?.paidAmount)), { exact: true })}</dd></div>
              <div><dt>Status</dt><dd>Confirmed</dd></div>
            </dl>

            <p className="muted" style={{ fontSize: 12, marginTop: 24, marginBottom: 0 }}>
              Generated from InsureX records on {dateTime(generatedAt)}. This receipt reflects a payment verified by InsureX.
            </p>
          </article>
        )}
      </DataState>
    </div>
  )
}
