
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

    // Updated Perplexity API request format with date filtering
    const perplexityRequest = {
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that finds information about youth camps and activities happening in the next 60 days."
        },
        {
          role: "user", 
          content: `Find youth camps, activities, or programs for "${searchQuery}" happening between ${dateRange.start} and ${dateRange.end}. Include specific dates, times, addresses, and costs when available. List 3-5 results with names, descriptions, dates, and pricing.`
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

function createResultsFromContent(content: string, query: string): InternetSearchResult[] {
  if (!content) return [];
  
  const results: InternetSearchResult[] = [];
  const dateRange = getDateRange();
  
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
    
    // Try to extract location and pricing
    const location = extractLocation(paragraph, query);
    const pricing = extractPricing(paragraph);
    const dates = extractDates(paragraph, dateRange);
    
    results.push({
      title: title || `${query} Program ${i + 1}`,
      description: description,
      url: 'https://example.com/camp-registration',
      provider: 'Perplexity Search',
      location: location,
      session_dates: dates.dates,
      session_times: dates.times,
      street_address: extractAddress(paragraph) || 'Address TBD',
      signup_cost: pricing.signup || 0,
      total_cost: pricing.total || 0,
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
      session_dates: [dateRange.start],
      session_times: ['TBD'],
      street_address: 'Address TBD',
      signup_cost: 0,
      total_cost: 0,
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

function extractPricing(text: string): { signup: number; total: number } {
  const pricePatterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/gi
  ];
  
  const prices: number[] = [];
  
  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0 && price < 10000) { // Reasonable price range
        prices.push(price);
      }
    }
  }
  
  if (prices.length > 0) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return {
      signup: minPrice,
      total: maxPrice > minPrice ? maxPrice : minPrice
    };
  }
  
  return { signup: 0, total: 0 };
}

function extractDates(text: string, dateRange: { start: string; end: string }): { dates: string[]; times: string[] } {
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi
  ];
  
  const timePatterns = [
    /\b(\d{1,2}:\d{2}\s*(?:AM|PM))\b/gi,
    /\b(\d{1,2}\s*(?:AM|PM))\b/gi
  ];
  
  const dates: string[] = [];
  const times: string[] = [];
  
  // Extract dates
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        dates.push(match[1]);
      } else if (match[2] && match[3] && match[4]) {
        // Handle month name format
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
        if (monthIndex >= 0) {
          const date = new Date(parseInt(match[4]), monthIndex, parseInt(match[3]));
          dates.push(date.toISOString().split('T')[0]);
        }
      }
    }
  }
  
  // Extract times
  for (const pattern of timePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      times.push(match[1]);
    }
  }
  
  // Filter dates to only include those within our 60-day range
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const filteredDates = dates.filter(dateStr => {
    const date = new Date(dateStr);
    return date >= startDate && date <= endDate;
  });
  
  return {
    dates: filteredDates.length > 0 ? filteredDates : [dateRange.start],
    times: times.length > 0 ? times : ['TBD']
  };
}

function extractAddress(text: string): string | null {
  const addressPatterns = [
    /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)\b/gi,
    /\b[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)\s+\d+\b/gi
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}
