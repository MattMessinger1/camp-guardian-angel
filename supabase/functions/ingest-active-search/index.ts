import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getSecureCorsHeaders, logSecurityEvent } from '../_shared/security.ts';

interface ActiveNetworkSearchParams {
  keywords?: string;
  city?: string;
  state?: string;
  category?: string;
  page?: number;
  per_page?: number;
}

interface ActiveNetworkActivity {
  id: string;
  title: string;
  description?: string;
  activity_dates: Array<{
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
  }>;
  location: {
    address?: string;
    city: string;
    state: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
  };
  pricing: {
    min_price?: number;
    max_price?: number;
    currency?: string;
  };
  age_restrictions: {
    min_age?: number;
    max_age?: number;
  };
  capacity?: {
    max_capacity?: number;
    current_enrollment?: number;
  };
  registration_url?: string;
  provider: {
    name: string;
    website?: string;
  };
  categories: string[];
}

interface ActiveNetworkResponse {
  activities: ActiveNetworkActivity[];
  pagination: {
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
}

class ActiveNetworkHarvester {
  private supabase: any;
  private apiKey: string;
  private baseUrl = 'https://api.active.com/v2';
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(supabaseUrl: string, supabaseKey: string, apiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.apiKey = apiKey;
  }

  private getCacheKey(params: ActiveNetworkSearchParams): string {
    return `active_search_${JSON.stringify(params)}`;
  }

  private isValidCacheEntry(entry: { data: any; expires: number }): boolean {
    return Date.now() < entry.expires;
  }

  private async rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
    // Active Network API rate limiting - typically 1000 requests/hour
    const rateLimitDelay = 4000; // 4 seconds between requests to be safe
    
    // Simple in-memory rate limiting
    const lastRequestKey = 'active_network_last_request';
    const lastRequest = parseInt(localStorage?.getItem?.(lastRequestKey) || '0');
    const now = Date.now();
    
