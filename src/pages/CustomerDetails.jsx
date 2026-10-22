import { useParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import PlaceholderPage from '../components/ui/PlaceholderPage'

export default function CustomerDetails() {
  const { id } = useParams()
  return (
    <PlaceholderPage
      title={`Customer Details${id ? ` – ${id}` : ''}`}
      description="View and edit a customer's full profile including personal information, linked policies, payment history, claims, and documents."
      icon={Users}
    />
  )
}
