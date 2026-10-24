import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Mail, Terminal } from 'lucide-react'
import { Brand, Notice } from '../components/panel'
import { AuthAside, LOGIN_ROLES } from './Login'

// No email service is configured, so resets are issued by an administrator as a one-time link
// (Admin → Users & Access → Reset link). This page explains that honestly per role.
const STEPS = {
  CUSTOMER: [
    'Contact InsureX support or your servicing agent from your registered phone or email.',
    'After verifying your identity, an administrator issues you a one-time password reset link (valid for 24 hours).',
    'Open the link, choose a new password, then sign in as Customer.',
  ],
  AGENT: [
    'Ask your InsureX administrator for a password reset.',
    'They generate a one-time reset link from Agent Management or Users & Access and share it with you securely.',
    'Open the link within 24 hours, choose a new password, then sign in as Agent / Staff.',
  ],
  ADMIN: [
    'Ask another administrator to issue you a reset link from Users & Access.',
    'If you are the only administrator, the system owner can reset the password on the server (below).',
    'Then sign in as Admin with the new password.',
  ],
}

export default function ForgotPassword() {
  const [params] = useSearchParams()
  const role = LOGIN_ROLES.some((r) => r.value === params.get('role')) ? params.get('role') : 'CUSTOMER'
  const label = LOGIN_ROLES.find((r) => r.value === role).label

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand sub="Insurance Platform" to="/" /></div>
          <h1>Reset your password</h1>
          <p className="lead">For {label} accounts. Passwords are never sent by email or shown to staff.</p>

          <Notice>
            Automatic reset emails are not set up for this InsureX installation, so a reset is issued as a secure one-time link by an
            administrator after they confirm who you are.
          </Notice>

          <ol style={{ margin: '18px 0 0', paddingLeft: 20, display: 'grid', gap: 10, fontSize: 14, lineHeight: 1.55 }}>
            {STEPS[role].map((s) => <li key={s}>{s}</li>)}
          </ol>

          {role === 'ADMIN' && (
            <div className="panel" style={{ marginTop: 16, padding: '12px 14px', fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, marginBottom: 6 }}><Terminal size={15} aria-hidden="true" /> Server-side reset</div>
              <code style={{ fontSize: 12.5, overflowWrap: 'anywhere' }}>cd server; npm run reset-admin</code>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>Prompts for the admin email and a new password without echoing it.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginTop: 22, flexWrap: 'wrap' }}>
            <Link to={`/login?role=${role}`} className="panel-link"><ArrowLeft size={14} aria-hidden="true" /> Back to sign in</Link>
            {role === 'CUSTOMER' && <Link to="/signup" className="panel-link"><Mail size={14} aria-hidden="true" /> Create an account</Link>}
            <span className="muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}><KeyRound size={13} aria-hidden="true" /> Have a link? Open it directly.</span>
          </div>
        </div>
      </main>
    </div>
  )
}
