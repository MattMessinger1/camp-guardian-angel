import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtractedTimeDisplayProps {
  sessionId: string;
  onTimeExtracted?: (time: string) => void;
}

export function ExtractedTimeDisplay({ sessionId, onTimeExtracted }: ExtractedTimeDisplayProps) {
  const [plan, setPlan] = useState<any>(null);
  const [detectionLogs, setDetectionLogs] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load existing plan and detection logs
  useEffect(() => {
    loadPlanData();
  }, [sessionId]);

  const loadPlanData = async () => {
    try {
      setLoading(true);
      
      // Find registration plan for this session
      const { data: planData, error: planError } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (planError && planError.code !== 'PGRST116') {
        throw planError;
      }

      setPlan(planData);

      // If we have a plan, get the detection logs
      if (planData) {
        const { data: logsData, error: logsError } = await supabase
          .from('open_detection_logs')
          .select('*')
          .eq('plan_id', planData.id)
          .order('seen_at', { ascending: false })
          .limit(5);

        if (logsError) {
          console.error('Error loading detection logs:', logsError);
        } else {
          setDetectionLogs(logsData || []);
        }
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeNow = async () => {
    try {
      setIsAnalyzing(true);
      
      // Call watch-signup-open function
      const { data, error } = await supabase.functions.invoke('watch-signup-open', {
        body: { 
          trigger: 'manual_analysis',
          session_id: sessionId 
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Analysis Started",
        description: "Analyzing the registration page for time information...",
      });

      // Reload data after a short delay to see if anything was found
      setTimeout(() => {
        loadPlanData();
      }, 2000);

    } catch (error) {
      console.error('Error analyzing page:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the registration page. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Checking for extracted times...</p>
      </div>
    );
  }

  const hasExtractedTime = plan?.manual_open_at;
  const confidence = plan?.rules?.confidence || 0;
  const extractedTime = hasExtractedTime ? new Date(plan.manual_open_at) : null;

  return (
    <div className="space-y-4">
      {hasExtractedTime ? (
        <Card className={`border-2 ${confidence > 0.8 ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              {confidence > 0.8 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700">✅ Registration opens: {extractedTime?.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-700">⚠️ Possible opening: {extractedTime?.toLocaleString()}</span>
                </>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground mb-3">
              <p>Confidence: {Math.round(confidence * 100)}%</p>
              <p>Detected from: {plan.detect_url}</p>
            </div>

            {detectionLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Supporting Evidence:</p>
                {detectionLogs.slice(0, 3).map((log, index) => (
                  <div key={log.id} className="text-xs p-2 bg-background/50 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-3 h-3" />
                      <span className="font-medium">{log.signal || 'Time pattern detected'}</span>
                      <span className="text-muted-foreground">{new Date(log.seen_at).toLocaleString()}</span>
                    </div>
                    {log.note && <p className="text-muted-foreground">{log.note}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyzeNow}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-2" />
                    Re-analyze
                  </>
                )}
              </Button>
              
              {onTimeExtracted && extractedTime && (
                <Button
                  size="sm"
                  onClick={() => onTimeExtracted(plan.manual_open_at)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Use This Time
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">No registration time detected yet</span>
              </div>
              
              <Button
                variant="outline"
                onClick={handleAnalyzeNow}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Analyze Now
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                We'll scan the registration page for time information
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}