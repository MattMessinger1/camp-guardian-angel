/**
 * Intelligent CAPTCHA Flow Component
 * 
 * Enhanced CAPTCHA handling with OpenAI vision analysis and 
 * seamless session state management during human assistance.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Clock, 
  Eye, 
  ExternalLink, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CaptchaAnalysis {
  success: boolean;
  captcha_type: string;
  challenge_description: string;
  solving_instructions: string[];
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert';
  estimated_time_seconds: number;
  confidence_score: number;
  visual_elements: {
    grid_size?: string;
    image_count?: number;
    text_visible?: boolean;
    audio_option?: boolean;
  };
}

interface CaptchaFlowProps {
  sessionId: string;
  captchaEventId?: string;
  onResolved?: () => void;
  onFailed?: () => void;
  onTimeout?: () => void;
}

export function CaptchaIntelligentFlow({ 
  sessionId, 
  captchaEventId, 
  onResolved, 
  onFailed, 
  onTimeout 
}: CaptchaFlowProps) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<CaptchaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionPreserved, setSessionPreserved] = useState(false);
  const [providerTabOpen, setProviderTabOpen] = useState(false);

  useEffect(() => {
    if (captchaEventId) {
      loadCaptchaAnalysis();
    }
  }, [captchaEventId]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            onTimeout?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeRemaining, onTimeout]);

  const loadCaptchaAnalysis = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('id', captchaEventId)
        .single();

      if (error) throw error;

      const analysisData = (data.meta as any)?.analysis as CaptchaAnalysis;
      setAnalysis(analysisData);
      setSessionPreserved((data.meta as any)?.session_state ? true : false);
      
      // Calculate remaining time
      const expiresAt = new Date(data.expires_at).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

      console.log('📊 CAPTCHA Analysis loaded:', {
        type: analysisData?.captcha_type,
        difficulty: analysisData?.difficulty_level,
        confidence: analysisData?.confidence_score,
        timeRemaining: remaining
      });

    } catch (error) {
      console.error('Failed to load CAPTCHA analysis:', error);
      toast({
        title: "Error",
        description: "Failed to load CAPTCHA analysis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProviderSite = () => {
    if (!analysis) return;
    
    // Get the challenge URL from CAPTCHA event
    supabase
      .from('captcha_events')
      .select('challenge_url')
      .eq('id', captchaEventId)
      .single()
      .then(({ data }) => {
        if (data?.challenge_url) {
          window.open(data.challenge_url, '_blank', 'noopener,noreferrer');
          setProviderTabOpen(true);
          
          toast({
            title: "Provider Site Opened",
            description: "Complete the CAPTCHA challenge and return here to continue",
          });
        }
      });
  };

  const handleContinueAfterSolving = async () => {
    setResolving(true);
    
    try {
      // Call resume-captcha function
      const { data, error } = await supabase.functions.invoke('resume-captcha', {
        body: { 
          captcha_event_id: captchaEventId,
          session_id: sessionId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "CAPTCHA resolved! Registration continuing...",
        });
        onResolved?.();
      } else {
        throw new Error(data?.error || 'Failed to resume session');
      }

    } catch (error) {
      console.error('Failed to resume after CAPTCHA:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume registration",
        variant: "destructive",
      });
      onFailed?.();
    } finally {
      setResolving(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-5 w-5 animate-pulse text-blue-600" />
            <span>Analyzing CAPTCHA challenge with AI...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to analyze CAPTCHA challenge</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* AI Analysis Results */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI CAPTCHA Analysis</span>
            <Badge className={getDifficultyColor(analysis.difficulty_level)}>
              {analysis.difficulty_level}
            </Badge>
          </CardTitle>
          <CardDescription>
            OpenAI Vision has analyzed this CAPTCHA challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Challenge Type</label>
              <p className="font-medium capitalize">{analysis.captcha_type.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Confidence Score</label>
              <div className="flex items-center space-x-2">
                <Progress value={analysis.confidence_score * 100} className="h-2 flex-1" />
                <span className="text-sm font-medium">{Math.round(analysis.confidence_score * 100)}%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Challenge Description</label>
            <p className="font-medium">{analysis.challenge_description}</p>
          </div>

          {analysis.visual_elements && Object.keys(analysis.visual_elements).length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Visual Elements</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {analysis.visual_elements.grid_size && (
                  <Badge variant="outline">Grid: {analysis.visual_elements.grid_size}</Badge>
                )}
                {analysis.visual_elements.image_count && (
                  <Badge variant="outline">{analysis.visual_elements.image_count} images</Badge>
                )}
                {analysis.visual_elements.text_visible && (
                  <Badge variant="outline">Text visible</Badge>
                )}
                {analysis.visual_elements.audio_option && (
                  <Badge variant="outline">Audio available</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Status */}
      {sessionPreserved && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Session Protected:</strong> Your queue position and form data are safely preserved 
            during CAPTCHA solving. No registration progress will be lost.
          </AlertDescription>
        </Alert>
      )}

      {/* Time Remaining */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="font-medium">Time Remaining</span>
            </div>
            <span className="text-lg font-bold text-amber-600">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <Progress 
            value={(timeRemaining / (15 * 60)) * 100} 
            className="h-2 mt-2" 
          />
        </CardContent>
      </Card>

      {/* Solving Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>AI-Generated Instructions</span>
          </CardTitle>
          <CardDescription>
            Estimated solving time: {Math.round(analysis.estimated_time_seconds / 60)} minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            {analysis.solving_instructions.map((instruction, index) => (
              <li key={index} className="text-sm">
                {instruction}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button
          onClick={handleOpenProviderSite}
          variant="outline"
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open CAPTCHA Challenge
        </Button>
        
        <Button
          onClick={handleContinueAfterSolving}
          disabled={!providerTabOpen || resolving}
          className="flex-1"
        >
          {resolving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Resuming...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Continue Registration
            </>
          )}
        </Button>
      </div>

      {!providerTabOpen && (
        <p className="text-xs text-muted-foreground text-center">
          Please open the CAPTCHA challenge first, then return to continue
        </p>
      )}
    </div>
  );
}