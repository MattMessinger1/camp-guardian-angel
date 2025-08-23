import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignupProgressTracker } from '@/components/SignupProgressTracker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Phone,
  ExternalLink 
} from 'lucide-react';

interface SignupStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'blocked';
  description?: string;
  timestamp?: string;
  requiresAction?: boolean;
}

export function AutomatedSignupFlow() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const location = useLocation();
  const { toast } = useToast();
  
  const [steps, setSteps] = useState<SignupStep[]>([
    { id: 'initialize', name: 'Initialize Signup', status: 'pending', description: 'Preparing automated signup system' },
    { id: 'navigate', name: 'Navigate to Provider', status: 'pending', description: 'Opening provider signup page' },
    { id: 'analyze', name: 'Analyze Form', status: 'pending', description: 'Understanding signup requirements' },
    { id: 'fill_form', name: 'Fill Registration Form', status: 'pending', description: 'Completing form with your information', requiresAction: true },
    { id: 'verify_parent', name: 'Parent Verification', status: 'pending', description: 'Confirming details with parent', requiresAction: true },
    { id: 'submit', name: 'Submit Registration', status: 'pending', description: 'Final submission to provider' },
    { id: 'confirm', name: 'Confirm Success', status: 'pending', description: 'Verifying successful registration' }
  ]);
  
  const [currentStep, setCurrentStep] = useState('initialize');
  const [overallProgress, setOverallProgress] = useState(0);
  const [automationMode] = useState<'full' | 'assisted' | 'manual'>('assisted');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  
  const automationReady = location.state?.automationReady;

  useEffect(() => {
    if (automationReady) {
      startAutomatedSignup();
    }
  }, [automationReady]);

  const updateStepStatus = (stepId: string, status: SignupStep['status'], description?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, description: description || step.description, timestamp: new Date().toISOString() }
        : step
    ));
    
    if (stepId === currentStep && status === 'completed') {
      // Move to next step
      const nextStepIndex = steps.findIndex(s => s.id === stepId) + 1;
      if (nextStepIndex < steps.length) {
        setCurrentStep(steps[nextStepIndex].id);
      }
    }
    
    // Update overall progress
    const completed = steps.filter(s => s.status === 'completed').length;
    setOverallProgress((completed / steps.length) * 100);
  };

  const startAutomatedSignup = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Initialize
      setCurrentStep('initialize');
      updateStepStatus('initialize', 'active');
      
      // Create reservation first
      const { data: reservationData, error: reservationError } = await supabase.functions.invoke('reserve-init', {
        body: { 
          session_id: sessionId,
          parent: { name: 'Test Parent', email: 'parent@example.com', phone: '+1234567890' },
          child: { name: 'Test Child', dob: '2015-01-01' }
        }
      });
      
      if (reservationError) throw reservationError;
      
      setReservationId(reservationData.reservation_id);
      updateStepStatus('initialize', 'completed', 'Reservation created successfully');
      
      // Step 2: Execute automated signup
      setTimeout(() => {
        setCurrentStep('navigate');
        updateStepStatus('navigate', 'active');
        
        setTimeout(() => {
          updateStepStatus('navigate', 'completed', 'Successfully navigated to provider');
          executeAutomatedFlow(reservationData.reservation_id);
        }, 2000);
      }, 1000);
      
    } catch (error: any) {
      console.error('Automated signup failed:', error);
      updateStepStatus(currentStep, 'failed', error.message || 'Initialization failed');
      toast({
        title: "Signup Failed",
        description: "The automated signup process encountered an error. Please try manual signup.",
        variant: "destructive"
      });
    }
  };

  const executeAutomatedFlow = async (reservationId: string) => {
    try {
      setCurrentStep('analyze');
      updateStepStatus('analyze', 'active');
      
      // Simulate analysis phase
      setTimeout(() => {
        updateStepStatus('analyze', 'completed', 'Form analysis complete');
        
        // Move to form filling (requires parent action)
        setCurrentStep('fill_form');
        updateStepStatus('fill_form', 'active', 'Ready for parent to review and approve form completion');
      }, 1500);
      
    } catch (error) {
      console.error('Automation flow error:', error);
      updateStepStatus(currentStep, 'failed', 'Automation encountered an error');
    }
  };

  const handleParentApproval = async () => {
    if (!reservationId) return;
    
    try {
      setCurrentStep('verify_parent');
      updateStepStatus('fill_form', 'completed', 'Parent approved form completion');
      updateStepStatus('verify_parent', 'active');
      
      // Execute the actual reservation
      const { data, error } = await supabase.functions.invoke('reserve-execute', {
        body: { 
          reservation_id: reservationId,
          recaptcha_token: 'test-token'
        }
      });
      
      if (error) throw error;
      
      updateStepStatus('verify_parent', 'completed', 'Parent verification complete');
      
      if (data.status === 'confirmed') {
        setCurrentStep('confirm');
        updateStepStatus('submit', 'completed', 'Registration submitted successfully');
        updateStepStatus('confirm', 'completed', 'Registration confirmed by provider');
        
        toast({
          title: "🎉 Registration Successful!",
          description: "Your child has been successfully registered for the session.",
        });
      } else {
        updateStepStatus('submit', 'completed', 'Registration requires manual verification');
        toast({
          title: "Registration Pending",
          description: "Your registration is being processed and requires additional verification.",
        });
      }
    } catch (error: any) {
      updateStepStatus('verify_parent', 'failed', error.message || 'Verification failed');
      toast({
        title: "Registration Error",
        description: "There was an issue completing your registration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleManualFallback = () => {
    // Navigate to manual signup page
    window.open(`/sessions/${sessionId}/signup`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Automated Signup in Progress
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Your signup assistant is handling the registration process with your supervision.
          </div>
        </CardHeader>
      </Card>

      {/* Progress Tracker */}
      <SignupProgressTracker
        steps={steps}
        currentStep={currentStep}
        overallProgress={overallProgress}
        automationMode={automationMode}
        estimatedCompletion="2-3 minutes"
      />

      {/* Parent Action Required */}
      {currentStep === 'fill_form' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Phone className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <div>
                <strong>Parent Approval Required:</strong> We're ready to complete your registration form. 
                Please review the information and approve to proceed.
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>What we'll do:</strong>
                  <ul className="list-disc ml-4 mt-1">
                    <li>Fill out the registration form with your provided information</li>
                    <li>Handle any CAPTCHA challenges that appear</li>
                    <li>Submit the completed form to secure your spot</li>
                  </ul>
                </div>
                <Button onClick={handleParentApproval} className="mr-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Continue
                </Button>
                <Button variant="outline" onClick={handleManualFallback}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Switch to Manual
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Fallback */}
      {steps.some(step => step.status === 'failed') && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>
                The automated signup encountered an issue. You can try again or proceed with manual signup.
              </div>
              <div>
                <Button variant="outline" onClick={() => window.location.reload()} className="mr-2">
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleManualFallback}>
                  Manual Signup
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isProcessing && !automationReady && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500" />
              <h3 className="text-lg font-semibold">Signup Assistant Not Ready</h3>
              <p className="text-muted-foreground">
                Please return to the readiness page to initialize your signup assistant first.
              </p>
              <Button onClick={() => window.history.back()}>
                Return to Readiness Check
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}