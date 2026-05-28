import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  locationKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.locationKey !== prevProps.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-slate-900/50 border border-white/5 rounded-3xl m-4">
          <h2 className="text-2xl font-black text-rose-500 mb-2">Something went wrong</h2>
          <p className="text-slate-400 max-w-md mb-4">We encountered an unexpected error while loading this component.</p>
          {this.state.error && (
            <pre className="bg-[#020617] border border-white/10 rounded-xl p-4 text-xs font-mono text-rose-300 max-w-full overflow-x-auto text-left mb-6 max-h-[150px] custom-scrollbar">
              {this.state.error.name}: {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors font-bold text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-sm shadow-lg shadow-blue-500/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
