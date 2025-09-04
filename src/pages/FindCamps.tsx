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
  id?: string;
  name?: string;
  title?: string;
  description: string;
  url?: string;
  provider: string;
  estimatedDates?: string;
  estimatedPrice?: string;
  estimatedAgeRange?: string;
  location?: string;
  street_address?: string;
  signup_cost?: number;
  total_cost?: number;
  confidence?: number;
  canAutomate?: boolean;
  automationComplexity?: 'low' | 'medium' | 'high';
  sessions?: Array<{
    id: string;
    date: string;
    time: string;
    availability: number;
    price: number;
  }>;
  session_dates?: string[];
  session_times?: string[];
  selectedDate?: string;
  selectedTime?: string;
  businessName?: string;
  signupCost?: number;
  totalCost?: number;
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
  const [internetSearchData, setInternetSearchData] = useState<any>(null); // Store full internet search response
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
    
    console.log('🔍 NEW SEARCH STARTED for:', query);
    
    // Clear any stale session data when starting new search
    setSearchResults([]);
    setInternetResults([]);
    setClarifyingQuestions([]);
    setInternetSearchData(null);

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

        // Clean results to ensure Carbone doesn't get contaminated with other IDs
        const cleanResults = (response.results || []).map((result: any, index: number) => {
          if (result.businessName?.toLowerCase().includes('carbone') || 
              result.name?.toLowerCase().includes('carbone')) {
            console.log('🍝 Cleaning Carbone result to prevent ID contamination');
            return {
              ...result,
              id: `carbone-${Date.now()}-${index}`, // Unique ID for Carbone
              url: 'https://resy.com/cities/ny/carbone',
              provider: 'resy',
              businessName: 'Carbone'
            };
          }
          return {
            ...result,
            id: `result-${Date.now()}-${index}` // Ensure unique IDs
          };
        });

        setInternetResults(cleanResults);
        setInternetSearchData(response); // Store full response including extracted_time

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

  const handleRegister = async (sessionId: string, selectedSession?: {date?: string, time?: string}, searchResult?: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to register for camps.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Create a real registration plan in the database
    const { data: plan, error } = await supabase
      .from('registration_plans')
      .insert({
        user_id: user.id,
        name: searchResult?.businessName || searchResult?.name || searchResult?.campName || 'Activity Registration',
        url: searchResult?.url || 'https://studio.onepeloton.com',
        provider: searchResult?.provider || 'unknown',
        created_from: 'camp_search',
        rules: {
          predicted_barriers: searchResult?.predicted_barriers || [],
          credential_requirements: searchResult?.credential_requirements || [],
          complexity_score: searchResult?.complexity_score || 0.5,
          workflow_estimate: searchResult?.workflow_estimate || 10,
          provider_platform: searchResult?.provider_platform || 'custom',
          expected_intervention_points: searchResult?.expected_intervention_points || [],
          form_complexity_signals: searchResult?.form_complexity_signals || [],
          session_data: {
            selectedDate: selectedSession?.date,
            selectedTime: selectedSession?.time,
            signupCost: searchResult?.signupCost || searchResult?.signup_cost,
            totalCost: searchResult?.totalCost || searchResult?.total_cost
          }
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: "Failed to create registration plan",
        variant: "destructive",
      });
      return;
    }

    if (plan) {
      console.log('Created plan with ID:', plan.id);
      navigate(`/ready-to-signup/${plan.id}`);
    }
  };

  const handleInternetResultSelect = async (result: InternetSearchResult) => {
    console.log('🎯 INTERNET RESULT SELECT - Click detected on:', {
      resultName: result.businessName || result.name || result.title,
      resultUrl: result.url,
      resultId: result.id,
      provider: result.provider,
      fullResult: result
    });
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to start the automation process.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    // Check if this is Carbone - route to dedicated Carbone setup
    if (result.businessName?.toLowerCase().includes('carbone') || 
        result.name?.toLowerCase().includes('carbone') ||
        result.url?.includes('carbone')) {
      console.log('🍝 Carbone detected in FindCamps - navigating to Carbone setup with clean state');
      navigate('/ready-to-signup/carbone-resy', {
        state: {
          businessName: 'Carbone',
          url: 'https://resy.com/cities/ny/carbone',
          provider: 'resy',
          sessionData: {
            businessName: 'Carbone',
            url: 'https://resy.com/cities/ny/carbone'
          }
        }
      });
      return; // Stop here, don't create a plan
    }

    // Create a real registration plan in the database instead of using fake session IDs
    const { data: plan, error } = await supabase
      .from('registration_plans')
      .insert({
        user_id: user.id,
        name: result.businessName || result.name || result.title || 'Internet Search Result',
        url: result.url || 'https://studio.onepeloton.com',
        provider: result.provider || 'unknown',
        created_from: 'internet_search',
        rules: {
          session_data: {
            selectedDate: result.selectedDate || '2025-09-02',
            selectedTime: result.selectedTime || 'Morning (9:00 AM)',
            signupCost: result.signupCost || result.signup_cost || 45,
            totalCost: result.totalCost || result.total_cost || result.signupCost || result.signup_cost || 45,
            businessName: result.businessName || result.name || result.title,
            location: result.location
          },
          predicted_barriers: [],
          credential_requirements: [],
          complexity_score: 0.5,
          workflow_estimate: 10,
          provider_platform: result.provider || 'custom',
          expected_intervention_points: [],
          form_complexity_signals: []
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: "Failed to create registration plan",
        variant: "destructive",
      });
      return;
    }

    if (plan) {
      console.log('✅ Created plan with ID:', plan.id);
      navigate(`/ready-to-signup/${plan.id}`);
    }
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
                extractedTime={internetSearchData?.extracted_time}
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