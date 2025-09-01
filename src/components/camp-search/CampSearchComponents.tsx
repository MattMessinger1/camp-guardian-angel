
import React, { useState } from 'react';
import { Search, Calendar, Users, MapPin, Loader2, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClarifyingQuestionsCard } from './ClarifyingQuestionsCard';

interface SearchResult {
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
  onRegister: (sessionId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onRegister }) => {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
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
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Found {results.length} upcoming {results.length === 1 ? 'camp' : 'camps'}
      </div>
      
      {results.map((result, index) => (
        <Card key={`${result.sessionId}-${index}`} className="p-6 w-full hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {result.campName}
              </h2>
              
              {result.providerName && (
                <p className="text-muted-foreground mb-3">
                  Provider: {result.providerName}
                </p>
              )}

              {/* Location */}
              {result.location && (
                <div className="flex items-center text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{result.location.city}, {result.location.state}</span>
                </div>
              )}

              {/* Street Address */}
              {result.streetAddress && (
                <div className="text-sm text-muted-foreground mb-2">
                  📍 {result.streetAddress}
                </div>
              )}

              {/* Session Dates */}
              {result.sessionDates && result.sessionDates.length > 0 && (
                <div className="flex items-center text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {result.sessionDates.length === 1 
                      ? formatDate(result.sessionDates[0])
                      : `${formatDate(result.sessionDates[0])} - ${formatDate(result.sessionDates[result.sessionDates.length - 1])}`
                    }
                  </span>
                </div>
              )}

              {/* Session Times */}
              {result.sessionTimes && result.sessionTimes.length > 0 && (
                <div className="flex items-center text-muted-foreground mb-2">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{result.sessionTimes.join(', ')}</span>
                </div>
              )}

              {/* Pricing */}
              {(result.signupCost !== undefined || result.totalCost !== undefined) && (
                <div className="flex items-center text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>
                    {result.signupCost !== undefined && result.signupCost > 0 && (
                      <>Signup: {formatCurrency(result.signupCost)}</>
                    )}
                    {result.totalCost !== undefined && result.totalCost > 0 && result.totalCost !== result.signupCost && (
                      <> • Total: {formatCurrency(result.totalCost)}</>
                    )}
                    {(result.signupCost === 0 && result.totalCost === 0) && (
                      <>Free</>
                    )}
                  </span>
                </div>
              )}
              
              {result.registrationOpensAt && (
                <p className="text-orange-600 font-medium mb-3">
                  Registration opens: {new Date(result.registrationOpensAt).toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
              
              {result.capacity && (
                <p className="text-muted-foreground mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Capacity: {result.capacity}
                </p>
              )}

              {result.ageRange && (
                <p className="text-muted-foreground mb-2">
                  Ages: {result.ageRange.min}-{result.ageRange.max}
                </p>
              )}
              
              {result.reasoning && (
                <p className="text-xs text-muted-foreground italic mb-2">
                  {result.reasoning}
                </p>
              )}
            </div>
            
            <div className="ml-6 flex flex-col items-start">
              <Button 
                onClick={() => onRegister(result.sessionId)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Get ready for signup
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
