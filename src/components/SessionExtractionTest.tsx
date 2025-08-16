import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSessionExtraction } from '@/hooks/useSessionExtraction';
import { AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

export function SessionExtractionTest() {
  const [htmlContent, setHtmlContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const { extractSession, loading } = useSessionExtraction();

  const handleExtract = async () => {
    if (!htmlContent.trim() || !sourceUrl.trim()) {
      return;
    }

    const extractionResult = await extractSession(htmlContent, sourceUrl);
    setResult(extractionResult);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Session Data Extraction Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Source URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/session-page"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">HTML Content</label>
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste HTML content containing session/camp information..."
              className="mt-1 h-32"
            />
          </div>

          <Button 
            onClick={handleExtract}
            disabled={loading || !htmlContent.trim() || !sourceUrl.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              'Extract Session Data'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              Extraction Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? 'Success' : 'Failed'}
              </Badge>
              
              {result.fallback_used && (
                <Badge variant="secondary">Fallback Used</Badge>
              )}
              
              {result.retry_count > 0 && (
                <Badge variant="outline">
                  {result.retry_count} Retry{result.retry_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {result.confidence && (
              <div className="space-y-2">
                <h4 className="font-medium">Confidence Scores</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Model Score:</span>
                    <Badge className={getConfidenceColor(result.confidence.model_score)}>
                      {(result.confidence.model_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Schema Valid:</span>
                    <Badge className={getConfidenceColor(result.confidence.schema_valid)}>
                      {(result.confidence.schema_valid * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Rules Used:</span>
                    <Badge className={getConfidenceColor(result.confidence.rules_used)}>
                      {(result.confidence.rules_used * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Overall:</span>
                    <Badge className={getConfidenceColor(result.confidence.overall)}>
                      {(result.confidence.overall * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {result.success && result.data && (
              <div>
                <h4 className="font-medium mb-2">Extracted Data</h4>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                <ul className="space-y-1 text-sm text-red-600">
                  {result.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.candidate_id && (
              <div className="text-sm text-muted-foreground">
                Stored as candidate: {result.candidate_id}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}