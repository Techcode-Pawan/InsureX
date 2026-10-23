import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react'
import { getNavSectionsForRole } from '../../config/navConfig'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const sections = getNavSectionsForRole(user?.role)

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path) => location.pathname === path ||
    (path !== '/admin' && location.pathname.startsWith(path))

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
        {/* Brand Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-img" aria-hidden="true">
            IX
          </div>
          <div className="sidebar-logo-text">
            <span>
              Insure<span className="text-electric">X</span>
            </span>
            <span className="sidebar-logo-badge">
              Operations Console
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: 14 }}>
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
                      <Icon className="nav-item-icon" size={17} />
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

        {/* Footer: User action & collapse toggle */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className="tooltip-wrapper" style={{ marginBottom: 4 }}>
              <button
                className="nav-item"
                onClick={signOut}
                style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: '#EF4444' }}
                title="Sign Out"
              >
                <LogOut className="nav-item-icon" size={16} />
                {!collapsed && (
                  <span className="nav-item-label" style={{ fontSize: 12.5 }}>
                    Sign Out
                  </span>
                )}
              </button>
              {collapsed && <span className="tooltip">Sign Out ({user?.name || 'User'})</span>}
            </div>
          ) : (
            <div className="tooltip-wrapper" style={{ marginBottom: 4 }}>
              <Link
                to="/login"
                className="nav-item"
                style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--color-primary)' }}
                title="Sign In"
              >
                <LogIn className="nav-item-icon" size={16} />
                {!collapsed && (
                  <span className="nav-item-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                    Sign In
                  </span>
                )}
              </Link>
              {collapsed && <span className="tooltip">Sign In</span>}
            </div>
          )}

          <div className="tooltip-wrapper">
            <button
              className="nav-item"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: '#8E9DB0' }}
            >
              {collapsed
                ? <ChevronRight className="nav-item-icon" size={16} />
                : (
                  <>
                    <ChevronLeft className="nav-item-icon" size={16} />
                    <span className="nav-item-label" style={{ fontSize: 12 }}>Collapse Sidebar</span>
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
