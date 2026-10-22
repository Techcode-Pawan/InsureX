import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, User, Mail, Lock, Phone, Eye, EyeOff,
  AlertCircle, CheckCircle, ArrowRight, ShieldCheck, Check
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CUSTOMER',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  // Password strength checks
  const hasMinLength = formData.password.length >= 8
  const hasUpperCase = /[A-Z]/.test(formData.password)
  const hasNumber = /[0-9]/.test(formData.password)
  const hasSpecial = /[^A-Za-z0-9]/.test(formData.password)
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecial

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Please enter your full legal name.')
      return
    }
    if (!formData.email.trim()) {
      setError('Please provide a valid email address.')
      return
    }
    if (!formData.phone.trim()) {
      setError('Please provide a valid contact number.')
      return
    }
    if (!isPasswordValid) {
      setError('Password must meet all security complexity requirements.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreeTerms) {
      setError('You must accept the terms of service and insurance portal agreement.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed. The email may already be in use.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #061224 0%, #0A1C36 50%, #0B254A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Background glowing ambient orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '15%',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22, 139, 255, 0.15) 0%, rgba(22, 139, 255, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 520,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              marginBottom: 14,
            }}
          >
            <ShieldCheck size={30} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <h1
            style={{
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Create InsureX Account
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 13.5, margin: 0 }}>
            Join the Next-Gen Insurance Operations & Management System
          </p>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            padding: '30px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 20,
                color: '#FCA5A5',
                fontSize: 13,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#EF4444' }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name & Phone in grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label
                  htmlFor="signup-name"
                  style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                >
                  Full Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Vikram Sharma"
                    style={{
                      width: '100%',
                      height: 42,
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0 12px 0 36px',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-phone"
                  style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                >
                  Contact Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    id="signup-phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      height: 42,
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0 12px 0 36px',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="signup-email"
                style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vikram@enterprise.com"
                  style={{
                    width: '100%',
                    height: 42,
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    padding: '0 12px 0 36px',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="signup-role"
                style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
              >
                Account System Role
              </label>
              <select
                id="signup-role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{
                  width: '100%',
                  height: 42,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  padding: '0 12px',
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="CUSTOMER" style={{ background: '#0F172A', color: '#FFFFFF' }}>Customer / Policyholder</option>
                <option value="AGENT" style={{ background: '#0F172A', color: '#FFFFFF' }}>Insurance Advisor / Agent</option>
                <option value="ADMIN" style={{ background: '#0F172A', color: '#FFFFFF' }}>Administrative Executive</option>
              </select>
            </div>

            {/* Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div>
                <label
                  htmlFor="signup-password"
                  style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      height: 42,
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0 36px 0 36px',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  style={{ display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                >
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      height: 42,
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '0 12px 0 36px',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Password checklist badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: '8+ Characters', valid: hasMinLength },
                { label: '1 Uppercase letter', valid: hasUpperCase },
                { label: '1 Number digit', valid: hasNumber },
                { label: '1 Special symbol', valid: hasSpecial },
              ].map(({ label, valid }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11.5,
                    color: valid ? '#10B981' : '#64748B',
                  }}
                >
                  {valid ? <Check size={12} strokeWidth={3} /> : <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#64748B' }} />}
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Terms Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 22 }}>
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: '#10B981', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ color: '#94A3B8', fontSize: 12.5, lineHeight: 1.4, cursor: 'pointer' }}>
                I agree to the InsureX <span style={{ color: '#168BFF' }}>Terms of Service</span>, <span style={{ color: '#168BFF' }}>Privacy Policy</span>, and agree to secure database storage of registered credentials.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              id="signup-submit-btn"
              style={{
                width: '100%',
                height: 46,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s',
                opacity: isSubmitting ? 0.75 : 1,
              }}
            >
              {isSubmitting ? (
                <span>Registering Account in PostgreSQL...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div style={{ marginTop: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" id="goto-login-link" style={{ color: '#10B981', fontWeight: 600, textDecoration: 'none', marginLeft: 4 }}>
              Sign In here &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
