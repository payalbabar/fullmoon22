import React from 'react';
import { captureError } from '../lib/sentry';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Top-level React error boundary.
 * Catches unexpected runtime errors and shows a styled recovery UI.
 * Reports to Sentry when configured.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, {
      component_stack: info.componentStack?.substring(0, 500) || '',
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          backgroundImage:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(239, 68, 68, 0.12) 0%, transparent 60%)',
          padding: '2rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            padding: '3rem 2.5rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 20px 60px rgba(239, 68, 68, 0.18)',
            background: 'rgba(11, 15, 29, 0.95)',
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '22px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <AlertTriangle size={38} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffffff' }}>
            Something went wrong
          </h2>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.65, fontSize: '0.96rem' }}>
            An unexpected error occurred in the application view.
          </p>

          {/* Safety Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              borderRadius: '12px',
              padding: '0.75rem 1.1rem',
              marginBottom: '1.75rem',
              fontSize: '0.88rem',
              color: '#34d399',
            }}
          >
            <Shield size={16} />
            <span>Your wallet and on-chain funds are safe and untouched.</span>
          </div>

          {/* Error Details */}
          {this.state.error && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '0.95rem',
                marginBottom: '1.85rem',
                textAlign: 'left',
              }}
            >
              <p
                className="font-mono"
                style={{ fontSize: '0.76rem', color: 'var(--text-muted)', wordBreak: 'break-word', lineHeight: 1.55 }}
              >
                {this.state.error.message}
              </p>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{ gap: '0.55rem', width: '100%', padding: '0.95rem', fontSize: '1rem', fontWeight: 700 }}
          >
            <RefreshCw size={17} />
            <span>Reload Application</span>
          </button>
        </div>
      </div>
    );
  }
}
