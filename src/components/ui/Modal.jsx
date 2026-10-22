import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  const panelRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Trap focus in modal
  useEffect(() => {
    if (open) {
      panelRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const maxWidth = {
    sm: 400,
    md: 560,
    lg: 720,
    xl: 900,
  }[size] || 560

  return (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={panelRef}
        className="modal-panel"
        style={{ maxWidth }}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
            style={{ flexShrink: 0, marginTop: -2 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
