import { useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { navSections } from '../../config/navConfig'

function getPageMeta(pathname) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))) {
        return { ...item, section: section.label }
      }
    }
  }
  return { label: 'Console', section: 'Overview' }
}

export default function PageHeader({ title, subtitle, actions, breadcrumbExtra }) {
  const location = useLocation()
  const meta = getPageMeta(location.pathname)
  const pageTitle = title || meta.label
  const pageSection = meta.section

  return (
    <div className="page-header">
      {/* Breadcrumb navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="breadcrumb-item">InsureX</span>
        {pageSection && (
          <>
            <ChevronRight size={11} className="breadcrumb-sep" />
            <span className="breadcrumb-item">{pageSection}</span>
          </>
        )}
        <ChevronRight size={11} className="breadcrumb-sep" />
        <span className="breadcrumb-item active">{breadcrumbExtra || pageTitle}</span>
      </nav>

      {/* Main title and header actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
