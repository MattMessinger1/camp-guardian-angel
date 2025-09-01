import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, Zap } from "lucide-react";

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
}

interface InternetSearchResultsProps {
  results: InternetSearchResult[];
  onSelect: (result: InternetSearchResult) => void;
}

export function InternetSearchResults({ results, onSelect }: InternetSearchResultsProps) {
  if (results.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No internet results found</p>
            <p className="text-sm">Try different search terms or switch to database search.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Found {results.length} {results.length === 1 ? 'match' : 'matches'} from across the internet
      </div>
      
      {results.map((result, index) => (
        <Card key={index} className="p-6 w-full hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {result.name || result.title}
              </h2>
              
              <p className="text-muted-foreground mb-3">
                Provider: {result.provider}
              </p>
              
              <p className="text-muted-foreground mb-3">
                {result.description}
              </p>
              
              {(result.location || result.street_address) && (
                <p className="text-muted-foreground mb-2">
                  Location: {result.street_address || result.location}
                </p>
              )}
              
              {result.estimatedDates && (
                <p className="text-muted-foreground mb-2">
                  Estimated Dates: {result.estimatedDates}
                </p>
              )}
              
              {result.estimatedAgeRange && (
                <p className="text-muted-foreground mb-2">
                  Age Range: {result.estimatedAgeRange}
                </p>
              )}
              
              <div className="mb-4 space-y-1">
                {(result.signup_cost !== undefined && result.signup_cost !== null) ? (
                  <p className="text-muted-foreground">
                    Due at signup: <span className="font-medium">${result.signup_cost}</span>
                  </p>
                ) : result.estimatedPrice && (
                  <p className="text-muted-foreground">
                    Estimated Fee: {result.estimatedPrice}
                  </p>
                )}
                
                {(result.total_cost !== undefined && result.total_cost !== null) && (
                  <p className="text-muted-foreground">
                    Total cost: <span className="font-medium">${result.total_cost}</span>
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 mb-3">
                {result.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(result.confidence * 100)}% match
                  </Badge>
                )}
                
                {result.automationComplexity && (
                  <Badge variant="secondary" className="text-xs">
                    {result.automationComplexity} automation
                  </Badge>
                )}
              </div>
              
              {result.url && (
                <p className="text-xs text-muted-foreground italic mb-2">
                  Found via internet search • Click to view website: {result.url}
                </p>
              )}
            </div>
            
            <div className="ml-6 flex flex-col items-start gap-2">
              <Button 
                onClick={() => onSelect(result)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                disabled={result.canAutomate === false}
              >
                Get ready for signup
              </Button>
              
              {result.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(result.url, '_blank')}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit Site
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Internet Search Results
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              These camps were found by searching the entire internet. When you click "Get ready for signup", 
              we'll help you store your credentials and automate the registration process for any camp worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}