import { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/lib/observability';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  reference: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, reference: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ reference: reportError(error, 'error-boundary', info.componentStack ?? undefined) });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-4 animate-fade-in">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This screen failed to load. Your data has not been changed.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          {this.state.reference && (
            <p className="text-xs text-muted-foreground">
              Reference{' '}
              <span className="font-mono text-foreground">{this.state.reference}</span> — quote this
              when reporting the problem.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null, reference: null })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Back to start
            </button>
          </div>
        </div>
      </div>
    );
  }
}
