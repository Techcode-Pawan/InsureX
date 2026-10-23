import { useEffect, useRef, useState, Suspense } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen, Shield, CalendarClock, AlertCircle, RefreshCcw,
  Archive, BarChart3, Menu, Search, LogOut, FilePlus2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/apiClient'
import { Brand } from '../components/panel'
import NotificationBell from '../components/panel/NotificationBell'
import { fullName } from '../lib/format'

const NAV = [
  { label: 'Today', items: [
    { to: '/agent', label: 'Workspace', icon: LayoutDashboard, end: true },
  ] },
  { label: 'My book', items: [
    { to: '/agent/customers', label: 'Customers', icon: Users },
    { to: '/agent/applications', label: 'Applications', icon: FolderOpen },
    { to: '/agent/policies', label: 'Policies', icon: Shield },
  ] },
  { label: 'Follow-ups', items: [
    { to: '/agent/premiums', label: 'Premium dues', icon: CalendarClock },
    { to: '/agent/renewals', label: 'Renewals', icon: RefreshCcw },
    { to: '/agent/documents', label: 'Documents', icon: Archive },
    { to: '/agent/claims', label: 'Claims', icon: AlertCircle },
  ] },
  { label: 'Insights', items: [
    { to: '/agent/performance', label: 'My performance', icon: BarChart3 },
  ] },
]

// Searches only the agent's own assigned customers (server-scoped).
function CustomerSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/agent/customers', { search: q.trim(), limit: 6 })
        setResults(res.data.data)
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function go(id) {
    setOpen(false)
    setQ('')
    navigate(`/agent/customers/${id}`)
  }

  return (
    <div className="ws-search" ref={boxRef}>
      <label htmlFor="agent-search" className="sr-only" style={{ position: 'absolute', left: -9999 }}>Search my customers</label>
      <div className="input-wrapper">
        <span className="input-prefix-icon"><Search size={15} aria-hidden="true" /></span>
        <input
          id="agent-search"
          className="input input-icon-left"
          placeholder="Search my customers by name, number, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && results?.[0]) go(results[0].id)
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="agent-search-results"
        />
      </div>
      {open && results && (
        <div className="ws-search-results" id="agent-search-results" role="listbox">
          {results.length === 0 && <p className="muted" style={{ padding: 14, margin: 0, fontSize: 13 }}>No matching customers in your book.</p>}
          {results.map((c) => (
            <button key={c.id} type="button" className="row" role="option" onClick={() => go(c.id)}>
              <div className="row-main">
                <div className="row-title">{fullName(c)}</div>
                <div className="row-meta">{c.customerNumber} · {c.phone} · {c.city}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AgentLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const profile = user?.agentProfile

  return (
    <div className="ws">
      <a href="#ws-content" className="skip-link">Skip to content</a>
      <div className={`ws-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`ws-side ${menuOpen ? 'open' : ''}`} aria-label="Agent navigation">
        <div className="ws-side-brand"><Brand sub="Advisor Workspace" to="/agent" /></div>
        <div className="ws-agent">
          <div className="ws-agent-name">{profile ? fullName(profile) : user?.name}</div>
          <div className="ws-agent-meta">{profile?.agentNumber || 'Agent'}</div>
        </div>
        <nav className="ws-nav">
          {NAV.map((section) => (
            <div key={section.label}>
              <div className="ws-nav-label">{section.label}</div>
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `ws-link ${isActive ? 'active' : ''}`}>
                  <Icon size={17} aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="ws-side-foot">
          <button type="button" className="ws-link" style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer', font: 'inherit' }} onClick={signOut}>
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-top">
          <button type="button" className="icon-btn ws-menu-btn" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <CustomerSearch />
          <div style={{ flex: 1 }} />
          <Link to="/agent/applications/new" aria-label="New application" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FilePlus2 size={15} aria-hidden="true" /> <span className="hide-xs">New application</span>
          </Link>
          <NotificationBell allHref="/agent/notifications" />
        </header>
        <main id="ws-content" className="ws-content" tabIndex={-1}>
          <Suspense fallback={<div className="skel" style={{ height: 160, margin: 8 }} aria-busy="true" />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
