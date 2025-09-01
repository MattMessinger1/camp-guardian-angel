import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from "@/lib/log";
import { Target, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CampSearchBox, SearchResults } from '@/components/camp-search/CampSearchComponents';
import type { SearchResult } from '@/components/camp-search/CampSearchComponents';
import { InternetSearchToggle } from '@/components/InternetSearchToggle';
import { InternetSearchResults } from '@/components/InternetSearchResults';
import { ClarifyingQuestionsCard } from '@/components/camp-search/ClarifyingQuestionsCard';

interface InternetSearchResult {
  title: string;
  description: string;
  url: string;
  provider: string;
  estimatedDates?: string;
  estimatedPrice?: string;
  estimatedAgeRange?: string;
  location?: string;
  confidence: number;
  canAutomate: boolean;
  automationComplexity: 'low' | 'medium' | 'high';
}

interface SearchResponse {
  success: boolean;
  clarifying_questions?: string[];
  results?: SearchResult[];
  error?: string;
}

const FindCamps: React.FC = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [internetResults, setInternetResults] = useState<InternetSearchResult[]>([]);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [searchParams, setSearchParams] = useState<any>({});
  const [useInternetSearch, setUseInternetSearch] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Debounced search function
  const debounceTimeout = React.useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (query: string, additionalParams: any = {}) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setLastQuery(query);

    try {
      logger.info('Performing search', { 
        query, 
        searchType: useInternetSearch ? 'internet' : 'database',
        city: additionalParams.city,
        state: additionalParams.state,
        component: 'FindCamps' 
      });

      if (useInternetSearch) {
        // Search the entire internet
        const searchPayload = {
          query: query.trim(),
          location: additionalParams.city ? `${additionalParams.city}, ${additionalParams.state || ''}` : undefined,
          dateRange: additionalParams.desired_week_date,
          ageRange: additionalParams.child?.age ? `${additionalParams.child.age}` : undefined,
          limit: 10,
        };

        const { data, error } = await supabase.functions.invoke('internet-activity-search', {
          body: searchPayload
        });

        if (error) {
          throw new Error(error.message);
        }

        const response = data;

        if (!response.success) {
          throw new Error(response.error || 'Internet search failed');
        }

        logger.info('Internet search response received', {
          success: !!response.success,
          resultCount: response.results?.length || 0,
          component: 'FindCamps'
        });

        setInternetResults(response.results || []);
        setSearchResults([]); // Clear database results when using internet search
        setClarifyingQuestions([]); // Internet search doesn't have clarifying questions

        if (response.results?.length === 0) {
          toast({
            title: "No internet results found",
            description: "Try different search terms or switch to database search.",
          });
        }
      } else {
        // Search our database
        const searchPayload = {
          query: query.trim(),
          limit: 10,
          ...additionalParams,
        };

        const { data, error } = await supabase.functions.invoke('internet-activity-search', {
          body: searchPayload
        });

        if (error) {
          throw new Error(error.message);
        }

        const response: SearchResponse = data;

        if (!response.success) {
          throw new Error(response.error || 'Search failed');
        }

        logger.info('Database search response received', {
          success: !!response.success,
          resultCount: response.results?.length || 0,
          hasError: !response.success,
          component: 'FindCamps'
        });

        setSearchResults(response.results || []);
        setInternetResults([]); // Clear internet results when using database search
        setClarifyingQuestions(response.clarifying_questions || []);

        if (response.results?.length === 0) {
          toast({
            title: "No matches found",
            description: "Try a different search term or enable internet search to find any camp worldwide.",
          });
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : 'Unable to search camps right now.',
        variant: "destructive",
      });
      setSearchResults([]);
      setInternetResults([]);
      setClarifyingQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, useInternetSearch]);

  const handleSearch = useCallback((query: string, additionalData: any = {}) => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout
    debounceTimeout.current = setTimeout(() => {
      const mergedParams = { ...searchParams, ...additionalData };
      setSearchParams(mergedParams);
      performSearch(query, mergedParams);
    }, 300);
  }, [performSearch, searchParams]);

  const handleClarifyingSubmit = (data: { childAge?: number; weekDate?: string }) => {
    setClarifyingQuestions([]); // Clear questions
    
    const additionalParams: any = {};
    
    if (data.childAge) {
      additionalParams.child = { age: data.childAge };
    }
    
    if (data.weekDate) {
      additionalParams.desired_week_date = data.weekDate;
    }

    // Immediately search with new parameters
    performSearch(lastQuery, { ...searchParams, ...additionalParams });
    setSearchParams(prev => ({ ...prev, ...additionalParams }));
  };

  const handleRegister = (sessionId: string, selectedSession?: {date?: string, time?: string}, searchResult?: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to register for camps.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Build URL parameters including session selection data and barrier intelligence
    const params = new URLSearchParams({ sessionId });
    
    if (selectedSession?.date) {
      params.append('selectedDate', selectedSession.date);
    }
    
    if (selectedSession?.time) {
      params.append('selectedTime', selectedSession.time);
    }

    // Pass barrier intelligence for workflow pre-population
    if (searchResult?.predicted_barriers) {
      params.append('predictedBarriers', JSON.stringify(searchResult.predicted_barriers));
    }
    
    if (searchResult?.credential_requirements) {
      params.append('credentialRequirements', JSON.stringify(searchResult.credential_requirements));
    }
    
    if (searchResult?.complexity_score) {
      params.append('complexityScore', searchResult.complexity_score.toString());
    }
    
    if (searchResult?.workflow_estimate) {
      params.append('workflowEstimate', searchResult.workflow_estimate.toString());
    }
    
    if (searchResult?.provider_platform) {
      params.append('providerPlatform', searchResult.provider_platform);
    }

    // Navigate to enhanced signup page with barrier intelligence
    navigate(`/enhanced-signup?${params.toString()}`);
  };

  const handleInternetResultSelect = (result: InternetSearchResult) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to start the automation process.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Start automation workflow for this internet result
    navigate(`/signup?campUrl=${encodeURIComponent(result.url)}&campName=${encodeURIComponent(result.title)}`);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Target className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Tell us the camp, we'll find the exact session
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Search thousands of camp sessions using natural language. Just describe what you're looking for.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <Sparkles className="h-4 w-4" />
            <span>Powered by AI • Updated in real-time</span>
          </div>
        </div>

        {/* Internet Search Toggle */}
        <div className="mb-6">
          <InternetSearchToggle
            enabled={useInternetSearch}
            onToggle={setUseInternetSearch}
          />
        </div>

        {/* Search Box */}
        <div className="mb-8">
          <CampSearchBox
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Clarifying Questions - only for database search */}
        {clarifyingQuestions.length > 0 && !isLoading && !useInternetSearch && (
          <div className="mb-8">
            <ClarifyingQuestionsCard
              questions={clarifyingQuestions}
              onSubmit={handleClarifyingSubmit}
            />
          </div>
        )}

        {/* Search Results */}
        {(searchResults.length > 0 || internetResults.length > 0 || (!isLoading && lastQuery)) && (
          <div className="mb-8">
            {useInternetSearch ? (
              <InternetSearchResults
                results={internetResults}
                onSelect={handleInternetResultSelect}
              />
            ) : (
              <SearchResults
                results={searchResults}
                onRegister={handleRegister}
              />
            )}
          </div>
        )}

        {/* Getting Started Hints */}
        {!lastQuery && !isLoading && (
          <div className="text-center">
            <div className="bg-card border rounded-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">Try searching for:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">By Activity:</div>
                  <div className="text-muted-foreground space-y-1">
                    <div>"soccer camps in Austin"</div>
                    <div>"art classes for kids"</div>
                    <div>"swimming camps nationwide"</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">By Camp Name:</div>
                  <div className="text-muted-foreground space-y-1">
                    <div>"Camp Wildwood"</div>
                    <div>"YMCA summer programs"</div>
                    <div>"gymnastics academy"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindCamps;