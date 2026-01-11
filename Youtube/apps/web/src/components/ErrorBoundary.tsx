'use client';

import React, { Component, ReactNode } from 'react';
import { reportReactError } from '@/lib/error-reporter';

// ===========================================
// Error Boundary Component
// ===========================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional component name for error context */
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component for catching React errors
 * Wraps children components and displays fallback UI on error
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Send to error reporting service
    reportReactError(error, errorInfo, this.props.componentName);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 text-lg font-semibold mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-red-600 text-sm mb-4">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4">
                <summary className="text-red-500 text-xs cursor-pointer">
                  상세 정보
                </summary>
                <pre className="text-xs mt-2 p-2 bg-red-100 rounded overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component wrapper for ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  componentName?: string
) {
  const displayName = componentName || Component.displayName || Component.name || 'Unknown';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} componentName={displayName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}
