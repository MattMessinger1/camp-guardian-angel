import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Shield
} from 'lucide-react';
import { BrowserAutomationState } from '@/hooks/useBrowserAutomation';

interface Props {
  automationState: BrowserAutomationState;
  signupUrl?: string;
  onInitialize: () => void;
  onReset: () => void;
  canProceedToSignup: boolean;
}

export function BrowserAutomationStatus({ 
  automationState, 
  signupUrl, 
  onInitialize, 
  onReset,
  canProceedToSignup 
}: Props) {
  const getStatusBadge = () => {
    switch (automationState.status) {
      case 'ready':
        return <Badge className="bg-green-500">✓ Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">⚠ Error</Badge>;
      case 'idle':
        return <Badge variant="secondary">⏸ Not Started</Badge>;
      default:
        return <Badge variant="default">⏳ Preparing</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (automationState.status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'idle':
        return <Globe className="w-5 h-5 text-muted-foreground" />;
      default:
        return <RefreshCw className="w-5 h-5 animate-spin text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Automated Signup Assistant
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="text-sm font-medium">{automationState.message || 'Ready to assist'}</div>
            {automationState.status !== 'idle' && automationState.status !== 'ready' && (
              <Progress value={automationState.progress} className="mt-2" />
            )}
          </div>
        </div>

        {/* Error Display */}
        {automationState.error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{automationState.error}</AlertDescription>
          </Alert>
        )}

        {/* Page Analysis Results */}
        {automationState.pageData && (
          <div className="bg-muted/30 p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Signup Page Analysis:</div>
            <div className="text-xs space-y-1">
              {automationState.pageData.availability && (
                <div>• Availability: {automationState.pageData.availability}</div>
              )}
              {automationState.pageData.pricing && (
                <div>• Pricing: {automationState.pageData.pricing}</div>
              )}
              {automationState.pageData.forms?.length > 0 && (
                <div>• Found {automationState.pageData.forms.length} registration form(s)</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {automationState.status === 'idle' && (
            <Button onClick={onInitialize} disabled={!signupUrl}>
              <Globe className="w-4 h-4 mr-2" />
              Prepare Signup Assistant
            </Button>
          )}
          
          {automationState.status === 'error' && (
            <Button onClick={onReset} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {signupUrl && (
            <Button 
              variant="outline" 
              onClick={() => window.open(signupUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Signup Page
            </Button>
          )}
        </div>

        {/* Success Message */}
        {automationState.status === 'ready' && canProceedToSignup && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🚀 Your signup assistant is ready! We can help guide you through the registration process 
              and handle CAPTCHA challenges when they appear.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}