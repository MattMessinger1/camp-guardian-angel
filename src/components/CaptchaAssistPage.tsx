/**
 * CAPTCHA Assistance Page
 * 
 * Page for parents to solve CAPTCHA challenges on behalf of automated registration
 * with secure token-based access and session restoration.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { captchaHandler } from '@/lib/captcha/CaptchaHandler';

interface CaptchaAssistData {
  captcha_id: string;
  session_id: string;
  provider: string;
  challenge_url: string;
  captcha_type: string;
  difficulty: string;
  queue_position?: number;
  expires_at: string;
  status: string;
}

export function CaptchaAssistPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [captchaData, setCaptchaData] = useState<CaptchaAssistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (token) {
      loadCaptchaData();
    }
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (captchaData && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [captchaData, timeRemaining]);

  const loadCaptchaData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Decode token
      const decodedToken = JSON.parse(atob(token));
      const { captcha_id, session_id, expires_at } = decodedToken;

      // Check if token is expired
      if (new Date(expires_at) < new Date()) {
        setError('This CAPTCHA assistance link has expired.');
        return;
      }

      // Load CAPTCHA data from database
      const { data, error: fetchError } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('id', captcha_id)
        .eq('session_id', session_id)
        .single();

      if (fetchError) {
        throw new Error('CAPTCHA session not found');
      }

      if (data.status === 'completed') {
        setError('This CAPTCHA has already been solved.');
        return;
      }

      if (data.status === 'expired') {
        setError('This CAPTCHA session has expired.');
        return;
      }

      setCaptchaData({
        captcha_id: data.id,
        session_id: data.session_id,
        provider: data.provider,
        challenge_url: data.challenge_url,
        captcha_type: data.meta?.captchaType || 'unknown',
        difficulty: data.meta?.difficulty || 'medium',
        queue_position: data.meta?.queuePosition,
        expires_at: data.expires_at,
        status: data.status
      });

      // Calculate time remaining
      const expiryTime = new Date(data.expires_at).getTime();
      const now = Date.now();
      setTimeRemaining(Math.max(0, Math.floor((expiryTime - now) / 1000)));

    } catch (err) {
      console.error('Failed to load CAPTCHA data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CAPTCHA information');
    } finally {
      setLoading(false);
    }
  };

  const handleSolveCaptcha = async () => {
    if (!captchaData) return;

    setSolving(true);
    setError(null);

    try {
      // Open CAPTCHA challenge in new window
      const captchaWindow = window.open(
        captchaData.challenge_url,
        'captcha_challenge',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!captchaWindow) {
        throw new Error('Please allow popups to solve the CAPTCHA challenge');
      }

      // Monitor for CAPTCHA completion
      const checkCompletion = setInterval(async () => {
        try {
          // Check if CAPTCHA was solved
          const { data, error } = await supabase
            .from('captcha_events')
            .select('status')
            .eq('id', captchaData.captcha_id)
            .single();

          if (error) throw error;

          if (data.status === 'completed') {
            clearInterval(checkCompletion);
            captchaWindow.close();
            
            // Process solution
            await processCaptchaSolution();
          } else if (data.status === 'failed' || data.status === 'expired') {
            clearInterval(checkCompletion);
            captchaWindow.close();
            setError('CAPTCHA solving failed or expired');
            setSolving(false);
          }
        } catch (err) {
          console.error('Error checking CAPTCHA status:', err);
        }
      }, 2000);

      // Clean up if window is closed manually
      const checkClosed = setInterval(() => {
        if (captchaWindow.closed) {
          clearInterval(checkCompletion);
          clearInterval(checkClosed);
          setSolving(false);
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to initiate CAPTCHA solving:', err);
      setError(err instanceof Error ? err.message : 'Failed to open CAPTCHA challenge');
      setSolving(false);
    }
  };

  const processCaptchaSolution = async () => {
    if (!captchaData) return;

    try {
      // Process the CAPTCHA solution
      const result = await captchaHandler.processCaptchaSolution(
        captchaData.captcha_id,
        {
          solvedBy: 'parent',
          userAgent: navigator.userAgent,
          ipAddress: 'client_ip' // Would be set by server
        }
      );

      if (result.success) {
        // Show success message
        setCaptchaData(prev => prev ? { ...prev, status: 'completed' } : null);
        setSolving(false);
        
        // Redirect to success page or close
        setTimeout(() => {
          navigate('/captcha-success');
        }, 2000);
      } else {
        throw new Error(result.errors?.join(', ') || 'CAPTCHA processing failed');
      }

    } catch (err) {
      console.error('Failed to process CAPTCHA solution:', err);
      setError(err instanceof Error ? err.message : 'Failed to process CAPTCHA solution');
      setSolving(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading CAPTCHA assistance...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Unable to Load CAPTCHA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/')}
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!captchaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p>No CAPTCHA data found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (captchaData.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              CAPTCHA Solved Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                The CAPTCHA challenge has been solved successfully.
                Registration will continue automatically.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/')}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            CAPTCHA Assistance Required
          </CardTitle>
          <CardDescription>
            A CAPTCHA challenge was detected during camp registration. 
            Your assistance is needed to continue.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Time remaining */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-800">Time Remaining</span>
              <span className="text-lg font-bold text-amber-800">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            <Progress 
              value={(timeRemaining / (15 * 60)) * 100} 
              className="h-2"
            />
          </div>

          {/* CAPTCHA details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Provider</label>
                <p className="font-medium">{captchaData.provider}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="font-medium capitalize">{captchaData.captcha_type}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Difficulty</label>
                <Badge className={getDifficultyColor(captchaData.difficulty)}>
                  {captchaData.difficulty}
                </Badge>
              </div>
              {captchaData.queue_position && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Queue Position</label>
                  <p className="font-medium">#{captchaData.queue_position}</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click "Solve CAPTCHA" to open the challenge</li>
                <li>Complete the CAPTCHA in the popup window</li>
                <li>Return here to confirm completion</li>
                <li>Registration will continue automatically</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSolveCaptcha}
              disabled={solving || timeRemaining === 0}
              className="w-full"
              size="lg"
            >
              {solving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Waiting for CAPTCHA...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Solve CAPTCHA
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
          </div>

          {/* Status indicator */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Status: <span className="font-medium capitalize">{captchaData.status}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}