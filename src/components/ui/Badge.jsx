export default function Badge({ children, variant = 'blue', dot = false, className = '' }) {
  const variantClass = {
    blue: 'badge-blue',
    green: 'badge-green',
    yellow: 'badge-yellow',
    amber: 'badge-yellow',
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
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  )
}

// Maps status strings to semantic badge configurations
export function StatusBadge({ status }) {
  if (!status) return null

  const s = String(status).toLowerCase().replace(/_/g, ' ')
  
  const map = {
    'active': { variant: 'green', label: 'Active' },
    'verified': { variant: 'green', label: 'Verified' },
    'approved': { variant: 'green', label: 'Approved' },
    'settled': { variant: 'green', label: 'Settled' },
    'paid': { variant: 'green', label: 'Paid' },
    'renewed': { variant: 'green', label: 'Renewed' },

    'pending': { variant: 'yellow', label: 'Pending' },
    'under review': { variant: 'yellow', label: 'Under Review' },
    'pending verification': { variant: 'yellow', label: 'Pending Verification' },
    'investigating': { variant: 'yellow', label: 'Investigating' },
    'upcoming': { variant: 'yellow', label: 'Upcoming' },

    'processing': { variant: 'blue', label: 'Processing' },
    'open': { variant: 'blue', label: 'Open' },
    'in progress': { variant: 'blue', label: 'In Progress' },
    'submitted': { variant: 'blue', label: 'Submitted' },

    'overdue': { variant: 'red', label: 'Overdue' },
    'rejected': { variant: 'red', label: 'Rejected' },
    'expired': { variant: 'red', label: 'Expired' },
    'unpaid': { variant: 'red', label: 'Unpaid' },
    'lapsed': { variant: 'red', label: 'Lapsed' },

    'inactive': { variant: 'gray', label: 'Inactive' },
    'closed': { variant: 'gray', label: 'Closed' },
    'cancelled': { variant: 'gray', label: 'Cancelled' },

    // Workflow states used by the role panels
    'success': { variant: 'green', label: 'Confirmed' },
    'failed': { variant: 'red', label: 'Failed' },
    'due': { variant: 'blue', label: 'Due' },
    'partially paid': { variant: 'yellow', label: 'Partially Paid' },
    'grace period': { variant: 'yellow', label: 'Grace Period' },
    'needs info': { variant: 'yellow', label: 'Needs Info' },
    'partial': { variant: 'yellow', label: 'Partial' },
    'awaiting review': { variant: 'yellow', label: 'Awaiting Review' },
    'under verification': { variant: 'blue', label: 'Under Verification' },
    'documents required': { variant: 'yellow', label: 'Documents Required' },
    'on leave': { variant: 'gray', label: 'On Leave' },
    'suspended': { variant: 'red', label: 'Suspended' },
  }

  const config = map[s] || { variant: 'gray', label: status }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}
