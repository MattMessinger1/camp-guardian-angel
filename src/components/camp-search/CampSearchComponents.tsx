
import React, { useState } from 'react';
import { Search, Calendar, Users, MapPin, Loader2, Clock, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClarifyingQuestionsCard } from './ClarifyingQuestionsCard';

export interface SearchResult {
  sessionId: string;
  campName: string;
  providerName?: string;
  location?: {
    city: string;
    state: string;
  };
  registrationOpensAt?: string;
  sessionDates?: string[];
  sessionTimes?: string[];
  streetAddress?: string;
  signupCost?: number;
  totalCost?: number;
  capacity?: number;
  price?: number;
  ageRange?: {
    min: number;
    max: number;
  };
  confidence: number;
  reasoning: string;
  // Enhanced barrier intelligence
  predicted_barriers?: string[];
  credential_requirements?: string[];
  complexity_score?: number;
  workflow_estimate?: number;
  provider_platform?: string;
  expected_intervention_points?: string[];
  form_complexity_signals?: string[];
  historical_patterns?: any;
}

interface SearchResponse {
  success: boolean;
  clarifying_questions?: string[];
  results?: SearchResult[];
  error?: string;
}

interface CampSearchBoxProps {
  onSearch: (query: string, additionalData?: any) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export const CampSearchBox: React.FC<CampSearchBoxProps> = ({ 
  onSearch, 
  isLoading, 
  initialQuery = '' 
}) => {
  const [query, setQuery] = useState(initialQuery);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  // Use effect to auto-search when initialQuery changes
  React.useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type camp name or city (e.g. 'madison' or 'soccer camp')"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </form>
      
      <div className="text-sm text-muted-foreground text-center">
        <Badge variant="outline" className="mr-2">
          <Calendar className="h-3 w-3 mr-1" />
          Next 60 days
        </Badge>
        Showing camps and activities happening in the next 60 days only
      </div>
    </div>
  );
};

interface SearchResultsProps {
  results: SearchResult[];
  onRegister: (sessionId: string, selectedSession?: {date?: string, time?: string}, searchResult?: SearchResult) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onRegister }) => {
  const [selectedSessions, setSelectedSessions] = useState<{[key: string]: {date?: string, time?: string}}>({});

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSessionSelection = (resultId: string, type: 'date' | 'time', value: string) => {
    setSelectedSessions(prev => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        [type]: value
      }
    }));
  };

  if (results.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No upcoming camps found</p>
            <p className="text-sm">Try a different search term or location. We only show camps happening in the next 60 days.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Found {results.length} upcoming {results.length === 1 ? 'camp' : 'camps'}
      </div>
      
      {results.map((result, index) => {
        const resultId = `${result.sessionId}-${index}`;
        const hasMultipleDates = result.sessionDates && result.sessionDates.length > 1;
        const hasMultipleTimes = result.sessionTimes && result.sessionTimes.length > 1;
        const selectedDate = selectedSessions[resultId]?.date || result.sessionDates?.[0];
        const selectedTime = selectedSessions[resultId]?.time || result.sessionTimes?.[0];

        return (
          <Card key={resultId} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  {/* Provider Name - Bold, Larger Text */}
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {result.providerName || result.campName}
                  </h2>
                  
                  {/* Camp Name (if different from provider) */}
                  {result.providerName && result.providerName !== result.campName && (
                    <p className="text-lg text-muted-foreground mb-3">
                      {result.campName}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={() => onRegister(result.sessionId, {
                    date: selectedDate,
                    time: selectedTime
                  }, result)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 ml-4"
                >
                  Get ready for signup
                </Button>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Location & Address Column */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {result.location ? `${result.location.city}, ${result.location.state}` : 'Location TBD'}
                      </p>
                      {result.streetAddress && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.streetAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Session Details Column */}
                <div className="space-y-4">
                  {/* Session Date */}
                  {result.sessionDates && result.sessionDates.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Session Date
                        {hasMultipleDates && selectedDate && (
                          <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </label>
                      {hasMultipleDates ? (
                        <Select 
                          value={selectedDate} 
                          onValueChange={(value) => handleSessionSelection(resultId, 'date', value)}
                        >
                          <SelectTrigger className="w-full bg-background border border-border">
                            <SelectValue placeholder="Choose date" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            {result.sessionDates.map((date, idx) => (
                              <SelectItem key={idx} value={date} className="hover:bg-muted">
                                {formatDate(date)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(result.sessionDates[0])}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Session Time */}
                  {result.sessionTimes && result.sessionTimes.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Session Time
                        {hasMultipleTimes && selectedTime && (
                          <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </label>
                      {hasMultipleTimes ? (
                        <Select 
                          value={selectedTime} 
                          onValueChange={(value) => handleSessionSelection(resultId, 'time', value)}
                        >
                          <SelectTrigger className="w-full bg-background border border-border">
                            <SelectValue placeholder="Choose time" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            {result.sessionTimes.map((time, idx) => (
                              <SelectItem key={idx} value={time} className="hover:bg-muted">
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {result.sessionTimes[0]}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Cost Breakdown</p>
                    
                    {/* Cost due at signup */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Due at signup:</span>
                      <span className="text-sm font-medium">
                        {result.signupCost !== undefined 
                          ? formatCurrency(result.signupCost)
                          : 'TBD'
                        }
                      </span>
                    </div>
                    
                    {/* Total activity cost */}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm font-medium text-foreground">Total cost:</span>
                      <span className="text-lg font-bold text-foreground">
                        {result.totalCost !== undefined 
                          ? formatCurrency(result.totalCost)
                          : result.signupCost !== undefined 
                            ? formatCurrency(result.signupCost)
                            : 'TBD'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {result.registrationOpensAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Opens: {new Date(result.registrationOpensAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {result.capacity && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Capacity: {result.capacity}</span>
                    </div>
                  )}
                  
                  {result.ageRange && (
                    <div className="flex items-center gap-1">
                      <span>Ages: {result.ageRange.min}-{result.ageRange.max}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
