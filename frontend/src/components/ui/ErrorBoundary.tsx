import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch React rendering errors.
 * Displays a user-friendly error message when a component crashes.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="a-section">
          <div className="a-section-header">
            <div className="a-section-title">서비스 로그</div>
            <div className="a-section-subtitle">HTTP 요청 로그 · 실시간 업데이트</div>
          </div>
          <div className="a-card" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ color: 'var(--a-ink-error)', fontFamily: 'var(--a-font-ui)', fontSize: '13px', marginBottom: '12px' }}>
              ❌ 페이지 렌더링 오류
            </div>
            <div style={{ color: 'var(--a-ink-muted)', fontFamily: 'var(--a-font-ui)', fontSize: '11px', marginBottom: '16px' }}>
              컴포넌트 로드 중 문제가 발생했습니다
            </div>
            {this.state.error && (
              <div style={{ color: 'var(--a-ink-muted)', fontFamily: 'var(--a-font-mono)', fontSize: '10px', marginBottom: '16px', maxWidth: '600px', margin: '0 auto 16px', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </div>
            )}
            <button
              className="a-btn"
              onClick={() => window.location.reload()}
              type="button"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
