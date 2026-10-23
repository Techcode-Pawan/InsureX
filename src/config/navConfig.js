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
  BadgeCheck,
  KeyRound,
} from 'lucide-react'

export const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Core',
    items: [
      { label: 'Customers', path: '/admin/customers', icon: Users },
      { label: 'Insurance Policies', path: '/admin/policies', icon: Shield },
      { label: 'Policy Types', path: '/admin/policy-types', icon: FileText },
      { label: 'Applications', path: '/admin/applications', icon: FolderOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Premiums', path: '/admin/premiums', icon: CreditCard },
      { label: 'Payments', path: '/admin/payments', icon: Banknote },
      { label: 'Verification Queue', path: '/admin/verifications', icon: BadgeCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Claims', path: '/admin/claims', icon: AlertCircle },
      { label: 'Claim Processing', path: '/admin/claim-processing', icon: GitPullRequest },
      { label: 'Agents', path: '/admin/agents', icon: UserCheck },
      { label: 'Beneficiaries', path: '/admin/beneficiaries', icon: Heart },
      { label: 'Documents', path: '/admin/documents', icon: Archive },
      { label: 'Renewals', path: '/admin/renewals', icon: RefreshCcw },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Insurance Companies', path: '/admin/insurance-companies', icon: Building2 },
      { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
      { label: 'Users & Access', path: '/admin/access', icon: KeyRound },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
]

// The admin console is only reachable by ADMIN logins (enforced by the API and the route guard),
// so every section is shown. Agents and customers have their own layouts and navigation.
export function getNavSectionsForRole() {
  return navSections
}
