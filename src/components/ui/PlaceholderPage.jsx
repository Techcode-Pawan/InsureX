import { Clock } from 'lucide-react'
import PageHeader from '../layout/PageHeader'
import Card from './Card'

export default function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div>
      <PageHeader title={title} subtitle={description} />
      <Card>
        <div className="placeholder-page">
          <div className="placeholder-icon-bg" aria-hidden="true">
            {Icon && <Icon size={32} />}
          </div>
          <h2 className="placeholder-title">{title}</h2>
          <p className="placeholder-description">
            {description || `The ${title} module is under development. Full functionality including data tables, filters, and CRUD operations will be implemented in the next phase.`}
          </p>
          <span className="placeholder-badge">
            <Clock size={11} />
            Scheduled for Next Sprint
          </span>
        </div>
      </Card>
    </div>
  )
}
