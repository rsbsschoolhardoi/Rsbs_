import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunkError = this.state.error?.message?.includes('dynamically imported module');
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isChunkError
              ? 'The page could not be loaded, likely due to a network interruption. Please try again.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <Button onClick={this.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
