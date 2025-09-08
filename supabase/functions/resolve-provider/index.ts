import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResolverResponse {
  platform: string;
  provider_org_id: string | null;
  org_display_name: string | null;
  org_location: string | null;
}

function extractJackrabbitOrgId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const orgIdMatch = urlObj.searchParams.get('OrgID');
    return orgIdMatch || null;
  } catch {
    return null;
  }
}

async function probeJackrabbitLocation(url: string, orgId: string): Promise<{ org_display_name: string | null; org_location: string | null }> {
  try {
    // Create probe URL with showcols=Location to reveal location column
    const probeUrl = `${url}&showcols=Location`;
    
    console.log('Probing Jackrabbit URL:', probeUrl);
    
    const response = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CampBot/1.0)',
      },
    });

    if (!response.ok) {
      console.log('Probe request failed:', response.status);
      return { org_display_name: null, org_location: null };
    }

    const html = await response.text();
    
    // Extract organization display name from title
    let org_display_name: string | null = null;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      let title = titleMatch[1].trim();
      // Strip common boilerplate
      title = title.replace(/\s*-\s*(Openings|Class Listing|Registration).*$/i, '');
      title = title.replace(/^(Openings|Class Listing)\s*-\s*/i, '');
      org_display_name = title.trim() || null;
    }

    // Also try to extract from main header
    if (!org_display_name) {
      const headerMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (headerMatch) {
        let header = headerMatch[1].trim();
        header = header.replace(/\s*-\s*(Openings|Class Listing|Registration).*$/i, '');
        org_display_name = header.trim() || null;
      }
    }

    // Extract location from first Location column cell
    let org_location: string | null = null;
    
    // Look for table cells that might contain location data
    // Try multiple patterns as Jackrabbit HTML structure can vary
    const locationPatterns = [
      /<td[^>]*data-label="Location"[^>]*>([^<]+)<\/td>/i,
      /<td[^>]*>([^<]*(?:,\s*[A-Z]{2}|,\s*[A-Za-z\s]+))<\/td>/g, // City, State pattern
    ];

    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match) {
        const location = match[1].trim();
        // Validate it looks like a location (has comma and state-like pattern)
        if (location.includes(',') && location.length > 3 && location.length < 50) {
          org_location = location;
          break;
        }
      }
    }

    console.log('Extracted data:', { org_display_name, org_location });
    return { org_display_name, org_location };

  } catch (error) {
    console.error('Error probing Jackrabbit URL:', error);
    return { org_display_name: null, org_location: null };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const urlObj = new URL(url);
    let platform = 'unknown';
    let provider_org_id: string | null = null;
    let org_display_name: string | null = null;
    let org_location: string | null = null;

    // Check if this is a Jackrabbit URL
    if (urlObj.host.includes('jackrabbitclass.com')) {
      platform = 'jackrabbit';
      provider_org_id = extractJackrabbitOrgId(url);

      // If this is an OpeningsDirect URL, probe for enhanced data
      if (urlObj.pathname.toLowerCase().includes('/openings/openingsdirect') && provider_org_id) {
        const probeData = await probeJackrabbitLocation(url, provider_org_id);
        org_display_name = probeData.org_display_name;
        org_location = probeData.org_location;
      }
    }

    const response: ResolverResponse = {
      platform,
      provider_org_id,
      org_display_name,
      org_location,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in resolve-provider:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});