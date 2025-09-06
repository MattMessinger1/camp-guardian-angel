import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, Zap, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { ProviderLoadingBadge, ProviderDetectingBadge, LoadingProgress } from "@/components/ui/provider-loading";
import { extractUrl, generateFallbackUrl } from "@/utils/urlExtraction";
import { detectProviderFast, detectProvidersAsync } from "@/utils/asyncProviderDetection";
import { useState, useEffect } from "react";

// Helper function to extract Jackrabbit org ID from URL or business name
function extractJackrabbitOrgId(input: string): string | null {
  // Try to extract from URL patterns like https://abc123.jackrabbitclass.com
  const urlMatch = input.match(/https?:\/\/([^.]+)\.jackrabbitclass\.com/i);
  if (urlMatch) return urlMatch[1];
  
  // Try to extract from business name if it contains an org ID pattern  
  const nameMatch = input.match(/\b([a-zA-Z0-9]{3,})\b/);
  if (nameMatch) return nameMatch[1].toLowerCase();
  
  return null;
}

// Removed - using generateFallbackUrl from urlExtraction utility

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
    const tempDisplayId = `temp-${index}`;
    const extractedUrl = extractUrl(result);
    
    console.log('🔗 URL extraction:', {
      name: result.businessName || result.name,
      extractedUrl,
      originalFields: { url: result.url, signup_url: result.signup_url }
    });
    
    return {
      ...result,
      id: tempDisplayId,
      session_id: null,
      businessName: result.businessName || result.name,
      url: extractedUrl || undefined,
      signup_url: extractedUrl || undefined, 
      providerUrl: extractedUrl || undefined,
      provider: detectProviderFast(result) // Fast sync detection for immediate render
    };
  });
};

// Removed - using detectProviderFast from asyncProviderDetection utility

export function InternetSearchResults({ results, extractedTime, onSelect }: InternetSearchResultsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for async provider detection
  const [providerDetections, setProviderDetections] = useState<Map<number, any>>(new Map());
  const [isDetecting, setIsDetecting] = useState(true);
  
  // Process results to ensure unique IDs
  const processedResults = processSearchResults(results);
  
  // Run async provider detection in background
  useEffect(() => {
    if (processedResults.length === 0) return;
    
    setIsDetecting(true);
    detectProvidersAsync(processedResults)
      .then(detections => {
        setProviderDetections(detections);
        setIsDetecting(false);
      })
      .catch(error => {
        console.error('Provider detection failed:', error);
        setIsDetecting(false);
      });
  }, [results]);

  const handleSearchResultClick = (result: any) => {
    // Clear any cached session data first including Carbone-related data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('carbone_booking_state');
    localStorage.removeItem('bookingState');
    sessionStorage.clear();
    console.log('✅ Cleared all cached session data including Carbone state');
    
    // Extract URL using optimized utility
    const extractedUrl = extractUrl(result) || generateFallbackUrl(result.businessName || result.name || '');
    
    console.log('🔗 handleSearchResultClick URL extraction:', {
      name: result.businessName || result.name,
      extractedUrl
    });
    
    // Create fresh session data
    const freshData = {
      id: `${result.businessName || result.name}-${Date.now()}`,
      businessName: result.businessName || result.name,
      url: extractedUrl,
      provider: result.businessName?.includes('Carbone') ? 'resy' : detectProviderFast(result)
    };
    
    console.log('🎯 NAVIGATION DEBUG - Click detected with fresh data:', freshData);
    
    if (!user?.id) {
      console.error('No user ID!');
      toast.error('Please sign in first');
      return;
    }
    
    // Check if this is a Jackrabbit provider - route to class browser
    if (freshData.businessName?.toLowerCase().includes('jackrabbit') || 
        freshData.url?.includes('jackrabbitclass.com') ||
        freshData.provider === 'jackrabbit_class') {
      console.log('🎓 Jackrabbit detected - navigating to class browser');
      const orgId = extractJackrabbitOrgId(freshData.url || freshData.businessName || '');
      if (orgId) {
        navigate(`/jackrabbit/classes/${orgId}`, { 
          state: { businessName: freshData.businessName, provider: 'jackrabbit_class' }
        });
        return;
      }
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

  // Show loading state while detecting providers
  if (isDetecting && processedResults.length > 0) {
    return (
      <LoadingProgress 
        message="Analyzing providers and optimizing results..." 
        progress={50}
      />
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
        // Get enhanced provider detection result
        const detection = providerDetections.get(index);
        const provider = detection?.provider || result.provider;
        const confidence = detection?.confidence || 'low';
        
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
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {result.businessName || result.name || result.title}
                </h2>
                {isDetecting ? (
                  <ProviderDetectingBadge size="sm" />
                ) : (
                  <ProviderBadge platform={provider} size="sm" />
                )}
              </div>
              
              {/* Location - simplified and corrected */}
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="h-4 w-4" />
                <span>
                  {result.location || result.street_address || 'Location not specified'}
                </span>
              </div>
            </div>
            
            <div className="ml-6">
              <Button 
                onClick={() => handleSearchResultClick(result)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                <Zap className="h-4 w-4 mr-2" />
                Choose Your Session
              </Button>
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
              These camps were found by searching the entire internet. When you click "Choose Your Session", 
              we'll help you find and set up your session registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
