export default function Badge({ children, variant = 'blue', dot = false, className = '' }) {
  const variantClass = {
    blue: 'badge-blue',
    green: 'badge-green',
    yellow: 'badge-yellow',
    red: 'badge-red',
    gray: 'badge-gray',
    purple: 'badge-purple',
  }[variant] || 'badge-gray'

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
            opacity: 0.8,
          }}
        />
      )}
      {children}
    </span>
  )
}

// Helper: maps status strings to badge variants
export function StatusBadge({ status }) {
  const map = {
    active: { variant: 'green', label: 'Active' },
    inactive: { variant: 'gray', label: 'Inactive' },
    pending: { variant: 'yellow', label: 'Pending' },
    approved: { variant: 'green', label: 'Approved' },
    rejected: { variant: 'red', label: 'Rejected' },
    expired: { variant: 'red', label: 'Expired' },
    processing: { variant: 'blue', label: 'Processing' },
    paid: { variant: 'green', label: 'Paid' },
    unpaid: { variant: 'red', label: 'Unpaid' },
    overdue: { variant: 'red', label: 'Overdue' },
    cancelled: { variant: 'gray', label: 'Cancelled' },
    open: { variant: 'blue', label: 'Open' },
    closed: { variant: 'gray', label: 'Closed' },
    settled: { variant: 'green', label: 'Settled' },
  }
  const config = map[status?.toLowerCase()] || { variant: 'gray', label: status }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}
