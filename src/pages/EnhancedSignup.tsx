import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedWorkflowIntegration } from '@/hooks/useEnhancedWorkflowIntegration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WorkflowStatusCard } from '@/components/WorkflowStatusCard';
import { SessionInfo } from '@/components/SessionInfo';
import { AdaptiveRegistrationForm } from '@/components/registration/AdaptiveRegistrationForm';
import { Brain, Zap, Shield, Clock, Target } from 'lucide-react';

export default function EnhancedSignup() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [signupStarted, setSignupStarted] = useState(false);

  // Extract parameters from URL
  const sessionId = searchParams.get('sessionId') || '';
  const selectedDate = searchParams.get('selectedDate');
  const selectedTime = searchParams.get('selectedTime');
  const businessName = searchParams.get('businessName');
  const location = searchParams.get('location');
  const signupCost = searchParams.get('signupCost') ? parseFloat(searchParams.get('signupCost')!) : undefined;
  const totalCost = searchParams.get('totalCost') ? parseFloat(searchParams.get('totalCost')!) : undefined;
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
    userId: user?.id || 'guest-user', // Allow guest users to start signup
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
  };

  // Allow guest users to proceed with signup - they can authenticate during the process
  if (!user) {
    console.log('Guest user accessing signup flow');
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Intelligence Indicators */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <div className="font-medium">We'll Handle the Details</div>
                <div className="text-muted-foreground">Registration Made Simple</div>
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
          <SessionInfo
            businessName={businessName || undefined}
            location={location || undefined}
            selectedDate={selectedDate || undefined}
            selectedTime={selectedTime || undefined}
            signupCost={signupCost}
            totalCost={totalCost}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Helpful Guidance Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Here's How We Make Camp Registration Effortless
          </CardTitle>
          <CardDescription>
            We'll guide you through each step to secure your child's spot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Account Setup</span>
              <span className="text-xs text-muted-foreground ml-auto">We'll help you create your profile</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Payment Processing</span>
              <span className="text-xs text-muted-foreground ml-auto">Secure checkout with multiple options</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Schedule Confirmation</span>
              <span className="text-xs text-muted-foreground ml-auto">We'll sync with your calendar</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Documentation</span>
              <span className="text-xs text-muted-foreground ml-auto">We'll gather any required forms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Form or Workflow Status */}
      {signupStarted ? (
        <AdaptiveRegistrationForm
          sessionData={{
            businessName: businessName || 'Camp',
            selectedDate: selectedDate || '',
            selectedTime: selectedTime || '',
            signupCost: signupCost || 0,
            location: location || ''
          }}
          onComplete={(formData) => {
            console.log('✅ Registration form completed:', formData);
            // Here you would handle the completed registration
            enhancedWorkflow.startEnhancedAutomation();
          }}
        />
      ) : (
        /* Action Section */
        <Card>
          <CardHeader>
            <CardTitle>Ready to Begin?</CardTitle>
            <CardDescription>
              Start your personalized registration experience - we'll handle the details so you can focus on what matters most.
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
                    Your registration is personalized and ready to go - we've prepared everything you need for a smooth experience.
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
      )}
    </div>
  );
}