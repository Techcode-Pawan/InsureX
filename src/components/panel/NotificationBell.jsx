import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import api from '../../services/apiClient'
import { timeAgo } from '../../lib/format'

// Real notifications for the signed-in user (generated from business events on the server).
export default function NotificationBell({ allHref }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState(null)
  const ref = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { limit: 8 })
      setItems(res.data.data)
      setUnread(res.data.unread)
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function markAll() {
    await api.post('/notifications/read-all').catch(() => {})
    load()
  }

  async function openItem(n) {
    setOpen(false)
    if (!n.readAt) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {})
      load()
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn notif-btn"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => { setOpen((v) => !v); if (!open) load() }}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && <span className="notif-count" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="panel-head" style={{ padding: '12px 16px' }}>
            <h2 className="panel-title" style={{ color: 'var(--color-text-primary)' }}>Notifications</h2>
            {unread > 0 && (
              <button type="button" className="panel-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {error && <p className="muted" style={{ padding: 16, margin: 0, fontSize: 13 }}>{error.message}</p>}
            {!error && items.length === 0 && (
              <p className="muted" style={{ padding: 16, margin: 0, fontSize: 13 }}>You're all caught up. Updates about your records will appear here.</p>
            )}
            {items.map((n) => (
              <Link key={n.id} to={n.link || allHref || '#'} className={`notif-item ${n.readAt ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <div className="notif-title" style={{ color: 'var(--color-text-primary)' }}>{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{timeAgo(n.createdAt)}</div>
              </Link>
            ))}
          </div>
          {allHref && (
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '10px 16px' }}>
              <Link to={allHref} className="panel-link" onClick={() => setOpen(false)}>View all notifications</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
