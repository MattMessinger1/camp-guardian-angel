import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Clock, CheckCircle } from 'lucide-react';

export default function Readiness() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Ready for Signup System</h1>
          <p className="text-muted-foreground text-lg">
            Get prepared for camp and activity signups with our readiness assessment tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Browse available sessions and camps</li>
                <li>Select a session you're interested in</li>
                <li>Get a personalized readiness assessment</li>
                <li>Complete preparation steps</li>
                <li>Be ready when signup opens!</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>AI-powered readiness assessment</li>
                <li>Personalized preparation checklists</li>
                <li>Payment pre-authorization</li>
                <li>Signup time notifications</li>
                <li>Requirement research assistance</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <Button 
            onClick={() => navigate('/sessions')}
            size="lg"
            className="px-8"
          >
            Browse Sessions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>Or jump directly to test a specific session's readiness assessment</p>
          </div>
        </div>
      </div>
    </div>
  );
}