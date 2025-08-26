import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExternalLink, Search, PlayCircle, AlertTriangle } from 'lucide-react';

export function ActiveNetworkTester() {
  const [searchQuery, setSearchQuery] = useState('swimming lessons');
  const [activeUrl, setActiveUrl] = useState('https://apm.activecommunities.com/');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Common ActiveNetwork test sites
  const testSites = [
    {
      name: 'Arlington Parks & Recreation',
      url: 'https://apm.activecommunities.com/arlingtontx',
      description: 'Texas municipal recreation center'
    },
    {
      name: 'City of Plano',
      url: 'https://apm.activecommunities.com/planointernet',
      description: 'Plano recreation programs'
    },
    {
      name: 'Richardson Recreation',
      url: 'https://apm.activecommunities.com/richardsonrec',
      description: 'Richardson aquatic and recreation programs'
    }
  ];

  const searchActiveSite = async () => {
    setIsSearching(true);
    try {
      console.log('Searching ActiveNetwork site:', activeUrl);
      console.log('Search query:', searchQuery);

      // Use the AI camp search to find sessions
      const { data, error } = await supabase.functions.invoke('ai-camp-search', {
        body: {
          query: searchQuery,
          provider_filter: 'active.com',
          limit: 10
        }
      });

      if (error) {
        throw error;
      }

      console.log('ActiveNetwork search results:', data);
      setSearchResults(data?.results || []);
      
      if (data?.results?.length > 0) {
        toast.success(`Found ${data.results.length} ActiveNetwork sessions!`);
      } else {
        toast.info('No ActiveNetwork sessions found for this search');
      }
    } catch (error: any) {
      console.error('ActiveNetwork search failed:', error);
      toast.error('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const testSignupFlow = async (session: any) => {
    try {
      console.log('Testing signup flow for ActiveNetwork session:', session);
      
      // This would trigger the automated signup process
      const { data, error } = await supabase.functions.invoke('automate-provider', {
        body: {
          session_id: session.sessionId,
          provider: 'active.com',
          test_mode: true
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Signup flow test initiated!');
      setSelectedSession(session);
    } catch (error: any) {
      console.error('Signup flow test failed:', error);
      toast.error('Test failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ActiveNetwork Camp Testing
          </CardTitle>
          <CardDescription>
            Search and test signup flows with ActiveNetwork camp providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Testing Mode:</strong> This will simulate the signup flow without making actual registrations.
              Perfect for testing while waiting for SMS A2P approval.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchQuery">What to Search For</Label>
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="swimming lessons, summer camp, tennis..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activeUrl">ActiveNetwork Site (Optional)</Label>
              <Input
                id="activeUrl"
                value={activeUrl}
                onChange={(e) => setActiveUrl(e.target.value)}
                placeholder="https://apm.activecommunities.com/..."
              />
            </div>
          </div>

          <Button
            onClick={searchActiveSite}
            disabled={isSearching || !searchQuery}
            className="w-full"
          >
            {isSearching ? 'Searching...' : 'Search ActiveNetwork Sites'}
          </Button>
        </CardContent>
      </Card>

      {/* Test Sites */}
      <Card>
        <CardHeader>
          <CardTitle>Popular ActiveNetwork Test Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testSites.map((site, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{site.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{site.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveUrl(site.url)}
                  >
                    Use This Site
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(site.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ActiveNetwork Sessions Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{result.name || result.title}</h4>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">ActiveNetwork</Badge>
                        {result.price && <Badge variant="secondary">${result.price}</Badge>}
                      </div>
                    </div>
                    <Button
                      onClick={() => testSignupFlow(result)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Test Signup
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Test Session */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>Testing Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Session:</strong> {selectedSession.name}</p>
              <p><strong>Provider:</strong> ActiveNetwork</p>
              <p><strong>Status:</strong> <Badge variant="outline">Test Mode</Badge></p>
            </div>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The signup flow test is running in the background. Check the console for detailed logs.
                This will test form detection, CAPTCHA handling, and notification systems.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}