    if (now - lastRequest < rateLimitDelay) {
      const waitTime = rateLimitDelay - (now - lastRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      localStorage?.setItem?.(lastRequestKey, now.toString());
    } catch (e) {
      // localStorage not available in edge function context, use memory
    }

    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CampScheduleBot/1.0',
        ...options.headers,
      },
    });
  }

  async searchActivities(params: ActiveNetworkSearchParams): Promise<ActiveNetworkResponse> {
    const cacheKey = this.getCacheKey(params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCacheEntry(cached)) {
      console.log('✅ Using cached Active Network data');
      return cached.data;
    }

    const searchParams = new URLSearchParams();
    if (params.keywords) searchParams.set('keywords', params.keywords);
    if (params.city) searchParams.set('city', params.city);
    if (params.state) searchParams.set('state', params.state);
    if (params.category) searchParams.set('category', params.category);
    searchParams.set('page', String(params.page || 1));
    searchParams.set('per_page', String(params.per_page || 50));

    const url = `${this.baseUrl}/activities/search?${searchParams.toString()}`;
    console.log('🔍 Searching Active Network:', url);

    try {
      const response = await this.rateLimitedFetch(url, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`Active Network API error: ${response.status} ${response.statusText}`);
      }

      const data: ActiveNetworkResponse = await response.json();
      
      // Cache for 24 hours
      this.cache.set(cacheKey, {
        data,
        expires: Date.now() + (24 * 60 * 60 * 1000)
      });

      console.log(`✅ Found ${data.activities.length} activities`);
      return data;

    } catch (error) {
      console.error('❌ Active Network API error:', error);
      throw error;
    }
  }

  private generateSignupUrl(activity: ActiveNetworkActivity): string {
    if (activity.registration_url) {
      return activity.registration_url;
    }
    
    // Fallback to Active.com search URL for the activity
    const searchParams = new URLSearchParams({
      keywords: activity.title,
      city: activity.location.city,
      state: activity.location.state,
    });
    return `https://www.active.com/search?${searchParams.toString()}`;
  }

  private async getOrCreateProvider(activity: ActiveNetworkActivity): Promise<string> {
    const providerName = activity.provider.name || 'Active Network Provider';
    
    // Check if provider exists
    const { data: existingProvider } = await this.supabase
      .from('providers')
      .select('id')
      .eq('name', providerName)
      .single();

    if (existingProvider) {
      return existingProvider.id;
    }

    // Create new provider
    const { data: newProvider, error } = await this.supabase
      .from('providers')
      .insert({
        name: providerName,
        platform_hint: 'active_network',
        homepage: activity.provider.website || 'https://www.active.com',
        site_url: activity.provider.website,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating provider:', error);
      throw error;
    }

    return newProvider.id;
  }

  private async getOrCreateSource(): Promise<string> {
    const sourceUrl = 'https://api.active.com/v2/activities/search';
    
    // Check if source exists
    const { data: existingSource } = await this.supabase
      .from('sources')
      .select('id')
      .eq('base_url', sourceUrl)
      .single();

    if (existingSource) {
      return existingSource.id;
    }

    // Create new source
    const { data: newSource, error } = await this.supabase
      .from('sources')
      .insert({
        type: 'active_api',
        base_url: sourceUrl,
        notes: 'Active Network Activity Search API',
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating source:', error);
      throw error;
    }

    return newSource.id;
  }

  private async processActivity(activity: ActiveNetworkActivity, sourceId: string): Promise<void> {
    try {
      const providerId = await this.getOrCreateProvider(activity);

      for (const dateRange of activity.activity_dates) {
        const sessionData = {
          provider_id: providerId,
          source_id: sourceId,
          name: activity.title,
          title: activity.title,
          location: activity.location.address || `${activity.location.city}, ${activity.location.state}`,
          location_city: activity.location.city,
          location_state: activity.location.state,
          lat: activity.location.latitude,
          lng: activity.location.longitude,
          start_date: new Date(dateRange.start_date),
          end_date: new Date(dateRange.end_date),
          start_at: dateRange.start_time ? 
            new Date(`${dateRange.start_date}T${dateRange.start_time}`) : 
            new Date(dateRange.start_date),
          end_at: dateRange.end_time ? 
            new Date(`${dateRange.end_date}T${dateRange.end_time}`) : 
            new Date(dateRange.end_date),
          age_min: activity.age_restrictions.min_age,
          age_max: activity.age_restrictions.max_age,
          price_min: activity.pricing.min_price,
          price_max: activity.pricing.max_price,
          capacity: activity.capacity?.max_capacity,
          spots_available: activity.capacity ? 
            (activity.capacity.max_capacity - (activity.capacity.current_enrollment || 0)) : 
            null,
          availability_status: activity.capacity?.current_enrollment >= activity.capacity?.max_capacity ? 
            'full' : 'available',
          signup_url: this.generateSignupUrl(activity),
          source_url: this.generateSignupUrl(activity),
          platform: 'active_network',
          last_verified_at: new Date(),
        };

        // Create deduplication key
        const dedupKey = `${activity.provider.name}_${activity.title}_${dateRange.start_date}_${activity.location.city}`;

        // First, create session candidate
        const candidateData = {
          source_id: sourceId,
          url: this.generateSignupUrl(activity),
          extracted_json: {
            ...activity,
            dedup_key: dedupKey,
            processed_at: new Date().toISOString(),
          },
          confidence: 0.95, // High confidence for API data
          status: 'approved', // Auto-approve API data
        };

        const { data: candidate, error: candidateError } = await this.supabase
          .from('session_candidates')
          .insert(candidateData)
          .select('id')
          .single();

        if (candidateError) {
          console.error('❌ Error creating session candidate:', candidateError);
          continue;
        }

        // Check for existing session to avoid duplicates
        const { data: existingSession } = await this.supabase
          .from('sessions')
          .select('id')
          .eq('name', sessionData.name)
          .eq('start_date', sessionData.start_date.toISOString().split('T')[0])
          .eq('location_city', sessionData.location_city)
          .eq('provider_id', providerId)
          .single();

        if (existingSession) {
          console.log(`⏭️ Skipping duplicate session: ${sessionData.name}`);
          continue;
        }

        // Insert session
        const { error: sessionError } = await this.supabase
          .from('sessions')
          .insert(sessionData);

        if (sessionError) {
          console.error('❌ Error creating session:', sessionError);
        } else {
          console.log(`✅ Created session: ${sessionData.name} in ${sessionData.location_city}`);
        }
      }

    } catch (error) {
      console.error('❌ Error processing activity:', error);
    }
  }

  async harvestActivities(params: ActiveNetworkSearchParams): Promise<{ 
    processed: number; 
    created: number; 
    errors: number; 
  }> {
    console.log('🚀 Starting Active Network harvest:', params);
    
    const sourceId = await this.getOrCreateSource();
    let processed = 0;
    let created = 0;
    let errors = 0;
    let page = 1;
    const maxPages = 5; // Limit to prevent excessive API calls

    try {
      while (page <= maxPages) {
        const response = await this.searchActivities({ ...params, page });
        
        if (!response.activities || response.activities.length === 0) {
          break;
        }

        for (const activity of response.activities) {
          try {
            await this.processActivity(activity, sourceId);
            processed++;
            created++; // Simplified - in real implementation, track actual creates vs updates
          } catch (error) {
            console.error(`❌ Error processing activity ${activity.id}:`, error);
            errors++;
          }
        }

        // Break if we've reached the last page
        if (page >= response.pagination.total_pages) {
          break;
        }

        page++;
        
        // Rate limiting between pages
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`✅ Harvest complete: ${processed} processed, ${created} created, ${errors} errors`);
      
      return { processed, created, errors };

    } catch (error) {
      console.error('❌ Harvest failed:', error);
      throw error;
    }
  }
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const apiKey = Deno.env.get('ACTIVE_NETWORK_API_KEY');
    if (!apiKey) {
      throw new Error('ACTIVE_NETWORK_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json();
    const { city, state, keywords, category } = body;

    // Default to Madison, WI if no location specified
    const searchParams: ActiveNetworkSearchParams = {
      city: city || 'Madison',
      state: state || 'WI',
      keywords: keywords || 'camp youth summer',
      category: category || 'sports',
      per_page: 50,
    };

    await logSecurityEvent(
      'active_network_harvest',
      null,
      req.headers.get('x-forwarded-for'),
      req.headers.get('user-agent'),
      { search_params: searchParams }
    );

    const harvester = new ActiveNetworkHarvester(
      supabaseUrl,
      supabaseServiceKey,
      apiKey
    );

    const results = await harvester.harvestActivities(searchParams);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        search_params: searchParams,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('❌ Harvest error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});