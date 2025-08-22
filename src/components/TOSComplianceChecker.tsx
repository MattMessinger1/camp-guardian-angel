import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TOSAnalysisResult {
  status: 'green' | 'yellow' | 'red';
  reason: string;
  confidence: number;
  details: {
    robotsTxtAllowed: boolean;
    tosAnalysis: any;
    campProviderType: string;
    automationPolicy: string;
    partnershipStatus: string;
  };
  recommendation: string;
  lastChecked: string;
}

export function TOSComplianceChecker() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TOSAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async (forceRefresh = false) => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a camp provider URL to analyze",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('tos-compliance-checker', {
        body: { 
          url: url.trim(),
          forceRefresh 
        }
      });

      if (functionError) {
        throw functionError;
      }

      setResult(data);
      
      toast({
        title: "Analysis Complete",
        description: `TOS compliance status: ${data.status.toUpperCase()}`,
        variant: data.status === 'red' ? 'destructive' : 'default'
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze TOS compliance';
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'yellow':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'red':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      green: 'default',
      yellow: 'secondary',
      red: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-6 w-6" />
          TOS Compliance Checker
        </CardTitle>
        <CardDescription>
          Analyze Terms of Service for camp provider websites to determine automation compliance policies
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter camp provider URL (e.g., https://active.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            disabled={loading}
          />
          <Button 
            onClick={() => handleAnalyze(false)} 
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Analyze'
            )}
          </Button>
          {result && (
            <Button 
              variant="outline" 
              onClick={() => handleAnalyze(true)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {/* Status Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    Compliance Status
                  </div>
                  {getStatusBadge(result.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Analysis Summary:</p>
                  <p className="text-sm">{result.reason}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence Score:</p>
                    <p className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                      {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Checked:</p>
                    <p className="text-sm">
                      {new Date(result.lastChecked).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recommendation:</p>
                  <p className="text-sm font-medium">{result.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Technical Details</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Robots.txt Status:</span>
                        <Badge variant={result.details.robotsTxtAllowed ? 'default' : 'destructive'}>
                          {result.details.robotsTxtAllowed ? 'Allowed' : 'Blocked'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Provider Type:</span>
                        <span className="font-medium">{result.details.campProviderType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Automation Policy:</span>
                        <Badge variant="outline">
                          {result.details.automationPolicy}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Partnership Status</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Current Status:</span>
                        <Badge variant="outline">
                          {result.details.partnershipStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Details */}
                {result.details.tosAnalysis?.aiAnalysis && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">AI Analysis</p>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <p className="text-sm">{result.details.tosAnalysis.aiAnalysis.summary}</p>
                      
                      {result.details.tosAnalysis.aiAnalysis.keyFindings?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Key Findings:</p>
                          <ul className="text-xs space-y-1">
                            {result.details.tosAnalysis.aiAnalysis.keyFindings.map((finding: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.details.tosAnalysis.aiAnalysis.positiveSignals?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">Positive Signals:</p>
                          <ul className="text-xs space-y-1">
                            {result.details.tosAnalysis.aiAnalysis.positiveSignals.map((signal: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{signal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.details.tosAnalysis.aiAnalysis.riskFactors?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">Risk Factors:</p>
                          <ul className="text-xs space-y-1">
                            {result.details.tosAnalysis.aiAnalysis.riskFactors.map((risk: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}