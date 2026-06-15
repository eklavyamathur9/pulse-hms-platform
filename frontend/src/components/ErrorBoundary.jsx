import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="btn btn-primary" onClick={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
