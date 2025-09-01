
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
    const content = data.choices?.[0]?.message?.content || '';
    
    // Detailed logging for debugging
    console.log('Full Perplexity content received:', content);
    console.log('Content length:', content.length);
    console.log('Perplexity response structure:', JSON.stringify(data, null, 2));
    
    if (data.citations) {
      console.log('Citations found:', data.citations.length);
      console.log('Citations:', JSON.stringify(data.citations, null, 2));
    }
    
    // Process with OpenAI for enhanced parsing
    console.log('Sending to OpenAI for parsing:', {
      query: searchQuery,
      contentPreview: content.substring(0, 200)
    });
    
    const openaiResult = await processWithOpenAI(content, searchQuery);
    console.log('OpenAI parsing result:', JSON.stringify(openaiResult, null, 2));
    
    // Use OpenAI results if available, otherwise fall back to basic parsing
    const results = openaiResult && openaiResult.length > 0 
      ? openaiResult 
      : createResultsFromContent(content, searchQuery);
      
    console.log('Final results count:', results.length);
    console.log('First result sample:', results[0] ? JSON.stringify(results[0], null, 2) : 'No results');
    
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
  
  // Enhanced parsing: Split by common delimiters for separate programs
  const sections = content.split(/\n(?=\d+\.|\*\*|## |### )|(?:\n\s*\n)+/).filter(s => s.trim().length > 30);
  
  for (let i = 0; i < Math.min(sections.length, 5); i++) {
    const section = sections[i].trim();
    
    // Extract provider name (business name, gym name, etc.)
    const providerName = extractProviderName(section, query);
    
    // Create title from provider name and program type
    const title = createTitle(section, providerName, query);
    
    // Clean description
    const description = createDescription(section);
    
    // Extract structured data
    const location = extractLocation(section, query);
    const pricing = extractPricing(section);
    const dates = extractDates(section, dateRange);
    const address = extractAddress(section);
    
    results.push({
      title: title,
      description: description,
      url: extractUrl(section) || 'https://example.com/camp-registration',
      provider: providerName,
      location: location,
      session_dates: dates.dates,
      session_times: dates.times,
      street_address: address || 'Address TBD',
      signup_cost: pricing.signup || 0,
      total_cost: pricing.total || 0,
      confidence: 0.9 - (i * 0.1),
      canAutomate: true,
      automationComplexity: 'medium' as const
    });
  }
  
  // If no good sections found, try basic paragraph parsing
  if (results.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      const paragraph = paragraphs[i].trim();
      const providerName = extractProviderName(paragraph, query);
      
      results.push({
        title: createTitle(paragraph, providerName, query),
        description: createDescription(paragraph),
        url: 'https://example.com/camp-registration',
        provider: providerName,
        location: extractLocation(paragraph, query),
        session_dates: extractDates(paragraph, dateRange).dates,
        session_times: extractDates(paragraph, dateRange).times,
        street_address: extractAddress(paragraph) || 'Address TBD',
        signup_cost: extractPricing(paragraph).signup || 0,
        total_cost: extractPricing(paragraph).total || 0,
        confidence: 0.8 - (i * 0.1),
        canAutomate: true,
        automationComplexity: 'medium' as const
      });
    }
  }
  
  return results;
}

function extractProviderName(text: string, query: string): string {
  // Look for business names, gym names, organization names
  const businessPatterns = [
    // Direct business names (SoulCycle, NYU Athletics, etc.)
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Athletics|Fitness|Gym|Studio|Center|Club|Academy|School)))\b/g,
    // Names with location (SoulCycle Bryant Park)
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Bryant Park|Times Square|Upper East Side|Downtown|Midtown)/g,
    // Organization names
    /\b([A-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*)\b/g,
    // Studio/Center names
    /\b([A-Z][a-zA-Z]+\s+(?:Studio|Center|Gym|Fitness|Club))\b/g
  ];
  
  for (const pattern of businessPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const name = match[1];
      // Filter out common words that aren't business names
      if (name && !['The', 'And', 'For', 'With', 'New York', 'York'].includes(name)) {
        return name;
      }
    }
  }
  
  // Fallback: look for capitalized words
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    if (word1.match(/^[A-Z][a-z]+$/) && word2.match(/^[A-Z][a-z]+$/)) {
      return `${word1} ${word2}`;
    }
  }
  
  return 'Activity Provider';
}

function createTitle(text: string, providerName: string, query: string): string {
  // Look for specific program or class names
  const programPatterns = [
    new RegExp(`${providerName}\\s+([A-Z][a-zA-Z\\s]+)`, 'i'),
    /\b(spin|yoga|fitness|dance|swimming|tennis|basketball|soccer|football|baseball|camp)\s+(?:class|program|session|camp|clinic|lessons?)\b/gi,
    /\b([A-Z][a-zA-Z\\s]{5,30})\s+(?:class|program|session|camp|clinic|lessons?)\b/gi
  ];
  
  for (const pattern of programPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `${providerName} ${match[1].trim()}`;
    }
  }
  
  // If provider name looks like it already includes the program type, use it
  if (providerName.includes(query.toLowerCase()) || query.toLowerCase().includes(providerName.toLowerCase())) {
    return providerName;
  }
  
  // Create title from query and provider
  return `${providerName} ${query}`;
}

