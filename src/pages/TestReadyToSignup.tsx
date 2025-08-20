import React from 'react';
import { ReadyToSignupTestRunner } from '@/components/ReadyToSignupTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TestTube } from 'lucide-react';

export default function TestReadyToSignup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TestTube className="w-8 h-8" />
              Ready to Signup Testing
            </h1>
            <p className="text-muted-foreground">
              Test the complete Ready for Signup workflow manually
            </p>
          </div>
        </div>

        {/* Quick Navigation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Test Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/sessions')}
                className="h-auto p-4 flex flex-col items-start"
              >
                <strong>1. Sessions Page</strong>
                <span className="text-sm text-muted-foreground">
                  View available sessions and test basic navigation
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/readiness')}
                className="h-auto p-4 flex flex-col items-start"
              >
                <strong>2. Readiness Config</strong>
                <span className="text-sm text-muted-foreground">
                  Configure autopilot vs assist mode
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  // For demo, navigate to a sample session ID
                  navigate('/ready-to-signup/sample-session-id');
                }}
                className="h-auto p-4 flex flex-col items-start"
              >
                <strong>3. Readiness Assessment</strong>
                <span className="text-sm text-muted-foreground">
                  Test readiness scoring and checklist
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Runner Component */}
        <ReadyToSignupTestRunner />
      </div>
    </div>
  );
}