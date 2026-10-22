export default function LoadingState({ message = 'Loading data…' }) {
  return (
    <div className="loading-state" role="status" aria-label={message}>
      <div className="spinner" aria-hidden="true" />
      <span style={{ fontSize: 13.5, color: '#64748B' }}>{message}</span>
    </div>
  )
}
