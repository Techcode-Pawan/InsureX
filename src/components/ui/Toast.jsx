// ── Toast Notification (lightweight, no deps) ─────────────────
import { useEffect } from 'react'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const isSuccess = type === 'success'
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        display: 'flex', alignItems: 'center', gap: 10,
        background: isSuccess ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECACA'}`,
        borderRadius: 12, padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(6,20,38,0.12)',
        maxWidth: 360, fontSize: 13.5, fontWeight: 500,
        color: isSuccess ? '#15803D' : '#DC2626',
        animation: 'slideInRight 0.25s ease',
      }}
    >
      {isSuccess
        ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
        : <AlertCircle  size={18} style={{ flexShrink: 0 }} />
      }
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'inherit', flexShrink: 0 }}
        aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  )
}
