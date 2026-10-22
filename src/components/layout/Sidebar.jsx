import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { navSections } from '../../config/navConfig'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const location = useLocation()

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
          <div className="sidebar-logo-img flex items-center justify-center bg-blue-600 text-white font-black text-sm rounded-lg flex-shrink-0" style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #168BFF, #20B8FF)' }}>
            IX
          </div>
          <span className="sidebar-logo-text">
            Insure<span className="text-electric">X</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
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

        {/* Footer: collapse toggle */}
        <div className="sidebar-footer">
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
