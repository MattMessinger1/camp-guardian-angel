import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  CreditCard, 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AccountCreationWizard } from './AccountCreationWizard';
import { CaptchaIntelligentFlow } from './CaptchaIntelligentFlow';
import { PaymentAssistanceCollector } from './PaymentAssistanceCollector';

interface AssistanceRequest {
  id: string;
  type: 'account_creation' | 'captcha' | 'payment' | 'form_completion';
  stage: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  context: Record<string, any>;
  estimatedDuration: number;
  actualDuration?: number;
  parentResponse?: any;
  createdAt: string;
  completedAt?: string;
}

interface WorkflowProgress {
  currentRequestIndex: number;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  overallProgress: number;
  estimatedTimeRemaining: number;
  canAutoResume: boolean;
}

interface MultiStageAssistanceInterfaceProps {
  sessionId: string;
  userId: string;
  providerUrl: string;
  assistanceRequests: AssistanceRequest[];
  onRequestComplete?: (request: AssistanceRequest, response: any) => void;
  onWorkflowComplete?: () => void;
  onWorkflowPause?: () => void;
  onWorkflowResume?: () => void;
}

export function MultiStageAssistanceInterface({
  sessionId,
  userId,
  providerUrl,
  assistanceRequests: initialRequests,
  onRequestComplete,
  onWorkflowComplete,
  onWorkflowPause,
  onWorkflowResume
}: MultiStageAssistanceInterfaceProps) {
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>(initialRequests);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress>({
    currentRequestIndex: 0,
    totalRequests: initialRequests.length,
    completedRequests: 0,
    failedRequests: 0,
    overallProgress: 0,
    estimatedTimeRemaining: initialRequests.reduce((sum, req) => sum + req.estimatedDuration, 0),
    canAutoResume: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTabValue, setActiveTabValue] = useState<string>('overview');

  // Update progress when requests change
  useEffect(() => {
    updateWorkflowProgress();
  }, [assistanceRequests]);

  // Auto-start first request
  useEffect(() => {
    if (assistanceRequests.length > 0 && workflowProgress.currentRequestIndex === 0) {
      const firstRequest = assistanceRequests[0];
      if (firstRequest.status === 'queued') {
        startRequest(0);
      }
    }
  }, [assistanceRequests]);

  const updateWorkflowProgress = useCallback(() => {
    const completed = assistanceRequests.filter(req => req.status === 'completed').length;
    const failed = assistanceRequests.filter(req => req.status === 'failed').length;
    const currentIndex = assistanceRequests.findIndex(req => req.status === 'active');
    const remaining = assistanceRequests.slice(currentIndex + 1);
    const estimatedRemaining = remaining.reduce((sum, req) => sum + req.estimatedDuration, 0);

    setWorkflowProgress({
      currentRequestIndex: Math.max(0, currentIndex),
      totalRequests: assistanceRequests.length,
      completedRequests: completed,
      failedRequests: failed,
      overallProgress: (completed / assistanceRequests.length) * 100,
      estimatedTimeRemaining: estimatedRemaining,
      canAutoResume: failed === 0 && completed > 0
    });
  }, [assistanceRequests]);

  const startRequest = async (requestIndex: number) => {
    const request = assistanceRequests[requestIndex];
    if (!request || request.status !== 'queued') return;

    setIsProcessing(true);
    setError(null);

    // Update request status to active
    setAssistanceRequests(prev => prev.map((req, index) => 
      index === requestIndex 
        ? { ...req, status: 'active' as const }
        : req
    ));

    // Set active tab based on request type
    setActiveTabValue(request.type);

    console.log(`Starting assistance request: ${request.type} (${request.stage})`);
  };

  const completeRequest = async (requestIndex: number, response: any) => {
    const request = assistanceRequests[requestIndex];
    if (!request) return;

    const completedRequest = {
      ...request,
      status: 'completed' as const,
      parentResponse: response,
      completedAt: new Date().toISOString(),
      actualDuration: calculateDuration(request.createdAt)
    };

    // Update request in state
    setAssistanceRequests(prev => prev.map((req, index) => 
      index === requestIndex ? completedRequest : req
    ));

    // Notify parent component
    onRequestComplete?.(completedRequest, response);

    // Check if workflow is complete
    const allCompleted = assistanceRequests.every((req, index) => 
      index === requestIndex || req.status === 'completed'
    );

    if (allCompleted) {
      setIsProcessing(false);
      onWorkflowComplete?.();
      return;
    }

    // Auto-start next request after brief delay
    const nextRequestIndex = requestIndex + 1;
    if (nextRequestIndex < assistanceRequests.length) {
      setTimeout(() => {
        startRequest(nextRequestIndex);
      }, 2000);
    }
  };

  const failRequest = async (requestIndex: number, error: string) => {
    setAssistanceRequests(prev => prev.map((req, index) => 
      index === requestIndex 
        ? { 
            ...req, 
            status: 'failed' as const,
            completedAt: new Date().toISOString(),
            parentResponse: { error }
          }
        : req
    ));

    setIsProcessing(false);
    setError(error);
  };

  const pauseWorkflow = () => {
    setIsProcessing(false);
    onWorkflowPause?.();

    // Pause current active request
    setAssistanceRequests(prev => prev.map(req => 
      req.status === 'active' 
        ? { ...req, status: 'paused' as const }
        : req
    ));
  };

  const resumeWorkflow = () => {
    setIsProcessing(true);
    setError(null);
    onWorkflowResume?.();

    // Resume paused request
    const pausedIndex = assistanceRequests.findIndex(req => req.status === 'paused');
    if (pausedIndex !== -1) {
      setAssistanceRequests(prev => prev.map((req, index) => 
        index === pausedIndex 
          ? { ...req, status: 'active' as const }
          : req
      ));
    }
  };

  const retryFailedRequest = (requestIndex: number) => {
    setAssistanceRequests(prev => prev.map((req, index) => 
      index === requestIndex 
        ? { ...req, status: 'queued' as const, parentResponse: undefined }
        : req
    ));

    setTimeout(() => startRequest(requestIndex), 1000);
  };

  const calculateDuration = (startTime: string): number => {
    return Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000); // minutes
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'account_creation': return <User className="h-4 w-4" />;
      case 'captcha': return <Shield className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'active': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const currentRequest = assistanceRequests[workflowProgress.currentRequestIndex];

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Stage Registration Assistance</CardTitle>
              <CardDescription>
                Guiding you through {workflowProgress.totalRequests} registration barriers
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {workflowProgress.completedRequests}/{workflowProgress.totalRequests} Complete
              </Badge>
              {workflowProgress.estimatedTimeRemaining > 0 && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  ~{workflowProgress.estimatedTimeRemaining}min
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={workflowProgress.overallProgress} className="w-full" />
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Progress: {Math.round(workflowProgress.overallProgress)}% complete
              </div>
              <div className="flex items-center space-x-2">
                {isProcessing ? (
                  <Button variant="outline" size="sm" onClick={pauseWorkflow}>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={resumeWorkflow}>
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </Button>
                )}
                <Badge variant={isProcessing ? "default" : "secondary"}>
                  {isProcessing ? "Active" : "Paused"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Assistance Queue</CardTitle>
          <CardDescription>Current and upcoming assistance requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assistanceRequests.map((request, index) => (
              <div 
                key={request.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === workflowProgress.currentRequestIndex ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(request.status)}
                  {getRequestIcon(request.type)}
                  <div>
                    <div className="font-medium capitalize">
                      {request.type.replace('_', ' ')} - {request.stage}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ~{request.estimatedDuration}min
                      {request.actualDuration && (
                        <span className="ml-2">
                          (took {request.actualDuration}min)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      request.priority === 'high' ? 'destructive' : 
                      request.priority === 'medium' ? 'default' : 'secondary'
                    }
                  >
                    {request.priority}
                  </Badge>
                  
                  {request.status === 'failed' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => retryFailedRequest(index)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {request.status === 'active' && (
                    <ArrowRight className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assistance Interface */}
      <Tabs value={activeTabValue} onValueChange={setActiveTabValue}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="account_creation">Account</TabsTrigger>
          <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              {currentRequest ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {getRequestIcon(currentRequest.type)}
                    <span className="font-medium capitalize">
                      {currentRequest.type.replace('_', ' ')} - {currentRequest.stage}
                    </span>
                    <Badge>{currentRequest.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentRequest.status === 'active' && 
                      "Please complete the current assistance request to continue."
                    }
                    {currentRequest.status === 'completed' && 
                      "This request has been completed successfully."
                    }
                    {currentRequest.status === 'queued' && 
                      "This request is waiting to be processed."
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <h3 className="font-medium">All Assistance Requests Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your registration workflow has been completed successfully.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account_creation">
          <AccountCreationWizard
            sessionId={sessionId}
            userId={userId}
            providerUrl={providerUrl}
            context={currentRequest?.context}
            onComplete={(response) => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'account_creation' && req.status === 'active');
              if (requestIndex !== -1) {
                completeRequest(requestIndex, response);
              }
            }}
            onError={(error) => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'account_creation' && req.status === 'active');
              if (requestIndex !== -1) {
                failRequest(requestIndex, error);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="captcha">
          <CaptchaIntelligentFlow
            sessionId={sessionId}
            onResolved={() => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'captcha' && req.status === 'active');
              if (requestIndex !== -1) {
                completeRequest(requestIndex, { resolved: true });
              }
            }}
            onFailed={() => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'captcha' && req.status === 'active');
              if (requestIndex !== -1) {
                failRequest(requestIndex, "CAPTCHA solving failed");
              }
            }}
          />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentAssistanceCollector
            sessionId={sessionId}
            userId={userId}
            providerUrl={providerUrl}
            context={currentRequest?.context}
            onComplete={(response) => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'payment' && req.status === 'active');
              if (requestIndex !== -1) {
                completeRequest(requestIndex, response);
              }
            }}
            onError={(error) => {
              const requestIndex = assistanceRequests.findIndex(req => req.type === 'payment' && req.status === 'active');
              if (requestIndex !== -1) {
                failRequest(requestIndex, error);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}