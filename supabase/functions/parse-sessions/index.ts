import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/security.ts';

interface ParseRequest {
  html: string;
  url: string;
  sourceId?: string;
  minConfidence?: number;
}

interface SessionCandidate {
  title?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  ageMin?: number;
  ageMax?: number;
  priceMin?: number;
  priceMax?: number;
  capacity?: number;
  location?: string;
  city?: string;
  state?: string;
  address?: string;
  daysOfWeek?: string[];
  signupUrl?: string;
  platform?: string;
  provider?: string;
  category?: string;
  requirements?: string[];
  confidence: number;
  extractionNotes?: string;
}

interface GeocodingResult {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
}

// JSON Schema for OpenAI function calling
const SESSION_EXTRACTION_SCHEMA = {
  name: "extract_sessions",
  description: "Extract camp/program session information from HTML content",
  parameters: {
    type: "object",
    properties: {
      sessions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Session or program title" },
            name: { type: "string", description: "Alternative name or display name" },
            description: { type: "string", description: "Session description or details" },
            startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
            endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
            startTime: { type: "string", description: "Start time in HH:MM format" },
            endTime: { type: "string", description: "End time in HH:MM format" },
            ageMin: { type: "number", description: "Minimum age requirement" },
            ageMax: { type: "number", description: "Maximum age requirement" },
            priceMin: { type: "number", description: "Minimum price in dollars" },
            priceMax: { type: "number", description: "Maximum price in dollars" },
            capacity: { type: "number", description: "Maximum number of participants" },
            location: { type: "string", description: "Location name or venue" },
            city: { type: "string", description: "City name" },
            state: { type: "string", description: "State abbreviation (e.g., WI, CA)" },
            address: { type: "string", description: "Full street address" },
            daysOfWeek: { 
              type: "array", 
              items: { type: "string" },
              description: "Days when session occurs (monday, tuesday, etc.)" 
            },
            signupUrl: { type: "string", description: "Registration or signup URL" },
            platform: { type: "string", description: "Platform or system name" },
            provider: { type: "string", description: "Organization or provider name" },
            category: { type: "string", description: "Program category or type" },
            requirements: { 
              type: "array", 
              items: { type: "string" },
              description: "Special requirements or prerequisites" 
            },
            confidence: { 
              type: "number", 
              minimum: 0, 
              maximum: 1,
              description: "Confidence score for this extraction (0-1)" 
            },
            extractionNotes: { type: "string", description: "Notes about extraction quality or issues" }
          },
          required: ["confidence"]
        }
      }
    },
    required: ["sessions"]
  }
};

