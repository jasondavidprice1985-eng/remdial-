import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app-fieldrem min-h-screen mesh-bg flex items-center justify-center p-4">
        <div className="card p-6 max-w-sm w-full space-y-3 text-center">
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="text-sm text-[var(--muted)]">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <p className="text-[11px] text-[var(--muted)] font-mono break-all">{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-accent w-full">
            Reload app
          </button>
          <button onClick={this.reset} className="btn-secondary w-full">
            Try again without reloading
          </button>
        </div>
      </div>
    );
  }
}
