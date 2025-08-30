import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

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
  confidence: number;
  canAutomate: boolean;
  automationComplexity: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  console.log('=== INTERNET ACTIVITY SEARCH ===');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const body = await req.json() as SearchRequest;
    
    console.log('Internet search request:', body);

    // Build enhanced search query for Perplexity
    const searchQuery = buildSearchQuery(body);
    console.log('Enhanced search query:', searchQuery);

    // Search the internet using Perplexity
    const searchResults = await searchWithPerplexity(perplexityApiKey, searchQuery);
    console.log('Raw search results:', searchResults);

    // Process and structure the results
    const structuredResults = await processSearchResults(searchResults, body);
    console.log('Structured results:', structuredResults);

    // Log the search for analytics
    await logInternetSearch(supabase, body, structuredResults.length);

    return new Response(
      JSON.stringify({
        success: true,
        query: body.query,
        searchType: 'internet',
        results: structuredResults,
        totalFound: structuredResults.length,
        searchedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Internet search error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internet search failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function buildSearchQuery(request: SearchRequest): string {
  const { query, location, dateRange, ageRange } = request;
  
  let searchQuery = `${query}`;
  
  // Add location if specified
  if (location) {
    searchQuery += ` in ${location}`;
  }
  
  // Add temporal context
  if (dateRange) {
    searchQuery += ` ${dateRange}`;
  } else {
    searchQuery += ` 2025 summer camps`;
  }
  
  // Add age context if specified
  if (ageRange) {
    searchQuery += ` for ages ${ageRange}`;
  }
  
  // Add specific search terms to find registerable activities
  searchQuery += ` registration signup enrollment sign up`;
  
  return searchQuery;
}

async function searchWithPerplexity(apiKey: string, query: string) {
  console.log('Searching with Perplexity:', query);
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: `You are a camp and activity finder. Search for camps, classes, programs, and activities that match the user's query. Focus on finding:
          1. Specific camp/program names and organizations
          2. Their official websites
          3. Registration/signup information
          4. Dates, ages, and pricing when available
          5. Location details

          Return results in a structured format with clear titles, descriptions, websites, and practical details for registration.`
        },
        {
          role: 'user',
          content: `Find camps and activities for: ${query}. 
          
          Please provide specific camps/programs with:
          - Organization/camp name
          - Official website URL
          - Brief description
          - Registration details
          - Dates and pricing if available
          - Age ranges
          - Location`
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 2000,
      return_images: false,
      return_related_questions: false,
      search_recency_filter: 'month'
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function processSearchResults(rawResults: string, originalQuery: SearchRequest): Promise<InternetSearchResult[]> {
  console.log('Processing raw search results...');
  
  // Extract structured information from the Perplexity response
  const results: InternetSearchResult[] = [];
  
  // Parse the response to extract camp information
  // This is a simplified parser - you could make this more sophisticated
  const lines = rawResults.split('\n');
  let currentResult: Partial<InternetSearchResult> = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    // Look for camp/organization names (usually in headers or bold)
    if (trimmedLine.match(/^\d+\.|^[*-]|\*\*.*\*\*|^#{1,3}/)) {
      // Save previous result if we have one
      if (currentResult.title && currentResult.url) {
        results.push(finalizeResult(currentResult));
      }
      
      // Start new result
      currentResult = {
        title: extractTitle(trimmedLine),
        confidence: 0.7,
        canAutomate: true,
        automationComplexity: 'medium'
      };
    }
    
    // Look for URLs
    const urlMatch = trimmedLine.match(/https?:\/\/[^\s)]+/);
    if (urlMatch && !currentResult.url) {
      currentResult.url = urlMatch[0];
    }
    
    // Look for descriptions
    if (!trimmedLine.match(/^\d+\.|^[*-]|\*\*.*\*\*|^#{1,3}/) && trimmedLine.length > 20) {
      if (!currentResult.description) {
        currentResult.description = trimmedLine;
      }
    }
  }
  
  // Don't forget the last result
  if (currentResult.title && currentResult.url) {
    results.push(finalizeResult(currentResult));
  }
  
  // If parsing didn't work well, create some synthetic results from the text
  if (results.length === 0) {
    return createFallbackResults(rawResults, originalQuery);
  }
  
  return results.slice(0, originalQuery.limit || 10);
}

function extractTitle(line: string): string {
  // Remove markdown formatting and numbering
  return line.replace(/^\d+\.\s*/, '')
    .replace(/^[*-]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,3}\s*/, '')
    .trim();
}

function finalizeResult(result: Partial<InternetSearchResult>): InternetSearchResult {
  return {
    title: result.title || 'Activity Found',
    description: result.description || 'Activity description not available',
    url: result.url || '',
    provider: extractProvider(result.url || ''),
    confidence: result.confidence || 0.7,
    canAutomate: true,
    automationComplexity: assessComplexity(result.url || ''),
    ...result
  } as InternetSearchResult;
}

function extractProvider(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '').split('.')[0];
  } catch {
    return 'Unknown Provider';
  }
}

function assessComplexity(url: string): 'low' | 'medium' | 'high' {
  const domain = url.toLowerCase();
  
  // Known easy providers
  if (domain.includes('ymca') || domain.includes('recreation.gov')) {
    return 'low';
  }
  
  // Known complex providers
  if (domain.includes('campusrecreation') || domain.includes('.edu')) {
    return 'high';
  }
  
  return 'medium';
}

function createFallbackResults(rawText: string, query: SearchRequest): InternetSearchResult[] {
  // Extract any URLs from the text as fallback results
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const urls = rawText.match(urlRegex) || [];
  
  return urls.slice(0, 5).map((url, index) => ({
    title: `Activity Option ${index + 1}`,
    description: `Found through internet search for: ${query.query}`,
    url: url,
    provider: extractProvider(url),
    confidence: 0.6,
    canAutomate: true,
    automationComplexity: 'medium' as const
  }));
}

async function logInternetSearch(supabase: any, query: SearchRequest, resultCount: number) {
  try {
    await supabase.from('compliance_audit').insert({
      event_type: 'INTERNET_ACTIVITY_SEARCH',
      event_data: {
        query: query.query,
        location: query.location,
        dateRange: query.dateRange,
        ageRange: query.ageRange,
        resultsFound: resultCount,
        timestamp: new Date().toISOString()
      },
      payload_summary: `Internet search: "${query.query}" found ${resultCount} results`
    });
  } catch (error) {
    console.error('Failed to log internet search:', error);
  }
}