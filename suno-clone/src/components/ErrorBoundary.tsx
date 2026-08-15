import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  /** Kept for the development-only details block; never rendered in a build. */
  stack: string;
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, message: '', stack: '' };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? '') : '',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReload = () => {
    // A render crash usually leaves the tree in an unusable state; a reload is
    // the only reliable recovery without a router-aware reset.
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-neutral-700/50 border border-white/10 rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-neutral-50 mb-2">Щось пішло не так</h1>
          <p className="text-neutral-100 mb-6">
            Сторінка несподівано завершила роботу. Спробуйте перезавантажити — якщо помилка
            повторюється, повідомте нас.
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 transition-all"
          >
            Перезавантажити
          </button>

          {/* Stack traces are developer material: dumping them to end users
              leaks internals and tells them nothing actionable. */}
          {import.meta.env.DEV && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-neutral-300">
                Технічні деталі (лише в dev)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-900 p-3 text-xs text-error">
                {this.state.message}
                {this.state.stack ? `\n\n${this.state.stack}` : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
