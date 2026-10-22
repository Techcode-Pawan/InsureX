import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, Menu, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { navSections } from '../../config/navConfig'

function getPageTitle(pathname) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))) {
        return item.label
      }
    }
  }
  return 'Page'
}

export default function Topbar({ collapsed, onToggleMobile, sidebarWidth }) {
  const location = useLocation()
  const [searchValue, setSearchValue] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const userMenuRef = useRef(null)
  const notifRef = useRef(null)

  const pageTitle = getPageTitle(location.pathname)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
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
      aria-label="Topbar"
    >
      {/* Mobile menu toggle */}
      <button
        className="btn btn-ghost btn-icon lg:hidden"
        onClick={onToggleMobile}
        aria-label="Open navigation menu"
        id="mobile-menu-toggle"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="topbar-search hidden sm:block">
        <div className="input-wrapper">
          <Search size={15} className="input-prefix-icon" />
          <input
            type="search"
            className="input input-icon-left"
            placeholder="Search customers, policies, claims…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Global search"
            id="global-search"
            style={{ fontSize: 13, height: 36 }}
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search icon on mobile */}
      <button className="btn btn-ghost btn-icon sm:hidden" aria-label="Search">
        <Search size={18} />
      </button>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-icon"
          style={{ position: 'relative' }}
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
          id="notification-btn"
          aria-expanded={notifOpen}
        >
          <Bell size={18} />
          <span className="notification-dot" aria-hidden="true" />
        </button>

        {notifOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 10px 25px rgba(6,20,38,0.12)',
              width: 320,
              zIndex: 100,
              overflow: 'hidden',
            }}
            role="dialog"
            aria-label="Notifications panel"
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#172033' }}>Notifications</span>
              <span className="badge badge-blue">3 new</span>
            </div>
            {[
              { title: 'Policy #P-2024-001 renewed', time: '5 min ago', color: '#168BFF' },
              { title: 'Claim #CL-2024-089 pending review', time: '1 hr ago', color: '#F59E0B' },
              { title: 'New customer registration: John Doe', time: '3 hr ago', color: '#10B981' },
            ].map((n, i) => (
              <div
                key={i}
                style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#172033' }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 16px', textAlign: 'center' }}>
              <button className="btn btn-ghost" style={{ fontSize: 12.5, color: '#168BFF', width: '100%' }}>View all notifications</button>
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={userMenuRef} style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost"
          style={{ gap: 8, padding: '4px 8px' }}
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-label="User menu"
          id="user-menu-btn"
          aria-expanded={userMenuOpen}
        >
          <div className="user-avatar" aria-hidden="true">AD</div>
          <div className="hidden sm:block" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#172033' }}>Admin User</div>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>Super Admin</div>
          </div>
          <ChevronDown size={15} style={{ color: '#64748B' }} />
        </button>

        {userMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 10px 25px rgba(6,20,38,0.12)',
              width: 200,
              zIndex: 100,
              overflow: 'hidden',
            }}
            role="menu"
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#172033' }}>Admin User</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>admin@insurex.com</div>
            </div>
            {[
              { icon: User, label: 'My Profile' },
              { icon: Settings, label: 'Settings' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="btn btn-ghost"
                role="menuitem"
                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '10px 16px', gap: 10 }}
              >
                <Icon size={15} style={{ color: '#64748B' }} />
                <span style={{ fontSize: 13, color: '#172033' }}>{label}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid #F1F5F9' }}>
              <button
                className="btn btn-ghost"
                role="menuitem"
                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '10px 16px', gap: 10, color: '#DC2626' }}
              >
                <LogOut size={15} />
                <span style={{ fontSize: 13 }}>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
