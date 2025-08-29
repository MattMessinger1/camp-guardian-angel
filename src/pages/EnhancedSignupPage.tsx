import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedCompleteSignupForm } from '@/components/EnhancedCompleteSignupForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function EnhancedSignupPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sessionId = searchParams.get('sessionId');
  
  // Default provider URL for testing
  const providerUrl = 'https://seattle.gov/parks-recreation/registration';

  const handleSignupComplete = (userData: any) => {
    console.log('Signup process completed:', userData);
    // Navigate to confirmation page
    if (sessionId) {
      window.location.href = `/sessions/${sessionId}/signup-submitted`;
    }
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Zap className="w-5 h-5" />
              Missing Session Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No session ID provided. Please start from the camp search or use a valid signup link.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Get Ready for Signup</h1>
            <p className="text-muted-foreground">
              Complete your information and let us handle the registration barriers
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Signup Form with Workflow Integration */}
      <EnhancedCompleteSignupForm
        sessionId={sessionId}
        providerUrl={providerUrl}
        onComplete={handleSignupComplete}
      />
    </div>
  );
}