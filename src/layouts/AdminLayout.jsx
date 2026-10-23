import { useState, useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

const SIDEBAR_COLLAPSED_KEY = 'insurex_sidebar_collapsed'

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarWidth = collapsed
    ? 'var(--sidebar-collapsed-width)'
    : 'var(--sidebar-width)'

  function handleToggleCollapse() {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)) } catch {}
      return next
    })
  }

  function handleOpenMobile() {
    setMobileOpen(true)
  }

  function handleCloseMobile() {
    setMobileOpen(false)
  }

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      <div
        className={`main-content-wrapper ${collapsed ? 'collapsed' : ''}`}
      >
        <Topbar
          collapsed={collapsed}
          onToggleMobile={handleOpenMobile}
          sidebarWidth={sidebarWidth}
        />

        <main className="main-content" id="main-content" tabIndex={-1}>
          <Suspense fallback={<div className="skel" style={{ height: 160, margin: 8 }} aria-busy="true" />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
