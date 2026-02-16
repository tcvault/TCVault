import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center space-y-8">
          <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 shadow-2xl shadow-rose-500/10">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-4 max-w-sm">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Vault Breach Detected</h2>
            <p className="text-slate-500 text-sm font-semibold leading-relaxed">
              A critical runtime error has occurred. Your collection data is safe, but the active session must be restored.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary h-14 px-8 flex items-center gap-3 uppercase text-[10px] tracking-widest"
          >
            <RefreshCw size={16} />
            Re-establish Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
