import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { EnvironmentError } from "@/config/environment";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Application Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error instanceof EnvironmentError ? (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="font-semibold text-destructive mb-2">Environment Configuration Error</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      The application cannot start because required environment variables are missing:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {this.state.error.missingVariables.map((variable) => (
                        <li key={variable} className="font-mono text-destructive">
                          {variable}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">How to fix this:</h4>
                    <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                      <li>Go to your Supabase project dashboard</li>
                      <li>Navigate to Settings → Edge Functions → Environment Variables</li>
                      <li>Add the missing environment variables listed above</li>
                      <li>Reload this page</li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={this.handleReload} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reload Application
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                      className="flex-1"
                    >
                      Open Supabase Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h3 className="font-semibold text-destructive mb-2">Unexpected Error</h3>
                    <p className="text-sm font-mono text-muted-foreground">
                      {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>

                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold mb-2">
                        Error Details (Development)
                      </summary>
                      <pre className="whitespace-pre-wrap bg-muted p-3 rounded text-xs overflow-auto">
                        {this.state.error?.stack}
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}

                  <Button onClick={this.handleReload} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Application
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;