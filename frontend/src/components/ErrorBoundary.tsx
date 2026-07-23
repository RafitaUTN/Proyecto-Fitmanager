import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode; name?: string }
interface State { error: Error | null; info: ErrorInfo | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info })
    console.error(`[ErrorBoundary:${this.props.name || 'unknown'}]`, error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ef4444', background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Error en: {this.props.name || 'component'}</h1>
          <p style={{ color: '#94a3b8', marginBottom: 8 }}>{this.state.error.name}</p>
          <pre style={{ color: '#f97316', whiteSpace: 'pre-wrap', marginBottom: 16 }}>{this.state.error.message}</pre>
          <pre style={{ color: '#64748b', fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