class SessionParser {
  private openaiApiKey: string;
  
  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }
  
  async parseHtml(html: string, url: string): Promise<SessionCandidate[]> {
    try {
      // Clean and truncate HTML for processing
      const cleanHtml = this.cleanHtml(html);
      
      console.log(`Parsing HTML from ${url}, length: ${cleanHtml.length} chars`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14', // Use GPT-4.1 for reliable parsing
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting structured camp/program session data from web pages. 

Extract information about camps, summer programs, classes, sessions, and activities from the provided HTML. Focus on:
- Youth programs, camps, and classes
- Summer programs and activities  
- Sports and recreation programs
- Educational programs and workshops

For each session/program found:
1. Extract all available details carefully
2. Normalize dates to YYYY-MM-DD format
3. Convert prices to numeric values (remove $ and text)
4. Parse age ranges into min/max numbers
5. Standardize location information
6. Assign a confidence score (0.0-1.0) based on data completeness and clarity
7. Use HIGH confidence (0.8-1.0) for clear, complete program listings
8. Use MEDIUM confidence (0.6-0.8) for partial but useful information
9. Use LOW confidence (0.3-0.6) for unclear or incomplete data
10. SKIP anything below 0.3 confidence

Be thorough but conservative with confidence scores.`
            },
            {
              role: 'user',
              content: `Extract session information from this HTML content from ${url}:\n\n${cleanHtml}`
            }
          ],
          max_completion_tokens: 4000,
          functions: [SESSION_EXTRACTION_SCHEMA],
          function_call: { name: "extract_sessions" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI response received');
      
      if (!data.choices?.[0]?.message?.function_call?.arguments) {
        throw new Error('No function call response from OpenAI');
      }

      const extracted = JSON.parse(data.choices[0].message.function_call.arguments);
      const sessions = extracted.sessions || [];
      
      console.log(`Extracted ${sessions.length} session candidates`);
      
      // Post-process and normalize the sessions
      return await Promise.all(sessions.map(session => this.normalizeSession(session, url)));
      
    } catch (error) {
      console.error('Error parsing HTML:', error);
      throw error;
    }
  }
  
  private cleanHtml(html: string): string {
    // Remove scripts, styles, and other non-content elements
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long (OpenAI has token limits)
    const maxLength = 50000; // Conservative limit
    if (cleaned.length > maxLength) {
      console.log(`Truncating HTML from ${cleaned.length} to ${maxLength} chars`);
      cleaned = cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned;
  }
  
  private async normalizeSession(session: any, sourceUrl: string): Promise<SessionCandidate> {
    const normalized: SessionCandidate = {
      confidence: session.confidence || 0
    };
    
    // Copy basic text fields
    if (session.title) normalized.title = String(session.title).trim();
    if (session.name) normalized.name = String(session.name).trim();
    if (session.description) normalized.description = String(session.description).trim();
    if (session.provider) normalized.provider = String(session.provider).trim();
    if (session.category) normalized.category = String(session.category).trim();
    if (session.platform) normalized.platform = String(session.platform).trim();
    if (session.extractionNotes) normalized.extractionNotes = String(session.extractionNotes).trim();
    
    // Normalize dates
    if (session.startDate) {
      normalized.startDate = this.normalizeDate(session.startDate);
    }
    if (session.endDate) {
      normalized.endDate = this.normalizeDate(session.endDate);
    }
    
    // Normalize times
    if (session.startTime) {
      normalized.startTime = this.normalizeTime(session.startTime);
    }
    if (session.endTime) {
      normalized.endTime = this.normalizeTime(session.endTime);
    }
    
    // Normalize numeric fields
    if (session.ageMin !== undefined) normalized.ageMin = this.parseNumber(session.ageMin);
    if (session.ageMax !== undefined) normalized.ageMax = this.parseNumber(session.ageMax);
    if (session.priceMin !== undefined) normalized.priceMin = this.parseNumber(session.priceMin);
    if (session.priceMax !== undefined) normalized.priceMax = this.parseNumber(session.priceMax);
    if (session.capacity !== undefined) normalized.capacity = this.parseNumber(session.capacity);
    
    // Handle location
    if (session.location) normalized.location = String(session.location).trim();
    if (session.address) normalized.address = String(session.address).trim();
    if (session.city) normalized.city = String(session.city).trim();
    if (session.state) normalized.state = this.normalizeState(session.state);
    
    // Handle arrays
    if (Array.isArray(session.daysOfWeek)) {
      normalized.daysOfWeek = session.daysOfWeek.map(day => String(day).toLowerCase().trim());
    }
    if (Array.isArray(session.requirements)) {
      normalized.requirements = session.requirements.map(req => String(req).trim());
    }
    
    // Handle signup URL
    if (session.signupUrl) {
      normalized.signupUrl = this.normalizeUrl(session.signupUrl, sourceUrl);
    }
    
    return normalized;
  }
  
  private normalizeDate(dateStr: string): string | undefined {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return undefined;
    }
  }
  
  private normalizeTime(timeStr: string): string | undefined {
    try {
      // Handle various time formats
      const timeMatch = String(timeStr).match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (!timeMatch) return undefined;
      
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return undefined;
    }
  }
  
  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove non-numeric characters except decimal point
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }
  
  private normalizeState(state: string): string | undefined {
    const stateStr = String(state).trim().toUpperCase();
    
    // State abbreviation mapping
    const stateMap: Record<string, string> = {
      'WISCONSIN': 'WI', 'CALIFORNIA': 'CA', 'TEXAS': 'TX', 'FLORIDA': 'FL',
      'NEW YORK': 'NY', 'ILLINOIS': 'IL', 'PENNSYLVANIA': 'PA', 'OHIO': 'OH',
      // Add more as needed
    };
    
    if (stateStr.length === 2) return stateStr;
    return stateMap[stateStr] || stateStr.substring(0, 2);
  }
  
  private normalizeUrl(url: string, sourceUrl: string): string {
    try {
      // If already absolute URL, return as-is
      if (url.startsWith('http')) return url;
      
      // Handle relative URLs
      const baseUrl = new URL(sourceUrl);
      if (url.startsWith('/')) {
        return `${baseUrl.protocol}//${baseUrl.host}${url}`;
      } else {
        return `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname}/${url}`;
      }
    } catch {
      return url;
    }
  }
}

