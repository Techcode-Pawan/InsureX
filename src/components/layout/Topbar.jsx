import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Search, Menu, ChevronDown, LogOut, Settings } from 'lucide-react'
import NotificationBell from '../panel/NotificationBell'
import api from '../../services/apiClient'
import { navSections } from '../../config/navConfig'
import { useAuth } from '../../context/AuthContext'

function getPageTitle(pathname) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))) {
        return item.label
      }
    }
  }
  return 'Console'
}

// Live API + database reachability, checked every minute (not a static badge).
function DbStatus() {
  const [state, setState] = useState('checking')
  useEffect(() => {
    let alive = true
    async function check() {
      try {
        const res = await api.get('/health')
        if (alive) setState(res.data.database === 'connected' ? 'up' : 'degraded')
      } catch {
        if (alive) setState('down')
      }
    }
    check()
    const t = setInterval(check, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  const cfg = {
    checking: ['#64748B', '#F1F5F9', '#E2E8F0', 'Checking…'],
    up: ['#047857', '#ECFDF5', '#A7F3D0', 'Database connected'],
    degraded: ['#B45309', '#FFFBEB', '#FDE68A', 'Database unreachable'],
    down: ['#B91C1C', '#FEF2F2', '#FECACA', 'API offline'],
  }[state]
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1" role="status"
      style={{ color: cfg[0], background: cfg[1], border: `1px solid ${cfg[2]}`, borderRadius: 4 }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: cfg[0], display: 'inline-block' }} />
      <span style={{ fontSize: 11.5, fontWeight: 500 }}>{cfg[3]}</span>
    </div>
  )
}

export default function Topbar({ collapsed, onToggleMobile, sidebarWidth }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [searchValue, setSearchValue] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const userName = user?.name || 'Administrator'
  const userEmail = user?.email || ''
  const userRole = 'Administrator'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AD'

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const leftPosition = typeof window !== 'undefined' && window.innerWidth > 1024
    ? sidebarWidth
    : 0

  return (
    <header
      className="topbar"
      style={{ left: leftPosition }}
      aria-label="Application Topbar"
    >
      {/* Mobile menu toggle */}
      <button
        className="btn btn-ghost btn-icon lg:hidden"
        onClick={onToggleMobile}
        aria-label="Open navigation menu"
        id="mobile-menu-toggle"
      >
        <Menu size={18} />
      </button>

      {/* Global Search */}
      <div className="topbar-search hidden sm:block">
        <div className="input-wrapper">
          <Search size={14} className="input-prefix-icon" />
          <input
            type="search"
            className="input input-icon-left"
            placeholder="Search policies, customers, claims…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue.trim()) {
                navigate(`/admin/customers?search=${encodeURIComponent(searchValue.trim())}`)
              }
            }}
            aria-label="Global search"
            id="global-search"
            style={{ fontSize: 12.5, height: 34 }}
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <DbStatus />

      <NotificationBell allHref="/admin/notifications" />

      {/* User profile menu or Sign-in button */}
      {isAuthenticated ? (
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost"
            style={{ gap: 8, padding: '4px 6px' }}
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User account menu"
            id="user-menu-btn"
            aria-expanded={userMenuOpen}
          >
            <div className="user-avatar" aria-hidden="true">
              {userInitials}
            </div>
            <div className="hidden sm:block" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#172033', lineHeight: 1.2 }}>{userName}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{userRole}</div>
            </div>
            <ChevronDown size={14} style={{ color: '#94A3B8' }} />
          </button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                boxShadow: 'var(--shadow-lg)',
                width: 220,
                zIndex: 100,
                overflow: 'hidden',
              }}
              role="menu"
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#172033' }}>{userName}</div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>{userEmail}</div>
                <span className="badge badge-blue" style={{ marginTop: 6, fontSize: 10.5 }}>
                  Administrator
                </span>
              </div>

              <button
                className="btn btn-ghost"
                role="menuitem"
                onClick={() => { setUserMenuOpen(false); navigate('/admin/settings') }}
                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '9px 14px', gap: 8, fontSize: 12.5 }}
              >
                <Settings size={14} style={{ color: '#64748B' }} />
                <span>Account Settings</span>
              </button>

              <div style={{ borderTop: '1px solid #F1F5F9' }}>
                <button
                  className="btn btn-ghost"
                  role="menuitem"
                  onClick={async () => {
                    setUserMenuOpen(false)
                    await logout()
                    navigate('/login', { replace: true })
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '9px 14px', gap: 8, color: '#DC2626', fontSize: 12.5 }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            to="/login"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-primary)' }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="btn btn-primary btn-sm hidden sm:inline-flex"
            style={{ fontSize: 12.5 }}
          >
            Register
          </Link>
        </div>
      )}
    </header>
  )
}
