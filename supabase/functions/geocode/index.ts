import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting state (in-memory for this function instance)
const rateLimitState = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 request per second per host

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRateLimit(host: string): Promise<boolean> {
  const now = Date.now();
  const lastRequest = rateLimitState.get(host) || 0;
  
  if (now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }
  
  rateLimitState.set(host, now);
  return true;
}

async function callNominatim(city: string, state: string): Promise<{lat: number, lng: number} | null> {
  const geocodeEnabled = Deno.env.get('GEOCODE_ENABLED') === 'true';
  
  if (!geocodeEnabled) {
    console.log('Geocoding disabled, skipping Nominatim call');
    return null;
  }

  // Check rate limit for nominatim
  const canProceed = await checkRateLimit('nominatim.openstreetmap.org');
  if (!canProceed) {
    console.log('Rate limited for Nominatim, skipping call');
    return null;
  }

  try {
    const query = `${city}, ${state}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=us`;
    
    console.log(`Geocoding: ${query}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CampRush/1.0 (contact@camprush.com)'
      }
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status}`);
      return null;
    }

    const results = await response.json();
    
    if (results.length === 0) {
      console.log(`No results found for: ${query}`);
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
  } catch (error) {
    console.error('Error calling Nominatim:', error);
    return null;
  }
}

async function getGeo(city: string, state: string): Promise<{lat: number, lng: number} | null> {
  if (!city || !state) {
    return null;
  }

  const query = `${city.trim()}, ${state.trim()}`;
  
  // Check cache first
  const { data: cached } = await supabase
    .from('geocode_cache')
    .select('lat, lng')
    .eq('query', query)
    .maybeSingle();

  if (cached && cached.lat !== null && cached.lng !== null) {
    console.log(`Cache hit for: ${query}`);
    return { lat: cached.lat, lng: cached.lng };
  }

  console.log(`Cache miss for: ${query}`);
  
  // Try to geocode
  const result = await callNominatim(city, state);
  
  // Store result in cache (even if null, to avoid repeat calls)
  const { error: insertError } = await supabase
    .from('geocode_cache')
    .upsert({
      query,
      lat: result?.lat || null,
      lng: result?.lng || null,
      updated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Error caching geocode result:', insertError);
  } else {
    console.log(`Cached result for: ${query}`, result);
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, state } = await req.json();

    if (!city || !state) {
      return new Response(
        JSON.stringify({ error: 'City and state are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await getGeo(city, state);

    return new Response(
      JSON.stringify({ 
        query: `${city}, ${state}`,
        coordinates: result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in geocode function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});