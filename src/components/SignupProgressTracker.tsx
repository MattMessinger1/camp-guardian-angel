import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  CreditCard, 
  Shield,
  Target
} from 'lucide-react';

interface SignupStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'blocked';
  description?: string;
  timestamp?: string;
  requiresAction?: boolean;
}

interface Props {
  steps: SignupStep[];
  currentStep: string;
  overallProgress: number;
  estimatedCompletion?: string;
  automationMode: 'full' | 'assisted' | 'manual';
}

export function SignupProgressTracker({ 
  steps, 
  currentStep, 
  overallProgress, 
  estimatedCompletion,
  automationMode 
}: Props) {
  const getStepIcon = (step: SignupStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'active':
        return <Target className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepBadge = (step: SignupStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">✓ Done</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 text-white">⚡ Active</Badge>;
      case 'failed':
        return <Badge variant="destructive">⚠ Failed</Badge>;
      case 'blocked':
        return <Badge variant="destructive">🚫 Blocked</Badge>;
      default:
        return <Badge variant="secondary">⏳ Pending</Badge>;
    }
  };

  const getModeIcon = () => {
    switch (automationMode) {
      case 'full':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'assisted':
        return <User className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getModeDescription = () => {
    switch (automationMode) {
      case 'full':
        return 'Fully automated signup with minimal parent intervention';
      case 'assisted':
        return 'Assisted signup with parent approval for key steps';
      default:
        return 'Manual signup process requiring parent completion';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Signup Progress
          <Badge variant="outline" className="flex items-center gap-1">
            {getModeIcon()}
            {automationMode.charAt(0).toUpperCase() + automationMode.slice(1)} Mode
          </Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {getModeDescription()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} />
          {estimatedCompletion && (
            <div className="text-xs text-muted-foreground">
              Estimated completion: {estimatedCompletion}
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                step.id === currentStep ? 'bg-primary/5 border-primary/20' : 'bg-muted/20'
              }`}
            >
              <div className="mt-1">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{step.name}</span>
                  {getStepBadge(step)}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                )}
                {step.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Required Alert */}
        {steps.some(step => step.requiresAction && step.status === 'active') && (
          <Alert className="border-orange-200 bg-orange-50">
            <User className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Parent Action Required:</strong> Please check your phone for verification or approval requests.
            </AlertDescription>
          </Alert>
        )}

        {/* Ethical Notice */}
        <div className="bg-muted/20 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>🛡️ <strong>Transparency:</strong> All automation actions are logged and available for review.</div>
            <div>📱 <strong>Control:</strong> You can stop or override automation at any time.</div>
            <div>🔒 <strong>Privacy:</strong> No personal data is stored permanently in automation systems.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}