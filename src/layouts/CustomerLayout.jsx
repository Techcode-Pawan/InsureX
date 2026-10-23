import { useEffect, useRef, useState, Suspense } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { Home, Shield, Wallet, AlertCircle, UserRound, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Brand } from '../components/panel'
import NotificationBell from '../components/panel/NotificationBell'
import { initials } from '../lib/format'

const TOP_NAV = [
  { to: '/user', label: 'Home', end: true },
  { to: '/user/plans', label: 'Explore plans' },
  { to: '/user/policies', label: 'My policies' },
  { to: '/user/payments', label: 'Payments' },
  { to: '/user/claims', label: 'Claims' },
  { to: '/user/documents', label: 'Documents' },
]

// Phone bottom tabs: the five things customers do most
const TABS = [
  { to: '/user', label: 'Home', icon: Home, end: true },
  { to: '/user/policies', label: 'Policies', icon: Shield },
  { to: '/user/payments', label: 'Pay', icon: Wallet },
  { to: '/user/claims', label: 'Claims', icon: AlertCircle },
  { to: '/user/account', label: 'Account', icon: UserRound },
]

function AccountMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const links = [
    ['/user/account', 'Profile & account'],
    ['/user/applications', 'My applications'],
    ['/user/renewals', 'Renewals'],
    ['/user/beneficiaries', 'Beneficiaries'],
    ['/user/notifications', 'Notifications'],
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        style={{ width: 'auto', padding: '0 6px', gap: 6 }}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-avatar" style={{ width: 30, height: 30, background: '#16304F', color: '#fff' }} aria-hidden="true">{initials(user?.name)}</span>
        <ChevronDown size={14} aria-hidden="true" />
        <span style={{ position: 'absolute', left: -9999 }}>Account menu</span>
      </button>
      {open && (
        <div className="notif-pop" role="menu" style={{ width: 240 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.name}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{user?.email}</div>
          </div>
          {links.map(([to, label]) => (
            <Link key={to} to={to} role="menuitem" className="notif-item" style={{ padding: '10px 16px', fontSize: 13.5, color: 'var(--color-text-primary)' }} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <button type="button" role="menuitem" className="notif-item" onClick={signOut}
            style={{ width: '100%', textAlign: 'left', border: 0, borderTop: '1px solid var(--color-border-subtle)', background: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13.5, color: '#B91C1C', display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px' }}>
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function CustomerLayout() {
  return (
    <div className="cp">
      <a href="#cp-content" className="skip-link">Skip to content</a>
      <header className="cp-top">
        <div className="cp-top-inner">
          <Brand sub="My Insurance" to="/user" light />
          <nav className="cp-nav" aria-label="Main">
            {TOP_NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NotificationBell allHref="/user/notifications" />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="cp-content" className="cp-main" tabIndex={-1}>
        <Suspense fallback={<div className="skel" style={{ height: 160, margin: 8 }} aria-busy="true" />}><Outlet /></Suspense>
      </main>

      <nav className="cp-tabs" aria-label="Quick navigation">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
