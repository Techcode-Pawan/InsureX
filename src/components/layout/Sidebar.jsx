import { NavLink, useLocation, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogIn, LogOut, Shield, Briefcase } from 'lucide-react'
import { getNavSectionsForRole } from '../../config/navConfig'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

  const isAgent = user?.role === 'AGENT'
  const sections = getNavSectionsForRole(user?.role)

  const isActive = (path) => location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path))

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={sidebarClass} aria-label="Main Navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-img flex items-center justify-center bg-blue-600 text-white font-black text-sm rounded-lg flex-shrink-0" style={{ width: 36, height: 36, background: isAgent ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #168BFF, #20B8FF)' }}>
            IX
          </div>
          <div className="sidebar-logo-text" style={{ display: 'flex', flexDirection: 'column' }}>
            <span>
              Insure<span className="text-electric">X</span>
            </span>
            {!collapsed && (
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: isAgent ? '#34D399' : '#60A5FA', textTransform: 'uppercase' }}>
                {isAgent ? 'Advisor Portal' : 'Admin Console'}
              </span>
            )}
          </div>
        </div>

        {/* Role Authority Indicator */}
        {!collapsed && (
          <div style={{ padding: '0 12px 10px 12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                background: isAgent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(22, 139, 255, 0.12)',
                border: isAgent ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(22, 139, 255, 0.25)',
                color: isAgent ? '#34D399' : '#93C5FD',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {isAgent ? <Briefcase size={13} /> : <Shield size={13} />}
              <span>{isAgent ? 'Field Agent Authority' : 'Super Admin Authority'}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <div key={item.path} className="tooltip-wrapper">
                    <NavLink
                      to={item.path}
                      className={`nav-item ${active ? 'active' : ''}`}
                      onClick={onCloseMobile}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="nav-item-icon" size={18} />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                    {collapsed && (
                      <span className="tooltip">{item.label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer: Auth & collapse toggle */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 8px' }}>
          {isAuthenticated ? (
            <div className="tooltip-wrapper" style={{ marginBottom: 6 }}>
              <button
                className="nav-item btn-ghost"
                onClick={logout}
                style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: '#EF4444' }}
                title="Log out of current account"
              >
                <LogOut className="nav-item-icon" size={17} />
                {!collapsed && (
                  <span className="nav-item-label" style={{ fontSize: 13 }}>
                    Sign Out
                  </span>
                )}
              </button>
              {collapsed && <span className="tooltip">Sign Out ({user?.name || 'User'})</span>}
            </div>
          ) : (
            <div className="tooltip-wrapper" style={{ marginBottom: 6 }}>
              <Link
                to="/login"
                className="nav-item btn-ghost"
                style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: '#168BFF' }}
                title="Sign In to access all features"
              >
                <LogIn className="nav-item-icon" size={17} />
                {!collapsed && (
                  <span className="nav-item-label" style={{ fontSize: 13, fontWeight: 600 }}>
                    Sign In
                  </span>
                )}
              </Link>
              {collapsed && <span className="tooltip">Sign In</span>}
            </div>
          )}

          <div className="tooltip-wrapper">
            <button
              className="nav-item btn-ghost"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              {collapsed
                ? <ChevronRight className="nav-item-icon" size={18} />
                : (
                  <>
                    <ChevronLeft className="nav-item-icon" size={18} />
                    <span className="nav-item-label" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>Collapse</span>
                  </>
                )
              }
            </button>
            {collapsed && <span className="tooltip">Expand Sidebar</span>}
          </div>
        </div>
      </aside>
    </>
  )
}
