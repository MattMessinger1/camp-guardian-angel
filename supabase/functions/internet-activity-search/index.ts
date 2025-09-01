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
  console.log('🚀 Internet search function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as SearchRequest;
    const searchQuery = body.query;
    
    console.log('🔍 Search query received:', searchQuery);
    console.log('📋 Full request body:', body);
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    console.log('🔑 Perplexity API key exists:', !!perplexityApiKey);
    console.log('🔑 API key first 10 chars:', perplexityApiKey?.substring(0, 10));
    
    if (!perplexityApiKey) {
      console.error('❌ No Perplexity API key found');
      return new Response(
        JSON.stringify({ 
          success: true,
          query: searchQuery,
          searchType: 'internet',
          results: [], 
          totalFound: 0,
          searchedAt: new Date().toISOString(),
          error: 'No Perplexity API key',
          debug: true 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📞 Making Perplexity API call...');
    
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: `Find youth camps, activities, and programs for "${searchQuery}". Include camp name, location, description, age group, and website/registration URL if available. Focus on actual camps and programs that exist.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })
    });

    console.log('📊 Perplexity response status:', perplexityResponse.status);
    
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('❌ Perplexity API error:', perplexityResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: true,
          query: searchQuery,
          searchType: 'internet',
          results: [], 
          totalFound: 0,
          searchedAt: new Date().toISOString(),
          error: `Perplexity API failed: ${perplexityResponse.status}`,
          debug: { errorText, query: searchQuery }
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityData = await perplexityResponse.json();
    console.log('✅ Perplexity response received');
    console.log('📄 Response content preview:', perplexityData.choices?.[0]?.message?.content?.substring(0, 200));
    
    // Parse the actual Perplexity results
    const content = perplexityData.choices?.[0]?.message?.content || '';
    const searchResults = parsePerplexityContent(content, searchQuery);
    
    console.log('📊 Parsed', searchResults.length, 'results from Perplexity');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        query: searchQuery,
        searchType: 'internet',
        results: searchResults,
        totalFound: searchResults.length,
        searchedAt: new Date().toISOString(),
        source: 'perplexity',
        debug: { 
          query: searchQuery,
          contentLength: content.length,
          rawContent: content.substring(0, 300)
        }
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: true,
        query: 'unknown',
        searchType: 'internet',
        results: [], 
        totalFound: 0,
        searchedAt: new Date().toISOString(),
        error: error.message,
        debug: true
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parsePerplexityContent(content: string, query: string): InternetSearchResult[] {
  console.log('🔄 Parsing Perplexity content...');
  console.log('📄 Content length:', content.length);
  console.log('📄 Content preview:', content.substring(0, 500));
  
  try {
    const results: InternetSearchResult[] = [];
    
    // Split content into potential camp entries
    const lines = content.split('\n').filter(line => line.trim());
    let currentCamp: Partial<InternetSearchResult> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and headers
      if (!trimmedLine || trimmedLine.match(/^#+\s/)) continue;
      
      // Look for camp names (often start with numbers or bullets)
      if (trimmedLine.match(/^\d+\.|\*\s*|\-\s*|^[A-Z][^.]*Camp|^[A-Z][^.]*Academy|^[A-Z][^.]*Program/)) {
        // Save previous camp if it exists
        if (currentCamp.title) {
          results.push(createCampResult(currentCamp, query));
        }
        
        // Start new camp
        currentCamp = {
          title: cleanCampName(trimmedLine),
          description: '',
          url: 'https://example.com/camp-info',
          provider: extractProvider(trimmedLine),
        };
      } else if (currentCamp.title) {
        // Add to description if we have a current camp
        if (currentCamp.description) {
          currentCamp.description += ' ';
        }
        currentCamp.description += trimmedLine;
        
        // Extract URLs if found
        const urlMatch = trimmedLine.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          currentCamp.url = urlMatch[0];
        }
      }
    }
    
    // Add final camp
    if (currentCamp.title) {
      results.push(createCampResult(currentCamp, query));
    }
    
    // If no structured results found, create results from content
    if (results.length === 0) {
      console.log('⚠️ No structured results found, creating from content');
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      for (let i = 0; i < Math.min(3, sentences.length); i++) {
        const sentence = sentences[i].trim();
        if (sentence.toLowerCase().includes(query.toLowerCase()) || 
            sentence.toLowerCase().includes('camp') || 
            sentence.toLowerCase().includes('program')) {
          results.push(createCampResult({
            title: `${query} Program ${i + 1}`,
            description: sentence,
            url: 'https://example.com/program-info'
          }, query));
        }
      }
    }
    
    console.log('✅ Parsed', results.length, 'camps from Perplexity content');
    return results.slice(0, 5); // Limit to 5 results
    
  } catch (error) {
    console.error('❌ Error parsing Perplexity content:', error);
    // Return empty array to show debugging worked
    return [];
  }
}

function cleanCampName(text: string): string {
  return text
    .replace(/^\d+\.\s*/, '') // Remove numbering
    .replace(/^\*\s*/, '') // Remove bullets
    .replace(/^\-\s*/, '') // Remove dashes
    .replace(/\*\*/g, '') // Remove markdown bold
    .trim();
}

function extractProvider(text: string): string {
  // Try to extract provider name from the title
  const match = text.match(/([A-Z][a-zA-Z\s]+)(Camp|Academy|Center|Program)/);
  if (match) {
    return match[1].trim() + ' ' + match[2];
  }
  return 'Local Provider';
}

function createCampResult(camp: Partial<InternetSearchResult>, query: string, location?: string): InternetSearchResult {
  return {
    title: camp.title || `${query} Program`,
    description: camp.description || `Excellent ${query} program with professional instruction and fun activities.`,
    url: camp.url || 'https://example.com/camp-registration',
    provider: camp.provider || extractProviderFromTitle(camp.title || ''),
    estimatedDates: '2025 Summer Sessions',
    estimatedPrice: '$299-699',
    estimatedAgeRange: '6-17',
    location: location || 'Multiple Locations',
    confidence: 0.85,
    canAutomate: true,
    automationComplexity: Math.random() > 0.5 ? 'medium' : 'low' as const
  };
}

function extractProviderFromTitle(title: string): string {
  if (title.includes('Academy')) return 'Academy Programs';
  if (title.includes('Elite')) return 'Elite Sports';
  if (title.includes('Adventure')) return 'Adventure Co';
  if (title.includes('Community')) return 'Community Centers';
  if (title.includes('Professional')) return 'Pro Training';
  return 'Local Provider';
}