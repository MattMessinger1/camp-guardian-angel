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
  console.log('🔄 Parsing Perplexity content for query:', query);
  console.log('📄 Raw content length:', content.length);
  console.log('📄 Content preview:', content.substring(0, 500));
  
  if (!content || content.length < 10) {
    console.log('❌ No content to parse');
    return [];
  }

  const results: InternetSearchResult[] = [];
  
  // Split content into lines and look for camp-like entries
  const lines = content.split('\n').filter(line => line.trim().length > 10);
  
  for (let i = 0; i < lines.length && results.length < 5; i++) {
    const line = lines[i].trim();
    
    // Skip headers, bullets, numbers at start but process meaningful content
    if (line.match(/^[\d\.\-\*#]\s*$/) || line.length < 15) {
      continue;
    }
    
    // Look for lines that mention camps, programs, activities
    if (line.toLowerCase().includes('camp') || 
        line.toLowerCase().includes('program') || 
        line.toLowerCase().includes('class') ||
        line.toLowerCase().includes('activity') ||
        line.toLowerCase().includes('lesson') ||
        line.toLowerCase().includes('workshop') ||
        line.toLowerCase().includes('academy')) {
      
      // Extract potential name (everything before a dash, colon, or parenthesis)
      let name = line.split(/[-:()]/)[0].trim();
      // Clean up numbered lists
      name = name.replace(/^\d+\.\s*/, '').replace(/^\*\s*/, '').replace(/^\-\s*/, '');
      
      if (name.length > 50) {
        name = name.substring(0, 50) + '...';
      }
      
      // Try to extract location from the query or line
      let location = extractLocation(line, query);
      
      // Use the full line as description, cleaned up
      let description = line.replace(/^\d+\.?\s*/, '').replace(/^\*\s*/, '').replace(/^\-\s*/, '').trim();
      if (description.length > 150) {
        description = description.substring(0, 150) + '...';
      }
      
      // Try to extract URL if present
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[1] : 'https://example.com/camp-registration';
      
      // Create a proper InternetSearchResult object
      results.push({
        title: name || `${query} Activity ${results.length + 1}`,
        description: description,
        url: url,
        provider: extractProviderFromContent(line) || 'Local Provider',
        estimatedDates: '2025 Summer Sessions',
        estimatedPrice: '$199-699',
        estimatedAgeRange: '6-17',
        location: location,
        confidence: 0.75 + (results.length * 0.05), // Slight variation in confidence
        canAutomate: true,
        automationComplexity: inferComplexity(line)
      });
      
      console.log(`✅ Parsed result ${results.length}:`, results[results.length - 1].title);
    }
  }
  
  // If no structured results found, create results from paragraphs
  if (results.length === 0) {
    console.log('⚠️ No structured results found, creating from paragraphs');
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      const paragraph = paragraphs[i].trim();
      const description = paragraph.length > 150 ? paragraph.substring(0, 150) + '...' : paragraph;
      
      results.push({
        title: `${query} Program ${i + 1}`,
        description: description,
        url: 'https://example.com/camp-registration',
        provider: extractProviderFromContent(paragraph) || 'Local Provider',
        estimatedDates: '2025 Summer Sessions',
        estimatedPrice: '$199-699',
        estimatedAgeRange: '6-17',
        location: extractLocation(paragraph, query),
        confidence: 0.70 + (i * 0.05),
        canAutomate: true,
        automationComplexity: inferComplexity(paragraph)
      });
    }
  }
  
  console.log(`📊 Successfully parsed ${results.length} results from Perplexity content`);
  return results;
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

function extractProviderFromContent(text: string): string {
  // Look for organization names or providers in the text
  const providerPatterns = [
    /([A-Z][a-zA-Z\s]+)\s+(Camp|Academy|Center|Program|Institute|School)/,
    /at\s+([A-Z][a-zA-Z\s]+)/,
    /by\s+([A-Z][a-zA-Z\s]+)/
  ];
  
  for (const pattern of providerPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function inferComplexity(text: string): 'low' | 'medium' | 'high' {
  const lower = text.toLowerCase();
  if (lower.includes('advanced') || lower.includes('competitive') || lower.includes('elite')) {
    return 'high';
  }
  if (lower.includes('intermediate') || lower.includes('skill') || lower.includes('training')) {
    return 'medium';
  }
  return 'low';
}