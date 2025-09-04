import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, Zap, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function generateDefaultUrl(providerName: string): string {
  const name = providerName?.toLowerCase() || '';
  if (name.includes('peloton')) return 'https://studio.onepeloton.com';
  if (name.includes('soulcycle')) return 'https://www.soul-cycle.com';
  if (name.includes('barry')) return 'https://www.barrysbootcamp.com';
  if (name.includes('equinox')) return 'https://www.equinox.com';
  return `https://www.google.com/search?q=${encodeURIComponent(providerName || 'fitness class')}`;
}

interface InternetSearchResult {
  id?: string;
  name?: string;
  title?: string;
  description: string;
  url?: string;
  // Additional URL fields that might come from Perplexity API
  signup_url?: string;
  link?: string;
  reference_url?: string;
  source_url?: string;
  website?: string;
  providerUrl?: string;
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
  // Mapped fields for session data
  businessName?: string;
  signupCost?: number;
  totalCost?: number;
}

interface InternetSearchResultsProps {
  results: InternetSearchResult[];
  extractedTime?: any; // Add extracted time data from search
  onSelect: (result: InternetSearchResult) => void;
}

const processSearchResults = (results: InternetSearchResult[]) => {
  return results.map((result, index) => {
    // Create truly unique IDs for each result
    const uniqueId = `${result.businessName?.toLowerCase().replace(/\s+/g, '-') || 'activity'}-${Date.now()}-${index}`;
    
    // Extract URL from multiple possible fields (same logic as FindCamps.tsx)
    const extractedUrl = result.url || result.signup_url || result.link || 
                        result.reference_url || result.source_url || 
                        result.website || result.providerUrl;
    
    console.log('🔗 InternetSearchResults URL processing:', {
      name: result.businessName || result.name,
      extractedUrl,
      originalUrl: result.url,
      signup_url: result.signup_url,
      providerUrl: result.providerUrl
    });
    
    return {
      ...result,
      id: uniqueId,
      session_id: uniqueId,
      // Ensure correct data associations
      businessName: result.businessName || result.name,
      // Preserve URLs properly - don't convert to empty string
      url: extractedUrl || undefined,
      signup_url: extractedUrl || undefined, 
      providerUrl: extractedUrl || undefined,
      provider: detectProvider(result)
    };
  });
};

const detectProvider = (result: InternetSearchResult) => {
  const name = (result.businessName || '').toLowerCase();
  const url = (result.url || '').toLowerCase();
  
  if (name.includes('carbone') || url.includes('carbone')) return 'resy';
  if (name.includes('peloton') || url.includes('peloton')) return 'peloton';
  return 'unknown';
};

