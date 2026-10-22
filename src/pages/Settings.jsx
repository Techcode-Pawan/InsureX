import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Building, User, Bell, Monitor,
  Shield, Check, Save, Lock, Mail, Phone, MapPin, Globe,
  FileText, CheckCircle2,
} from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('company') // 'company' | 'user' | 'notifications' | 'display'
  const [toast, setToast] = useState(null)

  // 1. Company Profile State
  const [company, setCompany] = useState(() => {
    try {
      const saved = localStorage.getItem('insurex_settings_company')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      orgName: 'InsureX Insurance Management Technologies Pvt. Ltd.',
      shortName: 'InsureX Enterprise',
      cinNumber: 'U72900MH2021PTC368921',
      agencyLicense: 'IRDAI-CORP-AG-884210',
      gstin: '27AABCI1234F1Z5',
      address: 'Level 12, Tower B, Cyber City',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      supportEmail: 'support@insurex.in',
      phone: '+91 22 4900 8800',
      tollFree: '1800 200 4567',
      website: 'https://insurex.internal',
    }
  })

  // 2. User Profile State (Synchronized with authenticated account)
  const [userProfile, setUserProfile] = useState({
    name: user?.name || 'Administrator',
    email: user?.email || 'admin@gmail.com',
    role: user?.role === 'ADMIN' ? 'Super Administrator' : 'Field Agent',
    employeeId: user?.role === 'ADMIN' ? 'ADM-IX-001' : 'AGT-IX-1001',
    department: user?.role === 'ADMIN' ? 'Enterprise Operations' : 'Agency Distribution',
    phone: user?.phone || '+91 98200 45678',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setUserProfile(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        role: user.role === 'ADMIN' ? 'Super Administrator' : 'Field Agent',
      }))
    }
  }, [user])

  // 3. Notification Preferences State
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('insurex_settings_notifs')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      emailNewApplication: true,
      emailClaimFiled: true,
      emailPolicyRenewal: true,
      emailPremiumOverdue: true,
      emailExecutiveDigest: false,
      smsHighValueClaim: true,
      smsPolicyCancellation: false,
      inAppSystemAlerts: true,
    }
  })

  // 4. Display Preferences State
  const [display, setDisplay] = useState(() => {
    try {
      const saved = localStorage.getItem('insurex_settings_display')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      currency: 'INR',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: 'Indian',
      theme: 'light',
      defaultRows: '8',
      compactMode: false,
    }
  })

  function handleSaveCompany(e) {
    e.preventDefault()
    try {
      localStorage.setItem('insurex_settings_company', JSON.stringify(company))
      setToast({ message: 'Corporate profile updated and saved.', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to persist settings.', type: 'error' })
    }
  }

  function handleSaveUser(e) {
    e.preventDefault()
    if (userProfile.newPassword && userProfile.newPassword !== userProfile.confirmPassword) {
      setToast({ message: 'New password and confirmation do not match.', type: 'error' })
      return
    }
    setToast({ message: 'User profile preferences updated.', type: 'success' })
  }

  function handleSaveNotifications(e) {
    e.preventDefault()
    try {
      localStorage.setItem('insurex_settings_notifs', JSON.stringify(notifications))
      setToast({ message: 'Notification preferences saved.', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to save notifications.', type: 'error' })
    }
  }

  function handleSaveDisplay(e) {
    e.preventDefault()
    try {
      localStorage.setItem('insurex_settings_display', JSON.stringify(display))
      setToast({ message: 'Display and regional settings saved.', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to save display settings.', type: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Manage organizational identity, admin account credentials, automated notifications, and regional display preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }} className="settings-layout">
        {/* Settings Navigation Sidebar */}
        <div>
          <Card style={{ padding: '8px 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => setActiveTab('company')}
                className={`btn btn-sm ${activeTab === 'company' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '9px 12px' }}
              >
                <Building size={16} style={{ marginRight: 8 }} /> Company Profile
              </button>

              <button
                onClick={() => setActiveTab('user')}
                className={`btn btn-sm ${activeTab === 'user' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '9px 12px' }}
              >
                <User size={16} style={{ marginRight: 8 }} /> User Profile
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`btn btn-sm ${activeTab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '9px 12px' }}
              >
                <Bell size={16} style={{ marginRight: 8 }} /> Notifications
              </button>

              <button
                onClick={() => setActiveTab('display')}
                className={`btn btn-sm ${activeTab === 'display' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '9px 12px' }}
              >
                <Monitor size={16} style={{ marginRight: 8 }} /> Display & Region
              </button>
            </div>
          </Card>
        </div>

        {/* Content Panel */}
        <div>
          {/* 1. COMPANY PROFILE */}
          {activeTab === 'company' && (
            <Card>
              <CardHeader
                title="Corporate Organization Profile"
                subtitle="Primary legal entity, regulatory IRDAI license, tax IDs, and registered office"
              />
              <form onSubmit={handleSaveCompany}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Legal Corporate Entity Name</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.orgName} onChange={e => setCompany({ ...company, orgName: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Company Identification No. (CIN)</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.cinNumber} onChange={e => setCompany({ ...company, cinNumber: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>IRDAI Corporate Agency License</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.agencyLicense} onChange={e => setCompany({ ...company, agencyLicense: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Goods & Services Tax (GSTIN)</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.gstin} onChange={e => setCompany({ ...company, gstin: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Corporate Support Email</label>
                    <input type="email" className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.supportEmail} onChange={e => setCompany({ ...company, supportEmail: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Contact Phone</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Customer Toll-Free Helpline</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.tollFree} onChange={e => setCompany({ ...company, tollFree: e.target.value })} />
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Registered Head Office Address</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>City & State</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={`${company.city}, ${company.state}`} onChange={e => setCompany({ ...company, city: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Postal Code</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={company.postalCode} onChange={e => setCompany({ ...company, postalCode: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="primary" size="sm" icon={Save} type="submit">
                    Save Company Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 2. USER PROFILE */}
          {activeTab === 'user' && (
            <Card>
              <CardHeader
                title="Administrator Profile & Security"
                subtitle="Personal credentials, employee designation, and access controls"
              />
              <form onSubmit={handleSaveUser}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Full Name</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.name} onChange={e => setUserProfile({ ...userProfile, name: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Employee ID</label>
                    <input className="input" disabled style={{ height: 38, fontSize: 13, background: '#F1F5F9' }}
                      value={userProfile.employeeId} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Work Email</label>
                    <input type="email" className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.email} onChange={e => setUserProfile({ ...userProfile, email: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Role / Privilege</label>
                    <input className="input" disabled style={{ height: 38, fontSize: 13, background: '#F1F5F9' }}
                      value={userProfile.role} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Department</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.department} onChange={e => setUserProfile({ ...userProfile, department: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Phone Number</label>
                    <input className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.phone} onChange={e => setUserProfile({ ...userProfile, phone: e.target.value })} />
                  </div>

                  {/* Password section */}
                  <div style={{ gridColumn: '1/-1', borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 6 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: '#172033' }}>Update Password</p>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>New Password</label>
                    <input type="password" placeholder="••••••••" className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.newPassword} onChange={e => setUserProfile({ ...userProfile, newPassword: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Confirm Password</label>
                    <input type="password" placeholder="••••••••" className="input" style={{ height: 38, fontSize: 13 }}
                      value={userProfile.confirmPassword} onChange={e => setUserProfile({ ...userProfile, confirmPassword: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="primary" size="sm" icon={Save} type="submit">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 3. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader
                title="Automated Alert & Notification Preferences"
                subtitle="Configure operational triggers for underwriting and claim events"
              />
              <form onSubmit={handleSaveNotifications}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>New Policy Application Received</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Notify underwriting team upon initial customer proposal submission</p>
                    </div>
                    <input type="checkbox" checked={notifications.emailNewApplication}
                      onChange={e => setNotifications({ ...notifications, emailNewApplication: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>Claim Filing & Damage Assessment</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Send immediate dispatch to assigned regional claims assessor</p>
                    </div>
                    <input type="checkbox" checked={notifications.emailClaimFiled}
                      onChange={e => setNotifications({ ...notifications, emailClaimFiled: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>Policy Renewal Expiry Warning</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Generate alerts 60, 30, and 15 days prior to policy term termination</p>
                    </div>
                    <input type="checkbox" checked={notifications.emailPolicyRenewal}
                      onChange={e => setNotifications({ ...notifications, emailPolicyRenewal: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>Premium Payment Due & Overdue Notices</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Email customer and agent when installment exceeds grace period</p>
                    </div>
                    <input type="checkbox" checked={notifications.emailPremiumOverdue}
                      onChange={e => setNotifications({ ...notifications, emailPremiumOverdue: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>High-Value Claim SMS Alerts (&gt; ₹1,00,000)</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Real-time SMS dispatch to chief underwriting officer for major claims</p>
                    </div>
                    <input type="checkbox" checked={notifications.smsHighValueClaim}
                      onChange={e => setNotifications({ ...notifications, smsHighValueClaim: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="primary" size="sm" icon={Save} type="submit">
                    Save Notification Rules
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 4. DISPLAY & REGIONAL */}
          {activeTab === 'display' && (
            <Card>
              <CardHeader
                title="Regional Display & Number Formatting"
                subtitle="Currency symbols, calendar representations, and table density"
              />
              <form onSubmit={handleSaveDisplay}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Default Currency</label>
                    <select className="select" style={{ height: 38, fontSize: 13 }}
                      value={display.currency} onChange={e => setDisplay({ ...display, currency: e.target.value })}>
                      <option value="INR">INR (₹) — Indian Rupee</option>
                      <option value="USD">USD ($) — US Dollar</option>
                      <option value="EUR">EUR (€) — Euro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Date Presentation Format</label>
                    <select className="select" style={{ height: 38, fontSize: 13 }}
                      value={display.dateFormat} onChange={e => setDisplay({ ...display, dateFormat: e.target.value })}>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Numeric Grouping</label>
                    <select className="select" style={{ height: 38, fontSize: 13 }}
                      value={display.numberFormat} onChange={e => setDisplay({ ...display, numberFormat: e.target.value })}>
                      <option value="Indian">Indian numbering (e.g. 1,00,000)</option>
                      <option value="International">International numbering (e.g. 100,000)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Default Rows Per Table Page</label>
                    <select className="select" style={{ height: 38, fontSize: 13 }}
                      value={display.defaultRows} onChange={e => setDisplay({ ...display, defaultRows: e.target.value })}>
                      <option value="8">8 rows</option>
                      <option value="15">15 rows</option>
                      <option value="25">25 rows</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Interface Theme</label>
                    <select className="select" style={{ height: 38, fontSize: 13 }}
                      value={display.theme} onChange={e => setDisplay({ ...display, theme: e.target.value })}>
                      <option value="light">Light Theme (InsureX Signature)</option>
                      <option value="dark">Dark Theme (Preview)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="primary" size="sm" icon={Save} type="submit">
                    Save Display Preferences
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
