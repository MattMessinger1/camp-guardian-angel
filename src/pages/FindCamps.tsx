import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CampSearchBox, SearchResults } from '@/components/camp-search/CampSearchComponents';
import { ClarifyingQuestionsCard } from '@/components/camp-search/ClarifyingQuestionsCard';

interface SearchResult {
  sessionId: string;
  campName: string;
  providerName?: string;
  location?: {
    city: string;
    state: string;
  };
  registrationOpensAt?: string;
  sessionDates?: {
    start: string;
    end: string;
  };
  capacity?: number;
  price?: number;
  ageRange?: {
    min: number;
    max: number;
  };
  confidence: number;
  reasoning: string;
}

interface SearchResponse {
  success: boolean;
  clarifying_questions?: string[];
  results?: SearchResult[];
  error?: string;
}

const FindCamps: React.FC = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [searchParams, setSearchParams] = useState<any>({});
  
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
      console.log('Performing search:', { query, additionalParams });

      const searchPayload = {
        query: query.trim(),
        limit: 10,
        ...additionalParams,
      };

      const { data, error } = await supabase.functions.invoke('ai-camp-search', {
        body: searchPayload
      });

      if (error) {
        throw new Error(error.message);
      }

      const response: SearchResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }

      console.log('Search response:', response);

      setSearchResults(response.results || []);
      setClarifyingQuestions(response.clarifying_questions || []);

      if (response.results?.length === 0) {
        toast({
          title: "No matches found",
          description: "Try a different search term or add a camp link to expand our database.",
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : 'Unable to search camps right now.',
        variant: "destructive",
      });
      setSearchResults([]);
      setClarifyingQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  const handleRegister = (sessionId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to register for camps.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Navigate to existing registration flow with session_id
    navigate(`/sessions/${sessionId}`);
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

        {/* Search Box */}
        <div className="mb-8">
          <CampSearchBox
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Clarifying Questions */}
        {clarifyingQuestions.length > 0 && !isLoading && (
          <div className="mb-8">
            <ClarifyingQuestionsCard
              questions={clarifyingQuestions}
              onSubmit={handleClarifyingSubmit}
            />
          </div>
        )}

        {/* Search Results */}
        {(searchResults.length > 0 || (!isLoading && lastQuery)) && (
          <div className="mb-8">
            <SearchResults
              results={searchResults}
              onRegister={handleRegister}
            />
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