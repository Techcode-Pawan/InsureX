import { Component } from 'react'

// Last-resort guard: an unexpected render error shows a recoverable message instead of a blank
// page. The error is still logged to the console for debugging.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[InsureX] Unexpected UI error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-bg-canvas)' }}>
        <div className="panel" style={{ maxWidth: 440, padding: 24 }}>
          <h1 className="px-title" style={{ fontSize: 20 }}>Something went wrong on this page</h1>
          <p className="px-sub" style={{ margin: '8px 0 16px' }}>
            Your data is safe. Reload the page to continue; if this keeps happening, note what you were doing and contact support.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    )
  }
}
