import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TestTube, CheckCircle } from 'lucide-react';

interface JackrabbitTestHelperProps {
  testUrl?: string;
}

export function JackrabbitTestHelper({ 
  testUrl = "https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsDirect?OrgID=533646&utm_source=chatgpt.com" 
}: JackrabbitTestHelperProps) {
  
  const urlParts = new URL(testUrl);
  const orgId = urlParts.searchParams.get('OrgID') || urlParts.searchParams.get('id');
  const isOpeningsDirect = testUrl.includes('/Openings/OpeningsDirect');
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Jackrabbit Integration Test Helper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Test URL Analysis</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Organization ID:</span>
                <Badge variant="secondary">{orgId || 'Not found'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Auth Required:</span>
                <Badge variant={isOpeningsDirect ? 'default' : 'destructive'}>
                  {isOpeningsDirect ? 'No Login' : 'Login Required'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>URL Type:</span>
                <Badge variant="outline">
                  {isOpeningsDirect ? 'OpeningsDirect' : 'Parent Portal'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Testing Steps</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>URL parsing & org ID extraction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Auth requirement detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Browser automation analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Session candidate discovery</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button asChild>
            <a href="/jackrabbit-test">
              <TestTube className="h-4 w-4 mr-2" />
              Open Test Interface
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={testUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Original Page
            </a>
          </Button>
        </div>
        
        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">How to Test:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Click "Open Test Interface" to access the testing page</li>
            <li>The test URL is pre-filled with the Jackrabbit demo organization</li>
            <li>Run "Analysis Test" to check our adapter's precheck functionality</li>
            <li>Test navigation to verify browser automation connectivity</li>
            <li>Check console logs for detailed debugging information</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}