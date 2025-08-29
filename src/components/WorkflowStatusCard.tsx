import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  CreditCard,
  UserPlus,
  Zap
} from 'lucide-react';

interface WorkflowStatusCardProps {
  sessionId: string;
  userId: string;
  providerUrl: string;
  overallProgress: number;
  assistanceQueue: any[];
  currentRequestIndex: number;
  isProcessing: boolean;
  canResume: boolean;
  onResumeWorkflow?: () => void;
  onPauseWorkflow?: () => void;
  onRetryFailedRequest?: (requestId: string) => void;
  compact?: boolean;
}

const getBarrierIcon = (type: string) => {
  switch (type) {
    case 'account_creation': return <UserPlus className="w-4 h-4" />;
    case 'captcha': return <MessageSquare className="w-4 h-4" />;
    case 'payment': return <CreditCard className="w-4 h-4" />;
    default: return <Zap className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'active': return 'text-blue-600 bg-blue-100';
    case 'failed': return 'text-red-600 bg-red-100';
    case 'paused': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export function WorkflowStatusCard(props: WorkflowStatusCardProps) {
  const {
    sessionId,
    userId,
    providerUrl,
    overallProgress,
    assistanceQueue,
    currentRequestIndex,
    isProcessing,
    canResume,
    onResumeWorkflow,
    onPauseWorkflow,
    onRetryFailedRequest,
    compact = false
  } = props;

  const completedCount = assistanceQueue.filter(req => req.status === 'completed').length;
  const failedCount = assistanceQueue.filter(req => req.status === 'failed').length;
  const currentRequest = currentRequestIndex >= 0 ? assistanceQueue[currentRequestIndex] : null;

  if (compact) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-medium">Registration Progress</span>
                <Badge variant="outline">
                  {Math.round(overallProgress)}%
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {completedCount}/{assistanceQueue.length} barriers completed
                {failedCount > 0 && (
                  <span className="text-red-600 ml-2">({failedCount} failed)</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {canResume && (
                <Button size="sm" variant="outline" onClick={onResumeWorkflow}>
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}
              {isProcessing && currentRequest && (
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Clock className="w-3 h-3 animate-pulse" />
                  {currentRequest.type}...
                </div>
              )}
            </div>
          </div>
          
          <Progress value={overallProgress} className="h-2 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Registration Workflow
          </div>
          <Badge variant="outline" className="text-sm">
            {Math.round(overallProgress)}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{completedCount}/{assistanceQueue.length} barriers</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Current Status */}
        {currentRequest && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-3">
              {getBarrierIcon(currentRequest.type)}
              <div className="flex-1">
                <h4 className="font-medium">
                  Currently Processing: {currentRequest.type.replace('_', ' ')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Stage: {currentRequest.stage}
                </p>
              </div>
              {isProcessing && (
                <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Workflow Controls */}
        <div className="flex gap-2">
          {canResume && !isProcessing && (
            <Button size="sm" onClick={onResumeWorkflow}>
              <Play className="w-4 h-4 mr-2" />
              Resume Workflow
            </Button>
          )}
          
          {isProcessing && (
            <Button size="sm" variant="outline" onClick={onPauseWorkflow}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
        </div>

        {/* Barrier List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Barriers</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {assistanceQueue.map((request, index) => (
              <div 
                key={request.id} 
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  index === currentRequestIndex ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getBarrierIcon(request.type)}
                  <span className="capitalize">
                    {request.type.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getStatusColor(request.status)}`}
                  >
                    {request.status}
                  </Badge>
                  
                  {request.status === 'failed' && onRetryFailedRequest && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2"
                      onClick={() => onRetryFailedRequest(request.id)}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {completedCount}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {isProcessing ? 1 : 0}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {failedCount}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}