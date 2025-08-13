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
  camp_id: string;
  camp_name: string;
  location_id?: string;
  location_name?: string;
  session_id?: string;
  session_label?: string;
  start_date?: string;
  end_date?: string;
  age_min?: number;
  age_max?: number;
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
            placeholder="Search for camps, activities, or locations..."
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
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'TBD';
    }
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return 'Dates TBD';
    if (start && !end) return `Starts ${formatDate(start)}`;
    if (!start && end) return `Ends ${formatDate(end)}`;
    
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);
    
    if (startFormatted === endFormatted) return startFormatted;
    return `${startFormatted} - ${endFormatted}`;
  };

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
        <Card key={`${result.camp_id}-${result.session_id || result.location_id || index}`} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{result.camp_name}</CardTitle>
                {result.location_name && (
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {result.location_name}
                  </CardDescription>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {Math.round(result.confidence * 100)}% match
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {result.session_label && (
              <div>
                <div className="font-medium text-sm">{result.session_label}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange(result.start_date, result.end_date)}
                  </div>
                  {(result.age_min || result.age_max) && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Ages {result.age_min || '?'}-{result.age_max || '?'}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground italic">
              {result.reasoning}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => onRegister(result.session_id || result.camp_id)}
              disabled={!result.session_id}
            >
              {result.session_id ? 'Register with Guardian Angel' : 'View Camp Details'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};