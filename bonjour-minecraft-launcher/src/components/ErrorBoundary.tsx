import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#000',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            应用遇到了问题
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 400 }}>
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              borderRadius: 12,
              background: '#4ade80',
              color: '#000',
              fontWeight: 'bold',
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
          {this.state.error && (
            <details style={{ marginTop: 32, maxWidth: 600, width: '100%', textAlign: 'left' }}>
              <summary style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>
                错误详情
              </summary>
              <pre style={{
                marginTop: 8,
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
