import React, { useState } from 'react';
import { Search, ExternalLink, Calendar, Users, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CampLinkIngestModal } from './CampLinkIngestModal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleIngestSuccess = (campName: string) => {
    setQuery(campName);
    setIsModalOpen(false);
    // Auto-search after a brief delay to allow index refresh
    setTimeout(() => {
      onSearch(campName);
    }, 2000);
    
    toast({
      title: "Camp source added!",
      description: "Searching for sessions...",
    });
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
            placeholder="Activity / Camp name, city, dates..."
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
      
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Paste a camp link
        </Button>
      </div>

      <CampLinkIngestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleIngestSuccess}
      />
    </div>
  );
};

interface SearchResultsProps {
  results: SearchResult[];
  onRegister: (sessionId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onRegister }) => {
  if (results.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No camps found</p>
            <p className="text-sm">Try a different search term or add a camp link to expand our database.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Found {results.length} {results.length === 1 ? 'match' : 'matches'}
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
              
              {result.sessionDates && (
                <p className="text-muted-foreground mb-2">
                  Dates: {new Date(result.sessionDates.start).toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })} – {new Date(result.sessionDates.end).toLocaleDateString('en-US', {
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
                  Capacity: {result.capacity}
                </p>
              )}
              
              {result.price && (
                <p className="text-muted-foreground mb-4">
                  Fee due at signup: ${result.price.toFixed(2)}
                </p>
              )}
              
              {result.reasoning && (
                <p className="text-xs text-muted-foreground italic mb-2">
                  {result.reasoning}
                </p>
              )}
            </div>
            
            <div className="ml-6 flex flex-col items-end gap-2">
              <Badge variant="secondary" className="text-xs">
                {Math.round(result.confidence * 100)}% match
              </Badge>
              <Button 
                onClick={() => onRegister(result.sessionId)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Register
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};