import React, { useState } from 'react';
import { StandardPage } from '@/components/StandardPage';
import { SimpleTOSStatus } from '@/components/SimpleTOSStatus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimpleTOSChecker, type SimpleTOSResult } from '@/lib/providers/SimpleTOSChecker';
import { Shield, CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react';

export default function TOSCompliancePage() {
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<SimpleTOSResult | null>(null);

  const handleTestCheck = () => {
    if (!testUrl.trim()) return;
    
    const result = SimpleTOSChecker.checkProvider(testUrl);
    setTestResult(result);
    SimpleTOSChecker.logComplianceCheck(testUrl, result);
  };

  return (
    <StandardPage 
      title="Simplified TOS Compliance" 
      description="Fast compliance checking optimized for successful camp registrations"
      pageName="TOS Compliance"
      currentRoute="/tos-compliance"
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Speed-First Approach
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">&lt;10ms</div>
              <p className="text-xs text-muted-foreground">
                Average check time for trusted providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Three-Tier System
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Green: Trusted providers</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span>Yellow: Proceed with consent</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>Red: Manual only</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Trusted Providers
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25+</div>
              <p className="text-xs text-muted-foreground">
                Pre-classified camp platforms and organizations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Simplified Philosophy */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Registration-First Philosophy:</strong> Camp providers want successful registrations. Our simplified system prioritizes speed and parent consent over complex compliance analysis, ensuring parents can secure spots when camps fill up quickly.
          </AlertDescription>
        </Alert>

        {/* Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Provider Compliance</CardTitle>
            <CardDescription>
              Test the simplified compliance checker with any camp provider URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter camp provider URL (e.g., https://register.active.com)"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTestCheck()}
              />
              <Button onClick={handleTestCheck} disabled={!testUrl.trim()}>
                Check
              </Button>
            </div>
            
            {testResult && (
              <SimpleTOSStatus 
                result={testResult} 
                providerName={new URL(testUrl).hostname}
              />
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>Simplified Approach</CardTitle>
            <CardDescription>
              Fast, practical compliance checking focused on successful registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Speed Optimizations</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Pre-classified Providers:</strong> Instant decisions for 25+ trusted camp platforms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span><strong>No HTTP Requests:</strong> Local lookup eliminates network delays</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Background Logging:</strong> Compliance tracking doesn't block signup</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Registration-First Philosophy</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Camp-Friendly:</strong> Assumes providers want successful registrations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Parent Consent:</strong> Always requires explicit parent permission</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Fail Forward:</strong> When in doubt, proceed with consent rather than block</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trusted Providers List */}
        <Card>
          <CardHeader>
            <CardTitle>Pre-Classified Trusted Providers</CardTitle>
            <CardDescription>
              These camp platforms are automatically approved for registration assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-green-50 rounded text-green-700">Active.com</div>
              <div className="p-2 bg-green-50 rounded text-green-700">CampWise</div>
              <div className="p-2 bg-green-50 rounded text-green-700">CampMinder</div>
              <div className="p-2 bg-green-50 rounded text-green-700">DaySmart</div>
              <div className="p-2 bg-green-50 rounded text-green-700">JackRabbit</div>
              <div className="p-2 bg-green-50 rounded text-green-700">YMCA.org</div>
              <div className="p-2 bg-green-50 rounded text-green-700">RecDesk</div>
              <div className="p-2 bg-green-50 rounded text-green-700">Sawyer</div>
              <div className="p-2 bg-muted rounded text-muted-foreground">+ 17 more</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
}