function createDescription(text: string): string {
  // Clean up the text for description
  let description = text.replace(/^\d+\.\s*/, ''); // Remove list numbers
  description = description.replace(/^\*\*([^*]+)\*\*\s*/, ''); // Remove markdown bold headers
  description = description.replace(/^#{1,6}\s+[^\n]+\n/, ''); // Remove markdown headers
  
  // Limit length
  if (description.length > 250) {
    description = description.substring(0, 250) + '...';
  }
  
  return description.trim();
}

function extractUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

function extractLocation(text: string, query: string): string {
  // Enhanced location extraction patterns
  const locationPatterns = [
    // NYC neighborhoods and specific areas
    /\b(Bryant Park|Times Square|Upper East Side|Upper West Side|Downtown|Midtown|Brooklyn|Queens|Bronx|Staten Island|Manhattan)\b/gi,
    // City, State format
    /\b([A-Z][a-z]+),\s*([A-Z]{2})\b/g,
    // "in [City]" format
    /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    // "located in/at [Location]"
    /located\s+(?:in|at)\s+([A-Z][a-zA-Z\s]+)/gi,
    // Address-based location extraction
    /\b([A-Z][a-z]+),?\s+(?:New York|NY)\b/gi
  ];
  
  for (const pattern of locationPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const location = match[1];
      if (location && location.length > 2) {
        return location;
      }
    }
  }
  
  // Look for city names in the query
  const queryLocationMatch = query.match(/\b(NYC|New York|Manhattan|Brooklyn|Queens|Bronx|[A-Z][a-z]+)\b/);
  if (queryLocationMatch) {
    return queryLocationMatch[1] === 'NYC' ? 'New York' : queryLocationMatch[1];
  }
  
  return 'Location TBD';
}

function extractPricing(text: string): { signup: number; total: number } {
  const pricePatterns = [
    // Standard dollar amounts
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    // Per class/session pricing
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+class|per\s+session|each)/gi,
    // Deposit/registration fees
    /(?:deposit|registration|signup|fee).*?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    // Total cost indicators
    /(?:total|full\s+cost|complete\s+cost).*?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi
  ];
  
  const prices: number[] = [];
  const signupPrices: number[] = [];
  const totalPrices: number[] = [];
  
  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0 && price < 10000) { // Reasonable price range
        prices.push(price);
        
        // Categorize pricing based on context
        const context = match[0].toLowerCase();
        if (context.includes('deposit') || context.includes('registration') || context.includes('signup')) {
          signupPrices.push(price);
        } else if (context.includes('total') || context.includes('full') || context.includes('complete')) {
          totalPrices.push(price);
        }
      }
    }
  }
  
  if (prices.length > 0) {
    let signup = 0;
    let total = 0;
    
    // Determine signup cost (usually the smaller amount or specific deposit)
    if (signupPrices.length > 0) {
      signup = Math.min(...signupPrices);
    } else {
      signup = Math.min(...prices);
    }
    
    // Determine total cost (usually the larger amount or specific total)
    if (totalPrices.length > 0) {
      total = Math.max(...totalPrices);
    } else if (prices.length > 1) {
      total = Math.max(...prices);
    } else {
      total = signup; // Same amount for both if only one price found
    }
    
    return { signup, total };
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
    // Standard street addresses with numbers
    /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)(?:\s*,?\s*[\w\s]*)?)\b/gi,
    // Broadway and other major NYC streets
    /\b(\d+\s+Broadway(?:\s*,?\s*[\w\s]*)?)\b/gi,
    // Named locations with addresses
    /\b([\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)\s*,?\s*(?:New York|NYC|NY))\b/gi,
    // Building/venue names with addresses
    /(?:at|located at)\s+([^,\n]+(?:\d+|Street|St|Avenue|Ave|Broadway)[^,\n]*)/gi
  ];
  
  for (const pattern of addressPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const address = match[1].trim();
      if (address && address.length > 5) {
        // Clean up the address
        return address.replace(/\s+/g, ' ').replace(/,$/, '');
      }
    }
  }
  
  return null;
}

async function processWithOpenAI(content: string, searchQuery: string): Promise<InternetSearchResult[] | null> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.log('OpenAI API key not found, falling back to basic parsing');
      return null;
    }

    const prompt = `Parse this activity search content for "${searchQuery}" and extract structured information about each activity/camp. Return ONLY a JSON array of objects with this exact structure:

[
  {
    "title": "Provider Name + Activity Type",
    "description": "Brief description from content",
    "url": "extracted URL or https://example.com/camp-registration",
    "provider": "Business/Organization Name",
    "location": "City or neighborhood",
    "session_dates": ["2025-09-15", "2025-09-22"],
    "session_times": ["9:00 AM", "6:00 PM"],
    "street_address": "Full street address or null",
    "signup_cost": 25,
    "total_cost": 100,
    "confidence": 0.9,
    "canAutomate": true,
    "automationComplexity": "medium"
  }
]

Extract real provider names (SoulCycle, NYU Athletics, etc), actual addresses, pricing (distinguish signup cost vs total cost), and session times. Return empty array if no activities found.

Content to parse:
${content}`;

    console.log('Making OpenAI request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a data extraction assistant that parses activity/camp information into structured JSON. Always return valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content_result = data.choices?.[0]?.message?.content;
    
    console.log('OpenAI raw response:', content_result);

    if (!content_result) {
      console.log('No content in OpenAI response');
      return null;
    }

    // Try to parse JSON from the response
    try {
      // Clean the response to extract JSON
      const jsonMatch = content_result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log('No JSON array found in OpenAI response');
        return null;
      }

      const parsedResults = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed OpenAI results:', parsedResults.length, 'items');
      
      return Array.isArray(parsedResults) ? parsedResults : null;
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return null;
    }

  } catch (error) {
    console.error('OpenAI processing error:', error);
    return null;
  }
}
