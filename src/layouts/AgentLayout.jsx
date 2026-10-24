import { useEffect, useRef, useState, Suspense } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen, Shield, Wallet, AlertCircle, RefreshCcw,
  Archive, BarChart3, Menu, Search, LogOut, FilePlus2, Bell, History, UserCog, ChevronDown, X,
  ListChecks,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/apiClient'
import { Brand } from '../components/panel'
import NotificationBell from '../components/panel/NotificationBell'
import { fullName, initials } from '../lib/format'
import '../styles/agent.css'

const NAV = [
  { label: 'Overview', items: [
    { to: '/agent', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/agent/tasks', label: 'Tasks & follow-ups', icon: ListChecks },
    { to: '/agent/performance', label: 'My performance', icon: BarChart3 },
  ] },
  { label: 'My book', items: [
    { to: '/agent/customers', label: 'Customers', icon: Users },
    { to: '/agent/applications', label: 'Applications', icon: FolderOpen },
    { to: '/agent/policies', label: 'Policies', icon: Shield },
  ] },
  { label: 'Servicing', items: [
    { to: '/agent/premiums', label: 'Premiums & payments', icon: Wallet },
    { to: '/agent/claims', label: 'Claims', icon: AlertCircle },
    { to: '/agent/renewals', label: 'Renewals', icon: RefreshCcw },
    { to: '/agent/documents', label: 'Documents', icon: Archive },
  ] },
  { label: 'Account', items: [
    { to: '/agent/notifications', label: 'Notifications', icon: Bell },
    { to: '/agent/activity', label: 'Activity history', icon: History },
    { to: '/agent/profile', label: 'Profile & settings', icon: UserCog },
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
    if (q.trim().length < 2) { setResults(null); return undefined }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/agent/customers', { search: q.trim(), limit: 6 }, { signal: controller.signal })
        setResults(res.data.data)
        setOpen(true)
      } catch (err) {
        if (!err.isCancelled) setResults([])
      }
    }, 250)
    return () => { clearTimeout(t); controller.abort() }
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
      <label htmlFor="agent-search" className="sr-only">Search my customers</label>
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
            <button key={c.id} type="button" className="row" role="option" aria-selected="false" onClick={() => go(c.id)}>
              <span className="ag-avatar sm" aria-hidden="true">{initials(fullName(c))}</span>
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

function AccountMenu({ name, meta, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="ag-account-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ag-avatar sm" aria-hidden="true">{initials(name)}</span>
        <span className="ag-account-text">
          <span className="ag-account-name" style={{ display: 'block' }}>{name}</span>
          <span className="ag-account-role" style={{ display: 'block' }}>{meta}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div className="ag-menu" role="menu">
          <div className="ag-menu-head">
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name}</div>
            <div className="muted" style={{ fontSize: 12 }}>{meta}</div>
          </div>
          <Link role="menuitem" to="/agent/profile"><UserCog size={16} aria-hidden="true" /> Profile & settings</Link>
          <Link role="menuitem" to="/agent/activity"><History size={16} aria-hidden="true" /> Activity history</Link>
          <Link role="menuitem" to="/agent/notifications"><Bell size={16} aria-hidden="true" /> Notifications</Link>
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', margin: '6px 0' }} />
          <button role="menuitem" type="button" className="danger" onClick={onSignOut}><LogOut size={16} aria-hidden="true" /> Sign out</button>
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
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const profile = user?.agentProfile
  const name = profile ? fullName(profile) : user?.name || 'Agent'
  const meta = profile?.agentNumber ? `Agent · ${profile.agentNumber}` : 'Insurance agent'

  return (
    <div className="ws ag">
      <a href="#ws-content" className="skip-link">Skip to content</a>
      <div className={`ws-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`ws-side ${menuOpen ? 'open' : ''}`} aria-label="Agent navigation">
        <div className="ws-side-brand" style={{ justifyContent: 'space-between' }}>
          <Brand sub="Advisor Workspace" to="/agent" />
          <button type="button" className="icon-btn ws-menu-btn" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="ag-identity">
          <span className="ag-avatar" aria-hidden="true">{initials(name)}</span>
          <div style={{ minWidth: 0 }}>
            <div className="ag-identity-name">{name}</div>
            <div className="ag-identity-meta"><span className="ag-status-dot" aria-hidden="true" />{profile?.agentNumber || 'Agent'}</div>
          </div>
        </div>
        <nav className="ws-nav">
          {NAV.map((section) => (
            <div key={section.label} role="group" aria-label={section.label}>
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
          <button type="button" className="ws-link ag-signout" onClick={signOut}>
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-top">
          <button type="button" className="icon-btn ws-menu-btn" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <CustomerSearch />
          <div style={{ flex: 1 }} />
          <Link to="/agent/applications/new" aria-label="New application" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FilePlus2 size={15} aria-hidden="true" /> <span className="hide-xs">New application</span>
          </Link>
          <NotificationBell allHref="/agent/notifications" />
          <AccountMenu name={name} meta={meta} onSignOut={signOut} />
        </header>
        <main id="ws-content" className="ws-content" tabIndex={-1}>
          <Suspense fallback={<div className="skel" style={{ height: 160, margin: 8 }} aria-busy="true" />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
