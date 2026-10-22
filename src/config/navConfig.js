import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  FolderOpen,
  CreditCard,
  Banknote,
  AlertCircle,
  GitPullRequest,
  UserCheck,
  Heart,
  Archive,
  RefreshCcw,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react'

export const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Core',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Insurance Policies', path: '/policies', icon: Shield },
      { label: 'Policy Types', path: '/policy-types', icon: FileText },
      { label: 'Applications', path: '/applications', icon: FolderOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Premiums', path: '/premiums', icon: CreditCard },
      { label: 'Payments', path: '/payments', icon: Banknote },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Claims', path: '/claims', icon: AlertCircle },
      { label: 'Claim Processing', path: '/claim-processing', icon: GitPullRequest },
      { label: 'Agents', path: '/agents', icon: UserCheck, adminOnly: true },
      { label: 'Beneficiaries', path: '/beneficiaries', icon: Heart },
      { label: 'Documents', path: '/documents', icon: Archive },
      { label: 'Renewals', path: '/renewals', icon: RefreshCcw },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Insurance Companies', path: '/insurance-companies', icon: Building2, adminOnly: true },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
    ],
  },
]

/**
 * Filter navigation sections according to user role
 * For AGENT role: hides Admin-only management modules (Agents, Companies, Settings)
 */
export function getNavSectionsForRole(role) {
  const isAgent = role === 'AGENT'
  return navSections
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (isAgent && item.adminOnly) return false
        return true
      })
      return {
        ...section,
        items: filteredItems,
      }
    })
    .filter((section) => section.items.length > 0)
}
