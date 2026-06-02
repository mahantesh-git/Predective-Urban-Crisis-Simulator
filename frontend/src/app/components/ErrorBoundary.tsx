import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <Card className="bg-slate-900 border-red-500/50 p-8 max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Application Error</h2>
                <p className="text-slate-400 mb-4">
                  CitySentinel AI has encountered an unexpected error.
                </p>
                {this.state.error && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-4">
                    <p className="text-xs font-mono text-red-400">{this.state.error.message}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                      window.location.href = '/';
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Return to Dashboard
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    Reload Application
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
