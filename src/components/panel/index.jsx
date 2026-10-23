// Building blocks shared by the Admin, Agent and Customer panels.
import { Link } from 'react-router-dom'
import { AlertTriangle, Info, CheckCircle2, XCircle, ChevronRight, ChevronLeft, RotateCw } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export function Brand({ sub, to = '/', light = false }) {
  return (
    <Link to={to} className="ix-brand" aria-label="InsureX home" style={light ? { color: '#fff' } : undefined}>
      <span className="ix-brand-mark" aria-hidden="true">IX</span>
      <span>
        <span className="ix-brand-name">Insure<span className="x">X</span></span>
        {sub && <span className="ix-brand-sub">{sub}</span>}
      </span>
    </Link>
  )
}

export function PageHead({ eyebrow, title, sub, actions }) {
  return (
    <header className="px-head">
      <div>
        {eyebrow && <p className="px-eyebrow">{eyebrow}</p>}
        <h1 className="px-title">{title}</h1>
        {sub && <p className="px-sub">{sub}</p>}
      </div>
      {actions && <div className="px-actions">{actions}</div>}
    </header>
  )
}

export function Panel({ title, note, action, children, flush = false, className = '', id }) {
  return (
    <section className={`panel ${className}`} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {(title || action) && (
        <div className="panel-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="panel-title" id={id ? `${id}-title` : undefined}>{title}</h2>}
            {note && <p className="panel-note">{note}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

export function PanelLink({ to, children }) {
  return (
    <Link to={to} className="panel-link">
      {children} <ChevronRight size={14} aria-hidden="true" />
    </Link>
  )
}

export function KpiBand({ children, cols = 4 }) {
  return <div className="kpi-band" style={{ '--kpi-cols': cols }}>{children}</div>
}

export function Kpi({ label, value, foot, tone, to, icon: Icon }) {
  const content = (
    <>
      <div className="kpi-label">{Icon && <Icon size={14} aria-hidden="true" />}{label}</div>
      <div className="kpi-value">{value}</div>
      {foot && <div className={`kpi-foot ${tone || ''}`}>{foot}</div>}
    </>
  )
  return to ? <Link to={to} className="kpi">{content}</Link> : <div className="kpi">{content}</div>
}

export function Facts({ items }) {
  return (
    <dl className="facts">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

const NOTICE_ICON = { info: Info, warn: AlertTriangle, error: XCircle, ok: CheckCircle2 }
export function Notice({ tone = 'info', children, style }) {
  const Icon = NOTICE_ICON[tone]
  return (
    <div className={`notice ${tone === 'info' ? '' : tone}`} role={tone === 'error' ? 'alert' : 'status'} style={style}>
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function LoadingRows({ rows = 4 }) {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ padding: '6px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 18px' }}>
          <div className="skel" style={{ height: 14, flex: 1 }} />
          <div className="skel" style={{ height: 14, width: 80 }} />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  if (!error) return null
  return (
    <div style={{ padding: 18 }}>
      <Notice tone="error">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>{error.message || 'Something went wrong.'}</span>
          {onRetry && (
            <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry}>Retry</Button>
          )}
        </div>
      </Notice>
    </div>
  )
}

// Wraps a data region: skeleton while loading, error with retry, empty message, else children.
export function DataState({ loading, error, onRetry, empty, emptyText = 'Nothing to show yet.', rows, children }) {
  if (loading) return <LoadingRows rows={rows} />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (empty) return <p className="muted" style={{ padding: '18px', margin: 0, fontSize: 13.5 }}>{emptyText}</p>
  return children
}

export function Pager({ body, page, onPage }) {
  if (!body || !body.totalPages || body.totalPages <= 1) {
    return body?.total ? <div className="pager"><span>{body.total} record{body.total === 1 ? '' : 's'}</span></div> : null
  }
  return (
    <div className="pager">
      <span>Page {page} of {body.totalPages} · {body.total} records</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">Prev</Button>
        <Button variant="secondary" size="sm" icon={ChevronRight} iconPosition="right" disabled={page >= body.totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">Next</Button>
      </div>
    </div>
  )
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Confirmation for consequential actions. `danger` styles the confirm button destructively.
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, pending = false, error, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={pending}>{confirmLabel}</Button>
        </>
      }
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>{children}</div>
      {error && <div style={{ marginTop: 12 }}><Notice tone="error">{error.message}</Notice></div>}
    </Modal>
  )
}

// Progress tracker for applications / claims. `steps` = [{ key, label }], `current` = key, `failed` = bool
export function Steps({ steps, current, failed = false, failedLabel }) {
  const idx = steps.findIndex((s) => s.key === current)
  return (
    <ol className="steps" aria-label="Progress">
      {steps.map((s, i) => {
        const isFail = failed && i === idx
        const cls = isFail ? 'failed' : i < idx ? 'done' : i === idx ? (i === steps.length - 1 ? 'done' : 'current') : ''
        return (
          <li key={s.key} className={`step ${cls}`} aria-current={i === idx ? 'step' : undefined}>
            {isFail && failedLabel ? failedLabel : s.label}
          </li>
        )
      })}
    </ol>
  )
}
