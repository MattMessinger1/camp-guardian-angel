import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  User, 
  Eye, 
  FileText,
  CreditCard,
  Phone
} from 'lucide-react';

interface AutomationStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'requires_action';
  description?: string;
  timestamp?: string;
  requiresUserAction?: boolean;
}

interface AutomatedSignupStatusProps {
  steps: AutomationStep[];
  currentStep: string;
  overallProgress: number;
  sessionId?: string;
  accountSetupComplete?: boolean;
}

export function AutomatedSignupStatus({ 
  steps, 
  currentStep, 
  overallProgress, 
  sessionId,
  accountSetupComplete = false 
}: AutomatedSignupStatusProps) {
  const getStepIcon = (step: AutomationStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-success" />;
    }
    if (step.status === 'failed') {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    if (step.status === 'active') {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    if (step.status === 'requires_action') {
      return <Phone className="w-5 h-5 text-warning" />;
    }
    return <Clock className="w-5 h-5 text-muted-foreground" />;
  };

  const getStepStatusColor = (status: AutomationStep['status']) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'failed': return 'text-destructive';
      case 'active': return 'text-primary';
      case 'requires_action': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStepStatusBadge = (status: AutomationStep['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-success text-white">Complete</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'active': return <Badge variant="default" className="bg-primary">Active</Badge>;
      case 'requires_action': return <Badge variant="secondary" className="bg-warning">Action Needed</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Automated Signup Progress
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {Math.round(overallProgress)}% Complete
          </div>
        </CardTitle>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Setup Status */}
        {accountSetupComplete && (
          <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
            <CheckCircle className="w-5 h-5 text-success" />
            <div className="flex-1">
              <div className="font-medium text-success">Account Setup Complete</div>
              <div className="text-sm text-success/80">Credentials stored securely for automated login</div>
            </div>
          </div>
        )}

        {/* Automation Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                step.id === currentStep 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-card border-border'
              }`}
            >
              <div className="mt-0.5">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className={`font-medium ${getStepStatusColor(step.status)}`}>
                    {step.name}
                  </div>
                  {getStepStatusBadge(step.status)}
                </div>
                
                {step.description && (
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                )}
                
                {step.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </div>
                )}

                {step.requiresUserAction && step.status === 'requires_action' && (
                  <div className="text-sm text-warning font-medium">
                    ⚠️ Parent action required to continue
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Session Info */}
        {sessionId && (
          <div className="pt-3 border-t text-xs text-muted-foreground">
            Session: {sessionId}
          </div>
        )}
      </CardContent>
    </Card>
  );
}