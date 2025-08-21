import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';

const SearchTest = () => {
  const [testQuery, setTestQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testQueries = [
    'summer soccer camps for 8 year olds',
    'camps in Madison Wisconsin',
    'basketball activities for kids',
    'art camps July 2024',
    'swimming lessons for beginners'
  ];

  const runTest = async (query) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Testing search query:', query);
      
      const startTime = performance.now();
      
      const { data, error: apiError } = await supabase.functions.invoke('ai-camp-search', {
        body: {
          query: query.trim(),
          limit: 5,
        }
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (apiError) {
        throw new Error(apiError.message);
      }

      console.log('Search response:', data);

      setResults({
        ...data,
        responseTime,
        query
      });

    } catch (err) {
      console.error('Search test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            AI Search System Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Test Input */}
          <div className="flex gap-2">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter test search query..."
              className="flex-1"
            />
            <Button 
              onClick={() => runTest(testQuery)} 
              disabled={loading || !testQuery.trim()}
            >
              {loading ? <Clock className="w-4 h-4 animate-spin" /> : 'Test Search'}
            </Button>
          </div>

          {/* Preset Test Queries */}
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Test Queries:</h3>
            <div className="flex flex-wrap gap-2">
              {testQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => runTest(query)}
                  disabled={loading}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Test Results for: "{results.query}"
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Response Time: {results.responseTime}ms</span>
              <span>Results: {results.results?.length || 0}</span>
            </div>
          </CardHeader>
          <CardContent>
            {results.success ? (
              <div className="space-y-4">
                {/* Clarifying Questions */}
                {results.clarifying_questions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Clarifying Questions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {results.clarifying_questions.map((q, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Search Results */}
                {results.results?.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Search Results:</h4>
                    {results.results.map((result, i) => (
                      <Card key={i} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="font-medium">{result.camp_name}</h5>
                            <Badge variant="secondary">
                              {Math.round(result.confidence * 100)}% match
                            </Badge>
                          </div>
                          {result.location_name && (
                            <p className="text-sm text-muted-foreground">📍 {result.location_name}</p>
                          )}
                          {result.session_label && (
                            <p className="text-sm">🎯 {result.session_label}</p>
                          )}
                          {(result.start_date || result.end_date) && (
                            <p className="text-sm">📅 {result.start_date} - {result.end_date}</p>
                          )}
                          {(result.age_min || result.age_max) && (
                            <p className="text-sm">👶 Ages: {result.age_min}-{result.age_max}</p>
                          )}
                          <p className="text-xs bg-muted p-2 rounded">
                            <strong>AI Reasoning:</strong> {result.reasoning}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No results found</p>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                <p>❌ Search failed: {results.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">❌ Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Homepage Link */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="mb-4">Test completed! Now test the actual homepage search:</p>
          <Button asChild>
            <a href="/">Go to Homepage</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchTest;