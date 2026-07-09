import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an uncaught exception:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="guest-portal-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
          <div className="guest-ambient-bg">
            <div className="guest-glow-orb guest-orb-1" />
            <div className="guest-glow-orb guest-orb-2" />
            <div className="guest-glow-orb guest-orb-3" />
          </div>
          <div className="guest-mesh-grid" />

          <div className="login-glass-card" style={{ position: 'relative', zIndex: 10, maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>⚠️</span>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h2>
            <p className="muted" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
              An unexpected application error occurred. Please try reloading the page or contact the coordinators if the issue persists.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '0.8rem',
                overflowX: 'auto',
                border: '1px solid rgba(255,255,255,0.05)',
                color: '#ff6b6b',
                fontFamily: 'monospace',
                marginBottom: '24px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{ width: '100%' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