export function InternetSearchResults({ results, extractedTime, onSelect }: InternetSearchResultsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Track selected sessions for each result
  const [selectedSessions, setSelectedSessions] = useState<Record<string, { date?: string; time?: string }>>({});
  
  // Process results to ensure unique IDs
  const processedResults = processSearchResults(results);

  // Get unique dates and times from sessions array
  const getSessionData = (result: InternetSearchResult) => {
    if (!result.sessions || result.sessions.length === 0) {
      return { dates: [], times: [], sessions: [] };
    }

    const uniqueDates = [...new Set(result.sessions.map(s => s.date))];
    const uniqueTimes = [...new Set(result.sessions.map(s => s.time))];
    
    return { 
      dates: uniqueDates, 
      times: uniqueTimes, 
      sessions: result.sessions 
    };
  };

  // Get selected session details including price
  const getSelectedSessionDetails = (result: InternetSearchResult, index: number) => {
    const selectedSession = selectedSessions[index];
    const { sessions } = getSessionData(result);
    
    if (selectedSession?.date && selectedSession?.time) {
      const matchingSession = sessions.find(s => 
        s.date === selectedSession.date && s.time === selectedSession.time
      );
      return matchingSession;
    }
    
    return sessions[0]; // Default to first session
  };

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

  const handleSearchResultClick = (result: any) => {
    // Clear any cached session data first
    localStorage.removeItem('currentSession');
    sessionStorage.clear();
    
    // Extract URL from multiple possible fields
    const extractedUrl = result.url || result.signup_url || result.link || 
                        result.reference_url || result.source_url || 
                        result.website || result.providerUrl;
    
    console.log('🔗 handleSearchResultClick URL extraction:', {
      name: result.businessName || result.name,
      extractedUrl,
      availableFields: {
        url: result.url,
        signup_url: result.signup_url,
        providerUrl: result.providerUrl
      }
    });
    
    // Create fresh session data
    const freshData = {
      id: `${result.businessName || result.name}-${Date.now()}`,
      businessName: result.businessName || result.name,
      url: extractedUrl || 'https://google.com',
      provider: result.businessName?.includes('Carbone') ? 'resy' : detectProvider(result)
    };
    
    console.log('🎯 NAVIGATION DEBUG - Click detected with fresh data:', freshData);
    
    if (!user?.id) {
      console.error('No user ID!');
      toast.error('Please sign in first');
      return;
    }
    
    // Check if this is Carbone - route to dedicated Carbone setup
    if (result.businessName?.toLowerCase().includes('carbone') || 
        result.name?.toLowerCase().includes('carbone') ||
        result.url?.includes('carbone')) {
      console.log('🍝 Carbone detected - navigating to Carbone setup with clean state');
      navigate('/ready-to-signup/carbone-resy', {
        state: freshData,
        replace: true // Replace history to avoid back button issues
      });
      return;
    }
    
    // Navigate with fresh data
    navigate(`/ready-to-signup/${freshData.id}`, {
      state: freshData,
      replace: true // Replace history to avoid back button issues
    });
  };

  const handleSessionSelect = async (result: any, sessionDetails?: any) => {
    // Use the new handleSearchResultClick for consistency
    handleSearchResultClick(result);
    
    try {
      console.log('🔧 Creating clean registration plan using database function');
      
      // Use database function to generate clean plan data
      const { data: planData, error: planError } = await supabase
        .rpc('generate_clean_registration_plan', {
          p_user_id: user.id,
          p_business_name: result.businessName || result.name || result.title || 'Activity Registration',
          p_url: result.url || 'https://google.com',
          p_provider: result.provider || 'unknown'
        });

      if (planError) {
        console.error('Error generating clean plan data:', planError);
        throw planError;
      }

      if (!planData || planData.length === 0) {
        throw new Error('No plan data generated');
      }

      const cleanPlan = planData[0];
      console.log('✅ Generated clean plan data:', cleanPlan);

      // Create the registration plan with clean data
      const { data: plan, error } = await supabase
        .from('registration_plans')
        .insert({
          id: cleanPlan.plan_id,
          user_id: user.id,
          name: cleanPlan.plan_name,
          url: cleanPlan.plan_url,
          provider: cleanPlan.plan_provider,
          created_from: 'internet_search_v2',
          rules: {
            session_data: {
              selectedDate: result.selectedDate,
              selectedTime: result.selectedTime,
              signupCost: result.signupCost || result.signup_cost,
              totalCost: result.totalCost || result.total_cost,
              businessName: cleanPlan.plan_name,
              location: result.location,
              source: 'internet_search_v2'
            }
          }
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating plan:', error);
        toast.error('Failed to create registration plan');
        return;
      }
      
      console.log('✅ Created clean plan with ID:', plan.id);
      navigate(`/ready-to-signup/${plan.id}`);
      
    } catch (error) {
      console.error('Error in handleSessionSelect:', error);
      toast.error('Failed to process selection. Please try again.');
    }
  };

  console.log('InternetSearchResults is rendering!');
  
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
        Found {processedResults.length} {processedResults.length === 1 ? 'match' : 'matches'} from across the internet
      </div>
      
        {/* Special Carbone Detection - Use direct URL navigation */}
        {processedResults.some(r => 
          r.businessName?.toLowerCase().includes('carbone') || 
          r.name?.toLowerCase().includes('carbone')
        ) && (
          <Card className="p-4 mb-4 border-2 border-red-500 bg-red-50/50">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-bold text-lg text-red-900">🍝 Carbone NYC Found!</h3>
              <Badge variant="destructive" className="text-xs">HIGH DEMAND</Badge>
            </div>
            <p className="text-sm text-red-700 mb-3">
              High-demand Italian restaurant • Books in 30 seconds • 30 days in advance at 10 AM ET
            </p>
              <Button 
                onClick={() => handleSearchResultClick({ businessName: 'Carbone', url: 'https://resy.com/cities/ny/carbone' })}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
              🎯 Set Up Carbone Auto-Booking
            </Button>
          </Card>
        )}
      
      {processedResults.map((result, index) => {
        const { dates, times } = getSessionData(result);
        const selectedSessionDetails = getSelectedSessionDetails(result, index);
        
        // Special Carbone UI
        if (result.businessName === 'Carbone' || result.name === 'Carbone') {
          return (
            <Card key={index} className="p-6 w-full hover:shadow-md transition-shadow border-red-200 bg-red-50/50">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-foreground">Carbone</h2>
                <Badge variant="destructive" className="text-xs">HIGH DEMAND</Badge>
              </div>
              
              <div className="text-sm text-muted-foreground mb-4">
                📍 181 Thompson St, Greenwich Village<br />
                🍝 Italian-American by Major Food Group
              </div>
              
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-900 mb-2">Booking Requirements:</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Opens 30 days ahead at 10 AM ET</li>
                  <li>• Deposit: $50/person (dinner)</li>
                  <li>• Books in under 30 seconds</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => handleSearchResultClick({ businessName: 'Carbone', url: 'https://resy.com/cities/ny/carbone' })}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                Set Up Carbone Auto-Booking →
              </Button>
            </Card>
          );
        }
        
        return (
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
              {dates.length > 1 && (
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
                      {dates.map((date, idx) => (
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

              {times.length > 1 && (
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
                      {times.map((time, idx) => (
                        <SelectItem key={idx} value={time} className="hover:bg-muted">
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="mb-4 space-y-1">
                {selectedSessionDetails ? (
                  <>
                    <p className="text-muted-foreground">
                      Session cost: <span className="font-medium">${selectedSessionDetails.price}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Available spots: <span className="font-medium">{selectedSessionDetails.availability}</span>
                    </p>
                  </>
                ) : (result.signup_cost !== undefined && result.signup_cost !== null) ? (
                  <p className="text-muted-foreground">
                    Due at signup: <span className="font-medium">${result.signup_cost}</span>
                  </p>
                ) : result.estimatedPrice ? (
                  <p className="text-muted-foreground">
                    Estimated Fee: {result.estimatedPrice}
                  </p>
                ) : null}
                
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
                onClick={() => {
                  const data = {
                    id: result.id,
                    businessName: result.businessName || result.name || result.title,
                    url: result.url,
                    provider: detectProvider(result),
                    selectedDate: selectedSessions[index]?.date,
                    selectedTime: selectedSessions[index]?.time,
                    signupCost: selectedSessionDetails?.price || result.signup_cost,
                    totalCost: selectedSessionDetails?.price || result.total_cost
                  };
                  
                  console.log('Navigating with:', data);
                  
                  navigate(`/ready-to-signup/${result.id}`, {
                    state: data
                  });
                }}
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
        );
      })}
      
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
