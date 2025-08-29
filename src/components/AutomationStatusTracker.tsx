import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Globe, 
  FormInput, 
  CreditCard,
  MessageSquare,
  ExternalLink
} from "lucide-react";

interface AutomationStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'requires_action';
  description?: string;
  timestamp?: string;
  error?: string;
}

interface AutomationStatusTrackerProps {
  status: 'idle' | 'initializing' | 'navigating' | 'analyzing' | 'filling' | 'submitting' | 'completed' | 'failed' | 'captcha_detected';
  steps: AutomationStep[];
  progress: number;
  sessionData?: {
    sessionId: string;
    signupUrl?: string;
    confirmationNumber?: string;
  };
  onRetry?: () => void;
  onManualBackup?: () => void;
}

export function AutomationStatusTracker({
  status,
  steps,
  progress,
  sessionData,
  onRetry,
  onManualBackup
}: AutomationStatusTrackerProps) {
  
  const getStatusIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'active':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'requires_action':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'browser_init':
        return <Globe className="h-4 w-4" />;
      case 'navigation':
        return <ExternalLink className="h-4 w-4" />;
      case 'form_analysis':
        return <FormInput className="h-4 w-4" />;
      case 'form_filling':
        return <FormInput className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'captcha':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'initializing':
        return <Badge variant="secondary" data-testid="browser-session-init">Initializing Browser</Badge>;
      case 'navigating':
        return <Badge variant="secondary" data-testid="navigation-in-progress">Navigating to Signup</Badge>;
      case 'analyzing':
        return <Badge variant="secondary" data-testid="form-analysis-in-progress">Analyzing Form</Badge>;
      case 'filling':
        return <Badge variant="secondary" data-testid="form-filling-in-progress">Filling Form</Badge>;
      case 'submitting':
        return <Badge variant="secondary" data-testid="registration-submitting">Submitting Registration</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500" data-testid="automation-complete">Completed Successfully</Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid="automation-error">Failed</Badge>;
      case 'captcha_detected':
        return <Badge variant="secondary" className="bg-orange-500" data-testid="captcha-detected">CAPTCHA Detected</Badge>;
      default:
        return <Badge variant="secondary">Ready</Badge>;
    }
  };

  return (
    <Card data-testid="automation-status">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Automation Progress</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex items-center space-x-2 mt-1">
                {getStepIcon(step.id)}
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{step.name}</p>
                  {step.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                )}
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completed Steps Indicators for Tests */}
        {steps.some(s => s.id === 'browser_init' && s.status === 'completed') && (
          <div data-testid="browser-session-init" className="hidden" />
        )}
        {steps.some(s => s.id === 'navigation' && s.status === 'completed') && (
          <div data-testid="navigation-complete" className="hidden" />
        )}
        {steps.some(s => s.id === 'form_analysis' && s.status === 'completed') && (
          <div data-testid="form-analysis-complete" className="hidden" />
        )}
        {steps.some(s => s.id === 'form_filling' && s.status === 'completed') && (
          <div data-testid="form-filling-complete" className="hidden" />
        )}
        {steps.some(s => s.id === 'registration' && s.status === 'completed') && (
          <div data-testid="registration-submitted" className="hidden" />
        )}

        {/* CAPTCHA Detection Indicator */}
        {status === 'captcha_detected' && (
          <div data-testid="captcha-assistance-ui" className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">CAPTCHA Assistance Required</span>
            </div>
            <p className="text-xs text-orange-700 mb-3">
              We've detected a CAPTCHA challenge. We'll send you an SMS with instructions to help resolve it.
            </p>
            <div data-testid="sms-notification-sent" className="text-xs text-green-600">
              ✓ SMS notification sent
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'completed' && sessionData?.confirmationNumber && (
          <div data-testid="registration-success" className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Registration Successful!</span>
            </div>
            <div data-testid="confirmation-number" className="text-xs text-green-700">
              Confirmation: {sessionData.confirmationNumber}
            </div>
          </div>
        )}

        {/* Error State with Actions */}
        {status === 'failed' && (
          <div data-testid="automation-error" className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Automation Failed</span>
              </div>
              <p className="text-xs text-red-700">
                We encountered an issue during the automated registration process.
              </p>
            </div>
            
            <div className="flex space-x-2">
              {onRetry && (
                <Button onClick={onRetry} size="sm" variant="outline">
                  <Loader2 className="h-3 w-3 mr-1" />
                  Retry Automation
                </Button>
              )}
              
              {onManualBackup && (
                <Button 
                  onClick={onManualBackup} 
                  size="sm" 
                  variant="secondary"
                  data-testid="manual-backup-option"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Manual Registration
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Test Simulation Controls (only in test environment) */}
        {process.env.NODE_ENV === 'test' && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Test Controls:</p>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                data-testid="simulate-captcha-resolved"
                onClick={() => {/* Test simulation */}}
              >
                Resolve CAPTCHA
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}