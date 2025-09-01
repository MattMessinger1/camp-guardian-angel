import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedWorkflowIntegration } from '@/hooks/useEnhancedWorkflowIntegration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WorkflowStatusCard } from '@/components/WorkflowStatusCard';
import { Brain, Zap, Shield, Clock, Target } from 'lucide-react';

export default function EnhancedSignup() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [signupStarted, setSignupStarted] = useState(false);

  // Extract parameters from URL
  const sessionId = searchParams.get('sessionId') || '';
  const selectedDate = searchParams.get('selectedDate');
  const selectedTime = searchParams.get('selectedTime');
  const predictedBarriers = searchParams.get('predictedBarriers') ? 
    JSON.parse(searchParams.get('predictedBarriers')!) : [];
  const credentialRequirements = searchParams.get('credentialRequirements') ? 
    JSON.parse(searchParams.get('credentialRequirements')!) : [];
  const complexityScore = searchParams.get('complexityScore') ? 
    parseFloat(searchParams.get('complexityScore')!) : undefined;
  const workflowEstimate = searchParams.get('workflowEstimate') ? 
    parseInt(searchParams.get('workflowEstimate')!) : undefined;
  const providerPlatform = searchParams.get('providerPlatform') || undefined;

  // Initialize enhanced workflow with search intelligence
  const enhancedWorkflow = useEnhancedWorkflowIntegration({
    sessionId,
    userId: user?.id || '',
    providerUrl: 'https://example.com/signup', // This would come from session data
    predictedBarriers,
    credentialRequirements,
    complexityScore,
    workflowEstimate,
    providerPlatform,
    onSignupSuccess: () => {
      console.log('✅ Enhanced signup completed successfully!');
    },
    onSignupFailed: (error) => {
      console.error('❌ Enhanced signup failed:', error);
    }
  });

  const handleStartSignup = async () => {
    setSignupStarted(true);
    await enhancedWorkflow.startEnhancedAutomation();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the enhanced signup experience.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Enhanced Intelligence Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>AI-Enhanced Registration Experience</CardTitle>
              <CardDescription>
                Powered by search intelligence and predictive barrier analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Intelligence Indicators */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium">Barriers Predicted</div>
                <div className="text-muted-foreground">{predictedBarriers.length} identified</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium">Est. Duration</div>
                <div className="text-muted-foreground">{workflowEstimate || 10} minutes</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium">Complexity Score</div>
                <div className="text-muted-foreground">
                  {complexityScore ? `${(complexityScore * 100).toFixed(0)}%` : 'Medium'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium">Provider Platform</div>
                <div className="text-muted-foreground capitalize">
                  {providerPlatform || 'Custom'}
                </div>
              </div>
            </div>
          </div>

          {/* Session Selection Display */}
          {(selectedDate || selectedTime) && (
            <div className="mt-4 p-3 bg-background/50 rounded-lg border">
              <h4 className="font-medium mb-2">Selected Session</h4>
              <div className="flex gap-4">
                {selectedDate && (
                  <Badge variant="secondary">
                    📅 {new Date(selectedDate).toLocaleDateString()}
                  </Badge>
                )}
                {selectedTime && (
                  <Badge variant="secondary">
                    ⏰ {selectedTime}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predicted Barriers Preview */}
      {predictedBarriers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Predicted Registration Steps
            </CardTitle>
            <CardDescription>
              AI analysis identified these likely barriers based on provider intelligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {predictedBarriers.map((barrier: string, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-sm capitalize">{barrier.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Status */}
      {signupStarted && (
        <WorkflowStatusCard
          sessionId={sessionId}
          userId={user?.id || ''}
          providerUrl="https://example.com/signup"
          overallProgress={enhancedWorkflow.overallProgress}
          assistanceQueue={enhancedWorkflow.workflow.state.assistanceQueue}
          currentRequestIndex={enhancedWorkflow.workflow.state.currentRequestIndex}
          isProcessing={enhancedWorkflow.isProcessing}
          canResume={enhancedWorkflow.canResume}
          onResumeWorkflow={enhancedWorkflow.workflow.actions.resumeWorkflow}
          onPauseWorkflow={enhancedWorkflow.workflow.actions.pauseWorkflow}
          onRetryFailedRequest={(requestId) => enhancedWorkflow.workflow.actions.retryFailedRequest(requestId)}
        />
      )}

      {/* Action Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to Begin?</CardTitle>
          <CardDescription>
            {enhancedWorkflow.hasSearchIntelligence 
              ? 'Start your AI-optimized registration experience with pre-populated barriers and intelligent assistance.'
              : 'Begin your registration with enhanced workflow management and barrier detection.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enhancedWorkflow.hasSearchIntelligence && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Brain className="h-4 w-4" />
                  <span className="font-medium">Enhanced Intelligence Active</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This registration has been pre-analyzed with {predictedBarriers.length} predicted barriers, 
                  {credentialRequirements.length} credential requirements, and platform-specific optimizations.
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleStartSignup}
              size="lg"
              disabled={signupStarted}
              className="w-full"
            >
              {signupStarted ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-pulse" />
                  Registration in Progress...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Start Enhanced Registration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}