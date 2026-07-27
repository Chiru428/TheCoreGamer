'use client';

/**
 * ErrorBoundary — wraps editor content to catch render crashes
 * and provide a recovery UI instead of a white screen.
 */

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Editor crash caught:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            padding: '40px',
            background: '#0a0f1e',
            border: '1px solid #FF4D4D30',
            borderRadius: '12px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ color: '#FF8080', fontSize: '14px', fontWeight: 600 }}>
            {this.props.fallbackMessage || 'Editor encountered an error'}
          </div>
          <div style={{ color: '#5a7090', fontSize: '12px', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering the editor.'}
          </div>
          <button
            onClick={this.handleReload}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #00E5FF40',
              background: '#00E5FF15',
              color: '#00E5FF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload Editor
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
