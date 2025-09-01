import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ParentContactSection } from './ParentContactSection';
import { ChildInfoSection } from './ChildInfoSection';
import { PaymentSection } from './PaymentSection';
import { LegalSection } from './LegalSection';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface SessionData {
  businessName: string;
  selectedDate: string;
  selectedTime: string;
  signupCost: number;
  location: string;
}

interface AdaptiveRegistrationFormProps {
  sessionData: SessionData;
  onComplete: (formData: any) => void;
}

export function AdaptiveRegistrationForm({ sessionData, onComplete }: AdaptiveRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    parent: {},
    child: {},
    payment: {},
    legal: {}
  });

  const steps = [
    { id: 'parent', title: 'Parent Contact', component: ParentContactSection },
    { id: 'child', title: 'Child Information', component: ChildInfoSection },
    { id: 'payment', title: 'Payment', component: PaymentSection },
    { id: 'legal', title: 'Legal', component: LegalSection }
  ];

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete({
      ...formData,
      sessionData
    });
  };

  const CurrentComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Session Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registration Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Camp</div>
              <div>{sessionData.businessName}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Session</div>
              <div>{sessionData.selectedTime}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Date</div>
              <div>{sessionData.selectedDate}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Cost</div>
              <div className="font-semibold">${sessionData.signupCost}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Essential contact information for confirmation and emergency contact"}
            {currentStep === 1 && "Child-specific details needed for this camp experience"}
            {currentStep === 2 && "Secure payment for your confirmed session"}
            {currentStep === 3 && "Required waivers and agreements"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CurrentComponent
            sessionData={sessionData}
            data={formData[steps[currentStep].id as keyof typeof formData]}
            onChange={(data: any) => updateFormData(steps[currentStep].id, data)}
          />

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button onClick={handleComplete} size="lg">
                Complete Registration
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}