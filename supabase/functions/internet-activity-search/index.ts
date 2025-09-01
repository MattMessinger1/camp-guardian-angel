
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SearchRequest {
  query: string;
  location?: string;
  dateRange?: string;
  ageRange?: string;
  limit?: number;
}

interface InternetSearchResult {
  title: string;
  description: string;
  url: string;
  provider: string;
  estimatedDates?: string;
  estimatedPrice?: string;
  estimatedAgeRange?: string;
  location?: string;
  session_dates?: string[];
  session_times?: string[];
  street_address?: string;
  signup_cost?: number;
  total_cost?: number;
  confidence: number;
  canAutomate: boolean;
  automationComplexity: 'low' | 'medium' | 'high';
}

function getDateRange() {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 60);
  
  return {
    start: today.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const searchQuery = body.query || body.searchQuery;
    const dateRange = getDateRange();
    
    console.log('Search query:', searchQuery);
    console.log('Date range filter:', dateRange);
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    console.log('API key present:', !!perplexityApiKey);
    
    if (!perplexityApiKey) {
      return createFallbackResults(searchQuery);
    }

    // Perplexity API request for structured JSON response
    const perplexityRequest = {
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{
        role: "user",
        content: `Find spinning studios in "${searchQuery}" happening between ${dateRange.start} and ${dateRange.end} and return as valid JSON array:
        [{"name": "Studio Name", "address": "Full street address", "price_per_class": 35, "description": "Class details", "website": "registration URL", "session_dates": ["2025-09-15"], "session_times": ["9:00 AM"]}]`
      }],
      max_tokens: 1000,
      temperature: 0.1,
      top_p: 1,
      return_citations: false,
      return_images: false,
      return_related_questions: false
    };

    console.log('Making Perplexity request...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(perplexityRequest)
    });

    console.log('Perplexity response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      // Return fallback results instead of failing
      return createFallbackResults(searchQuery);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('Perplexity JSON response:', content);
    
    // Try to parse JSON directly from Perplexity response
    let results: InternetSearchResult[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Convert Perplexity format to our expected format
        results = parsedData.map((item: any, index: number) => ({
          title: item.name || `${searchQuery} Program`,
          description: item.description || 'Spinning class details',
          url: item.website || 'https://example.com/camp-registration',
          provider: item.name || 'Activity Provider',
          location: extractCityFromAddress(item.address) || 'Location TBD',
          session_dates: item.session_dates || [dateRange.start],
          session_times: item.session_times || ['TBD'],
          street_address: item.address || 'Address TBD',
          signup_cost: item.price_per_class || 0,
          total_cost: item.price_per_class || 0,
          confidence: 0.9 - (index * 0.1),
          canAutomate: true,
          automationComplexity: 'medium' as const
        }));
        
        console.log('Successfully parsed Perplexity JSON:', results.length, 'items');
      } else {
        console.log('No JSON found in Perplexity response, using fallback');
        results = createFallbackResultsArray(searchQuery, dateRange);
      }
    } catch (parseError) {
      console.error('Failed to parse Perplexity JSON:', parseError);
      results = createFallbackResultsArray(searchQuery, dateRange);
    }
    
    console.log('Final results count:', results.length);
    console.log('Final parsed results:', results.map(r => ({
      title: r.title,
      provider: r.provider,
      location: r.location,
      street_address: r.street_address,
      signup_cost: r.signup_cost,
      total_cost: r.total_cost,
      session_dates: r.session_dates,
      session_times: r.session_times,
      confidence: r.confidence
    })));
    
    return new Response(
      JSON.stringify({
        success: true,
        query: searchQuery,
        searchType: 'internet',
        results: results,
        totalFound: results.length,
        searchedAt: new Date().toISOString(),
        source: 'perplexity',
        dateRange
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return createFallbackResults(body?.query || 'camps');
  }
});

function extractCityFromAddress(address: string): string {
  if (!address) return 'Location TBD';
  
  // Extract city/neighborhood from address
  const locationPatterns = [
    /\b(Manhattan|Brooklyn|Queens|Bronx|Staten Island)\b/i,
    /\b(Upper East Side|Upper West Side|Midtown|Downtown|Bryant Park|Times Square)\b/i,
    /,\s*([A-Z][a-z]+)\s*,?\s*(?:NY|New York)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = address.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return 'New York';
}

function createFallbackResultsArray(query: string, dateRange: { start: string; end: string }): InternetSearchResult[] {
  return [{
    title: `${query} - Upcoming Program`,
    description: `Search results for ${query} happening in the next 60 days would appear here`,
    url: 'https://example.com/camp-registration',
    provider: 'Fallback Provider',
    location: 'Various Locations',
    session_dates: [dateRange.start],
    session_times: ['9:00 AM'],
    street_address: 'Address TBD',
    signup_cost: 0,
    total_cost: 0,
    confidence: 0.5,
    canAutomate: false,
    automationComplexity: 'low' as const
  }];
}

function createFallbackResults(query: string) {
  const dateRange = getDateRange();
  
  return new Response(
    JSON.stringify({
      success: true,
      query: query,
      searchType: 'internet',
      results: [
        {
          title: `${query} - Upcoming Program`,
          description: `Search results for ${query} happening in the next 60 days would appear here`,
          url: 'https://example.com/camp-registration',
          provider: 'Fallback Provider',
          location: 'Various Locations',
          session_dates: [dateRange.start],
          session_times: ['9:00 AM'],
          street_address: 'Address TBD',
          signup_cost: 0,
          total_cost: 0,
          confidence: 0.5,
          canAutomate: false,
          automationComplexity: 'low' as const
        }
      ],
      totalFound: 1,
      searchedAt: new Date().toISOString(),
      dateRange
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

