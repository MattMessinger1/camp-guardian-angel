import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, MapPin, Users, DollarSign, Zap } from "lucide-react";

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

interface InternetSearchResultsProps {
  results: InternetSearchResult[];
  onSelect: (result: InternetSearchResult) => void;
}

export function InternetSearchResults({ results, onSelect }: InternetSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No internet results found</p>
          <p className="text-sm">Try different search terms or switch to database search.</p>
        </div>
      </div>
    );
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityText = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'Easy signup';
      case 'medium': return 'Standard process';
      case 'high': return 'Complex registration';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Internet Search Results</h2>
        <Badge variant="secondary" className="text-sm">
          {results.length} camp{results.length !== 1 ? 's' : ''} found
        </Badge>
      </div>

      <div className="grid gap-4">
        {results.map((result, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2 mb-2">
                    {result.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mb-3">
                    {result.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {result.provider}
                    </Badge>
                    
                    <Badge 
                      className={`text-xs ${getComplexityColor(result.automationComplexity)}`}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {getComplexityText(result.automationComplexity)}
                    </Badge>
                    
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(result.confidence * 100)}% match
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Additional Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm text-muted-foreground">
                {result.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{result.location}</span>
                  </div>
                )}
                
                {result.estimatedDates && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="truncate">{result.estimatedDates}</span>
                  </div>
                )}
                
                {result.estimatedAgeRange && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="truncate">Ages {result.estimatedAgeRange}</span>
                  </div>
                )}
                
                {result.estimatedPrice && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="truncate">{result.estimatedPrice}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => onSelect(result)}
                  className="flex-1"
                  disabled={!result.canAutomate}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {result.canAutomate ? 'Start Auto-Registration' : 'Manual Registration Required'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open(result.url, '_blank')}
                  className="sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Site
                </Button>
              </div>
              
              {!result.canAutomate && (
                <p className="text-xs text-muted-foreground mt-2">
                  This camp requires manual registration. We'll open their website for you.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How Auto-Registration Works
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              When you click "Start Auto-Registration", we'll guide you through storing your registration details securely, 
              then automatically handle the signup process including form completion, account creation, and payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}