import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminGuard({ children }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // If user is explicitly an AGENT, restrict access to this module
  if (user && user.role === 'AGENT') {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 500,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 20,
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(6, 20, 38, 0.08)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 8px 20px rgba(220, 38, 38, 0.15)',
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#172033', margin: '0 0 8px 0' }}>
            Administrator Authority Required
          </h2>
          <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px 0' }}>
            Your current account is authenticated as a <strong>Field Agent / Advisor</strong>.
            Managing agent rosters, carrier agreements, and system configuration requires <strong>Super Administrator</strong> credentials.
          </p>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12.5,
              color: '#475569',
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>Current Role: Field Agent</div>
            <div>To perform executive actions, please sign in with an Administrator profile (e.g. <code>admin@gmail.com</code>).</div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 16px' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 16px' }}
            >
              <LogIn size={16} />
              <span>Switch to Admin</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
