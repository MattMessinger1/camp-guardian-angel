import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, Zap, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
}

interface InternetSearchResultsProps {
  results: InternetSearchResult[];
  onSelect: (result: InternetSearchResult) => void;
}

export function InternetSearchResults({ results, onSelect }: InternetSearchResultsProps) {
  // Track selected sessions for each result
  const [selectedSessions, setSelectedSessions] = useState<Record<string, { date?: string; time?: string }>>({});

  const handleDateChange = (resultIndex: number, date: string) => {
    setSelectedSessions(prev => ({
      ...prev,
      [resultIndex]: { ...prev[resultIndex], date }
    }));
  };

  const handleTimeChange = (resultIndex: number, time: string) => {
    setSelectedSessions(prev => ({
      ...prev,
      [resultIndex]: { ...prev[resultIndex], time }
    }));
  };

  const handleSelect = (result: InternetSearchResult, index: number) => {
    const selectedSession = selectedSessions[index];
    
    // Validation: Check if session selection is required and missing
    const needsDateSelection = result.session_dates && result.session_dates.length > 1;
    const needsTimeSelection = result.session_times && result.session_times.length > 1;
    
    if (needsDateSelection && !selectedSession?.date) {
      toast.error("Please select a date before proceeding with signup");
      return; // Prevent signup from proceeding
    }
    
    if (needsTimeSelection && !selectedSession?.time) {
      toast.error("Please select a time before proceeding with signup");
      return; // Prevent signup from proceeding
    }
    
    // Use first available options as defaults if not multi-option
    const finalDate = selectedSession?.date || result.session_dates?.[0];
    const finalTime = selectedSession?.time || result.session_times?.[0];
    
    console.log('✅ Session validation passed:', { date: finalDate, time: finalTime });
    
    onSelect({ 
      ...result, 
      selectedDate: finalDate, 
      selectedTime: finalTime 
    });
  };

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
              
              {/* Session Selection Dropdowns */}
              {(result.session_dates && result.session_dates.length > 1) && (
                <div className="mb-3">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Select Date
                  </label>
                  <Select onValueChange={(value) => handleDateChange(index, value)}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue placeholder="Choose a date" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-input z-50">
                      {result.session_dates.map((date, idx) => (
                        <SelectItem key={idx} value={date} className="hover:bg-muted">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(result.session_times && result.session_times.length > 1) && (
                <div className="mb-3">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Select Time
                  </label>
                  <Select onValueChange={(value) => handleTimeChange(index, value)}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue placeholder="Choose a time" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-input z-50">
                      {result.session_times.map((time, idx) => (
                        <SelectItem key={idx} value={time} className="hover:bg-muted">
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              
              {result.sessions && result.sessions.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Available Sessions:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {result.sessions.slice(0, 6).map((session, idx) => (
                      <div key={idx} className="text-xs bg-muted p-2 rounded">
                        <div className="font-medium">{new Date(session.date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{session.time}</div>
                        <div className="text-muted-foreground">{session.availability} spots • ${session.price}</div>
                      </div>
                    ))}
                  </div>
                  {result.sessions.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{result.sessions.length - 6} more sessions available
                    </p>
                  )}
                </div>
              )}
              
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
                onClick={() => handleSelect(result, index)}
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