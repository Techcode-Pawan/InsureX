import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle,
  ArrowRight, CheckCircle2, LockKeyhole, Sparkles,
  UserCheck, ShieldCheck, Briefcase, Zap, Building, Award
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()

  // Selected role tab: 'ADMIN' | 'AGENT'
  const [activeRoleTab, setActiveRoleTab] = useState('ADMIN')
  const [email, setEmail] = useState('admin@gmail.com')
  const [password, setPassword] = useState('Admin@123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated && !isSubmitting) {
    const from = location.state?.from?.pathname || '/dashboard'
    navigate(from, { replace: true })
  }

  // Quick switch role tab
  const handleRoleTabChange = (role) => {
    setActiveRoleTab(role)
    setError('')
    if (role === 'ADMIN') {
      setEmail('admin@gmail.com')
      setPassword('Admin@123')
    } else {
      setEmail('agent@gmail.com')
      setPassword('Agent@123')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please provide both work email and password.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const res = await login({ email: email.trim(), password })
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, #0c1e3d 0%, #061124 60%, #030812 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Decorative ambient glowing backdrops */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: activeRoleTab === 'ADMIN'
            ? 'radial-gradient(circle, rgba(22, 139, 255, 0.22) 0%, rgba(22, 139, 255, 0) 70%)'
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
          transition: 'background 0.5s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '15%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.2fr)',
          gap: 28,
          position: 'relative',
          zIndex: 10,
        }}
        className="login-container-grid"
      >
        {/* Left Side: Brand & Authority Preview */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(15, 29, 54, 0.7) 0%, rgba(10, 20, 38, 0.85) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderRadius: 24,
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}
          className="hidden md:flex"
        >
          <div>
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #168BFF 0%, #20B8FF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(22, 139, 255, 0.4)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                }}
              >
                IX
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Insure<span style={{ color: '#20B8FF' }}>X</span>
                </div>
                <div style={{ color: '#64748B', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>
                  ENTERPRISE OPERATIONS
                </div>
              </div>
            </div>

            <h2
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: 12,
                letterSpacing: '-0.01em',
              }}
            >
              Enterprise Insurance & Policy Management System
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 13.5, lineHeight: 1.6, marginBottom: 28 }}>
              Secure portal connecting insurance underwriters, corporate carrier partners, executive administration, and field agents.
            </p>

            {/* Dynamic Authority Card based on active tab */}
            <div
              style={{
                background: activeRoleTab === 'ADMIN'
                  ? 'linear-gradient(135deg, rgba(22, 139, 255, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                border: activeRoleTab === 'ADMIN'
                  ? '1px solid rgba(22, 139, 255, 0.3)'
                  : '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 16,
                padding: '20px',
                marginBottom: 24,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {activeRoleTab === 'ADMIN' ? (
                  <Shield size={20} color="#20B8FF" />
                ) : (
                  <Briefcase size={20} color="#10B981" />
                )}
                <div
                  style={{
                    color: activeRoleTab === 'ADMIN' ? '#20B8FF' : '#10B981',
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeRoleTab === 'ADMIN' ? 'Executive Administrator Authority' : 'Field Agent / Advisor Authority'}
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.5, marginBottom: 12 }}>
                {activeRoleTab === 'ADMIN'
                  ? 'Full administrative control over Insurance Companies, Agent Roster, Policy Authoring, Underwriting Rules, and Executive Reports.'
                  : 'Tailored workspace for Customer Portfolio Management, Policy Issuance, Claims Submission, Renewal Reminders, and Commission Tracking.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(activeRoleTab === 'ADMIN'
                  ? ['Manage Carrier Contracts', 'Oversee Agent Commissions', 'System Settings & Audit', 'Financial Aggregates']
                  : ['Client Portfolio & CRM', 'File & Track Claims', 'Issue Policy Quotes', 'Renewals Tracking']
                ).map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#94A3B8' }}>
                    <CheckCircle2 size={13} color={activeRoleTab === 'ADMIN' ? '#168BFF' : '#10B981'} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance & Security Pills */}
          <div
            style={{
              paddingTop: 18,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#64748B',
              fontSize: 11.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LockKeyhole size={13} color="#10B981" />
              <span>TLS 1.3 / 256-Bit</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={13} color="#168BFF" />
              <span>IRDAI Regulatory Compliant</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} color="#8B5CF6" />
              <span>RBAC Authority</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Card */}
        <div
          style={{
            background: 'rgba(11, 23, 44, 0.88)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: '36px 32px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
              }}
            >
              Sign In to Your Account
            </h1>
            <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
              Select your authority portal below to access your workspace.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: 4,
              borderRadius: 12,
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleTabChange('ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeRoleTab === 'ADMIN'
                  ? 'linear-gradient(135deg, #168BFF 0%, #0066CC 100%)'
                  : 'transparent',
                color: activeRoleTab === 'ADMIN' ? '#FFFFFF' : '#94A3B8',
                boxShadow: activeRoleTab === 'ADMIN' ? '0 4px 12px rgba(22, 139, 255, 0.35)' : 'none',
              }}
            >
              <Shield size={15} />
              <span>Admin Portal</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange('AGENT')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeRoleTab === 'AGENT'
                  ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
                  : 'transparent',
                color: activeRoleTab === 'AGENT' ? '#FFFFFF' : '#94A3B8',
                boxShadow: activeRoleTab === 'AGENT' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <UserCheck size={15} />
              <span>Agent Portal</span>
            </button>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 12,
                padding: '11px 14px',
                marginBottom: 20,
                color: '#FCA5A5',
                fontSize: 13,
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1, color: '#EF4444' }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  color: '#CBD5E1',
                  fontSize: 12.5,
                  fontWeight: 500,
                  marginBottom: 7,
                }}
              >
                {activeRoleTab === 'ADMIN' ? 'Administrator Email' : 'Insurance Advisor Email'}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeRoleTab === 'ADMIN' ? 'admin@gmail.com' : 'agent@gmail.com'}
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(20, 33, 56, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    padding: '0 14px 0 42px',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = activeRoleTab === 'ADMIN' ? '#168BFF' : '#10B981')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 7,
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{ color: '#CBD5E1', fontSize: 12.5, fontWeight: 500 }}
                >
                  Password
                </label>
                <span
                  style={{
                    fontSize: 12,
                    color: activeRoleTab === 'ADMIN' ? '#20B8FF' : '#10B981',
                    cursor: 'pointer',
                  }}
                >
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'rgba(20, 33, 56, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    padding: '0 42px 0 42px',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = activeRoleTab === 'ADMIN' ? '#168BFF' : '#10B981')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 22,
              }}
            >
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 15,
                  height: 15,
                  accentColor: activeRoleTab === 'ADMIN' ? '#168BFF' : '#10B981',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="remember"
                style={{ color: '#94A3B8', fontSize: 12.5, cursor: 'pointer' }}
              >
                Keep me signed in on this secure terminal
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit-btn"
              style={{
                width: '100%',
                height: 46,
                background: activeRoleTab === 'ADMIN'
                  ? 'linear-gradient(135deg, #168BFF 0%, #0066CC 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: activeRoleTab === 'ADMIN'
                  ? '0 6px 18px rgba(22, 139, 255, 0.4)'
                  : '0 6px 18px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting ? (
                <span>Verifying Credentials with PostgreSQL...</span>
              ) : (
                <>
                  <span>
                    {activeRoleTab === 'ADMIN' ? 'Sign In as Super Administrator' : 'Sign In as Insurance Advisor'}
                  </span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Section */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                color: '#94A3B8',
                fontSize: 11.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="#20B8FF" />
                <span>One-Click Credential Fill</span>
              </div>
              <span style={{ color: '#64748B', fontWeight: 400 }}>Click to auto-populate</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleRoleTabChange('ADMIN')}
                style={{
                  background: activeRoleTab === 'ADMIN' ? 'rgba(22, 139, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeRoleTab === 'ADMIN' ? '1px solid rgba(22, 139, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '9px 12px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#20B8FF', fontWeight: 700, fontSize: 11 }}>
                  <Shield size={12} />
                  <span>ADMIN ACCESS</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#E2E8F0', marginTop: 2 }}>admin@gmail.com</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Password: Admin@123</div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('AGENT')}
                style={{
                  background: activeRoleTab === 'AGENT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeRoleTab === 'AGENT' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '9px 12px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10B981', fontWeight: 700, fontSize: 11 }}>
                  <Briefcase size={12} />
                  <span>AGENT ACCESS</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#E2E8F0', marginTop: 2 }}>agent@gmail.com</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Password: Agent@123</div>
              </button>
            </div>
          </div>

          {/* Registration link */}
          <div
            style={{
              marginTop: 20,
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: 12.5,
            }}
          >
            Need a new account?{' '}
            <Link
              to="/signup"
              id="goto-signup-link"
              style={{
                color: activeRoleTab === 'ADMIN' ? '#20B8FF' : '#10B981',
                fontWeight: 600,
                textDecoration: 'none',
                marginLeft: 4,
              }}
            >
              Register here &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
