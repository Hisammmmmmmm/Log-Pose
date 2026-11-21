import {Component, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<
  {children: ReactNode},
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erreur inattendue lors du chargement.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Atlas runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#050914] p-6 text-center text-slate-100">
          <div className="max-w-md rounded-2xl border border-amber-400/30 bg-[#0b1324] p-6 shadow-2xl">
            <h1 className="font-display text-lg font-semibold text-amber-200">
              Chargement interrompu
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#d4a24c] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-[#e5b863]"
            >
              Recharger l&apos;Atlas
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
