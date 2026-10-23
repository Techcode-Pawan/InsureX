// Display formatting shared by all three panels.

const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function inr(value, { exact = false } = {}) {
  const n = Number(value || 0)
  return exact ? inrFmt2.format(n) : inrFmt.format(n)
}

// ₹12.4L / ₹1.2Cr style for KPI tiles
export function inrCompact(value) {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L`
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

export function date(value, opts = {}) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts })
}

export function dateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function daysUntil(value) {
  if (!value) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - start) / 86400000)
}

// "in 5 days", "today", "3 days ago"
export function relativeDays(value) {
  const n = daysUntil(value)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

export function timeAgo(value) {
  if (!value) return ''
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return date(value)
}

export function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function fullName(p) {
  return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '—'
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
