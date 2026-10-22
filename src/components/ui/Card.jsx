export default function Card({ children, className = '', padding = true, style = {} }) {
  return (
    <div
      className={`card ${className}`}
      style={{ padding: padding ? undefined : 0, ...style }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="card-header">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
