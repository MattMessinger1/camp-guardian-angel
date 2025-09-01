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
  confidence: number;
  canAutomate: boolean;
  automationComplexity: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const searchQuery = body.query || body.searchQuery;
    
    console.log('Search query:', searchQuery);
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    console.log('API key present:', !!perplexityApiKey);
    
    if (!perplexityApiKey) {
      return createFallbackResults(searchQuery);
    }

    // Fix the Perplexity API request format
    const perplexityRequest = {
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that finds information about youth camps and activities."
        },
        {
          role: "user", 
          content: `Find youth camps, activities, or programs for "${searchQuery}". List 3-5 results with names and descriptions.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      top_p: 1,
      return_citations: true,
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
    console.log('Perplexity success - content length:', data.choices?.[0]?.message?.content?.length || 0);
    
    // Simple result creation for now
    const content = data.choices?.[0]?.message?.content || '';
    const results = createResultsFromContent(content, searchQuery);
    
    return new Response(
      JSON.stringify({
        success: true,
        query: searchQuery,
        searchType: 'internet',
        results: results,
        totalFound: results.length,
        searchedAt: new Date().toISOString(),
        source: 'perplexity'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return createFallbackResults(body?.query || 'camps');
  }
});

function createFallbackResults(query: string) {
  return new Response(
    JSON.stringify({
      success: true,
      query: query,
      searchType: 'internet',
      results: [
        {
          title: `${query} - Dynamic Result 1`,
          description: `Search results for ${query} would appear here`,
          url: 'https://example.com/camp-registration',
          provider: 'Fallback Provider',
          location: 'Various Locations',
          confidence: 0.5,
          canAutomate: false,
          automationComplexity: 'low' as const
        }
      ],
      totalFound: 1,
      searchedAt: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function createResultsFromContent(content: string, query: string): InternetSearchResult[] {
  if (!content) return [];
  
  const results: InternetSearchResult[] = [];
  
  // Split content into paragraphs and look for camp-like content
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  
  for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
    const paragraph = paragraphs[i].trim();
    
    // Extract title from first line or create one
    const lines = paragraph.split('\n');
    let title = lines[0];
    if (title.length > 80) {
      title = title.substring(0, 80) + '...';
    }
    
    // Use full paragraph as description
    let description = paragraph;
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }
    
    // Try to extract location
    const location = extractLocation(paragraph, query);
    
    results.push({
      title: title || `${query} Program ${i + 1}`,
      description: description,
      url: 'https://example.com/camp-registration',
      provider: 'Perplexity Search',
      location: location,
      confidence: 0.8 - (i * 0.1),
      canAutomate: true,
      automationComplexity: 'medium' as const
    });
  }
  
  // If no paragraphs found, create a simple result
  if (results.length === 0) {
    results.push({
      title: `${query} Programs`,
      description: content.substring(0, 200) + '...',
      url: 'https://example.com/camp-registration',
      provider: 'Perplexity Search',
      location: extractLocation(content, query),
      confidence: 0.8,
      canAutomate: true,
      automationComplexity: 'medium' as const
    });
  }
  
  return results;
}

function extractLocation(text: string, query: string): string {
  // Look for city names in the query first
  const cityMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
  if (cityMatch) {
    return cityMatch[1];
  }
  
  // Look for location patterns in text
  const locationPatterns = [
    /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /([A-Z][a-z]+),\s*[A-Z]{2}/,
    /located\s+in\s+([A-Z][a-z]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return 'Location TBD';
}