class GeoCoder {
  private cache = new Map<string, GeocodingResult>();
  
  async geocode(location: string, city?: string, state?: string): Promise<GeocodingResult> {
    const query = this.buildQuery(location, city, state);
    const cacheKey = query.toLowerCase();
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      // Use Nominatim (free OpenStreetMap geocoding)
      const encodedQuery = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=us`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CampScheduleBot/1.0 (contact@example.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      const result: GeocodingResult = {};
      
      if (data && data.length > 0) {
        const place = data[0];
        result.lat = parseFloat(place.lat);
        result.lng = parseFloat(place.lon);
        
        // Extract city and state from display name or address
        const address = place.display_name || '';
        const parts = address.split(', ');
        
        if (parts.length >= 3) {
          result.city = city || parts[parts.length - 4];
          result.state = state || parts[parts.length - 3];
        }
      }
      
      this.cache.set(cacheKey, result);
      
      // Rate limit for Nominatim
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return result;
      
    } catch (error) {
      console.error(`Geocoding failed for "${query}":`, error);
      return {};
    }
  }
  
  private buildQuery(location: string, city?: string, state?: string): string {
    const parts = [location];
    if (city) parts.push(city);
    if (state) parts.push(state);
    return parts.join(', ');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { html, url, sourceId, minConfidence = 0.6 }: ParseRequest = await req.json();

    if (!html || !url) {
      return new Response(
        JSON.stringify({ error: 'html and url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting session parsing for ${url}`);

    // Parse sessions from HTML
    const parser = new SessionParser(openaiApiKey);
    const candidates = await parser.parseHtml(html, url);
    
    console.log(`Found ${candidates.length} candidates before filtering`);
    
    // Filter by confidence
    const validCandidates = candidates.filter(c => c.confidence >= minConfidence);
    console.log(`${validCandidates.length} candidates meet confidence threshold of ${minConfidence}`);
    
    // Geocode locations for high-confidence candidates
    const geocoder = new GeoCoder();
    const processedCandidates = [];
    
    for (const candidate of validCandidates) {
      if (candidate.confidence >= 0.7 && (candidate.location || candidate.city)) {
        try {
          const geoResult = await geocoder.geocode(
            candidate.location || '',
            candidate.city,
            candidate.state
          );
          
          if (geoResult.lat && geoResult.lng) {
            candidate.extractionNotes = (candidate.extractionNotes || '') + ' [Geocoded]';
          }
          
          // Update with geocoding results
          Object.assign(candidate, geoResult);
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }
      
      processedCandidates.push(candidate);
    }
    
    // Store in session_candidates table
    const candidateRecords = [];
    
    for (const candidate of processedCandidates) {
      const record = {
        source_id: sourceId,
        url: url,
        extracted_json: candidate,
        confidence: candidate.confidence,
        status: 'pending',
        notes: candidate.extractionNotes
      };
      
      candidateRecords.push(record);
    }
    
    if (candidateRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('session_candidates')
        .insert(candidateRecords);
      
      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save candidates: ${insertError.message}`);
      }
    }
    
    const result = {
      success: true,
      url: url,
      totalExtracted: candidates.length,
      validCandidates: validCandidates.length,
      storedCandidates: candidateRecords.length,
      minConfidence: minConfidence,
      candidates: processedCandidates.map(c => ({
        title: c.title || c.name,
        confidence: c.confidence,
        startDate: c.startDate,
        endDate: c.endDate,
        ageRange: c.ageMin || c.ageMax ? `${c.ageMin || '?'}-${c.ageMax || '?'}` : undefined,
        priceRange: c.priceMin || c.priceMax ? `$${c.priceMin || '?'}-${c.priceMax || '?'}` : undefined,
        location: c.location || c.city
      }))
    };

    console.log(`Parse completed: ${result.storedCandidates} candidates stored`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});