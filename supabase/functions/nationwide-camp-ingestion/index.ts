import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// US States for systematic crawling
const US_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  // ... add all 50 states
  { name: 'California', code: 'CA' },
  { name: 'Florida', code: 'FL' },
  { name: 'New York', code: 'NY' },
  { name: 'Texas', code: 'TX' },
  // etc.
];

// Major camp management platforms and their URL patterns
const CAMP_PLATFORMS = [
  {
    name: 'jackrabbit',
    searchUrls: [
      'https://register.jackrabbittech.com/portal/',
      'https://*.jackrabbittech.com/portal/'
    ],
    detectionPattern: 'jackrabbit'
  },
  {
    name: 'communitypass',
    searchUrls: [
      'https://register.communitypass.net/',
      'https://*.communitypass.net/'
    ],
    detectionPattern: 'communitypass'
  },
  {
    name: 'myvscloud',
    searchUrls: [
      'https://web1.myvscloud.com/wbwsc/',
      'https://*.myvscloud.com/wbwsc/'
    ],
    detectionPattern: 'myvscloud'
  },
  {
    name: 'daysmart',
    searchUrls: [
      'https://*.daysmartrecreation.com/',
      'https://*.webtrac.cloud/'
    ],
    detectionPattern: 'daysmart'
  }
];

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function discoverCampsForLocation(city: string, state: string, limit: number = 50) {
  console.log(`🔍 Discovering camps for ${city}, ${state}`);
  
  const discoveries = [];
  
  // Search ACA directory
  const acaResults = await searchACADirectory(city, state);
  discoveries.push(...acaResults);
  
  // Search major camp directories
  const directoryResults = await searchCampDirectories(city, state);
  discoveries.push(...directoryResults);
  
  // Search Google for camp management platforms in the area
  const platformResults = await discoverLocalPlatforms(city, state);
  discoveries.push(...platformResults);
  
  return discoveries.slice(0, limit);
}

async function searchACADirectory(city: string, state: string) {
  // This would search the American Camp Association directory
  // You'd need to implement the actual scraping logic
  console.log(`Searching ACA directory for ${city}, ${state}`);
  
  try {
    // Example: Use the existing ingest function to process ACA search results
    const searchUrl = `https://acacamps.org/camp-search?city=${encodeURIComponent(city)}&state=${state}`;
    
    // You would implement the ACA-specific parsing here
    return [];
  } catch (error) {
    console.error('ACA search error:', error);
    return [];
  }
}

async function searchCampDirectories(city: string, state: string) {
  const directories = [
    'https://www.camppage.com',
    'https://www.mysummercamps.com',
    'https://www.summercamp.org'
  ];
  
  const results = [];
  
  for (const directory of directories) {
    try {
      console.log(`Searching ${directory} for camps in ${city}, ${state}`);
      // Implement directory-specific search logic
      // This would return camp URLs found in each directory
    } catch (error) {
      console.error(`Error searching ${directory}:`, error);
    }
  }
  
  return results;
}

async function discoverLocalPlatforms(city: string, state: string) {
  // Search for local government recreation departments
  // Many use standard platforms like MyVSCloud, CommunityPass, etc.
  
  const searchTerms = [
    `"${city}" parks recreation registration`,
    `"${city}" summer camps registration`,
    `"${state}" parks recreation department`,
    `site:communitypass.net "${city}"`,
    `site:myvscloud.com "${city}"`,
    `site:jackrabbittech.com "${city}"`
  ];
  
  const discoveries = [];
  
  for (const searchTerm of searchTerms) {
    try {
      // You could use a web search API here (like Perplexity or Google)
      // Or implement web scraping to find registration platforms
      console.log(`Searching for: ${searchTerm}`);
    } catch (error) {
      console.error('Platform discovery error:', error);
    }
  }
  
  return discoveries;
}

async function ingestDiscoveredCamps(discoveries: any[], supabase: any) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  for (const discovery of discoveries) {
    try {
      console.log(`📥 Ingesting camp from ${discovery.url}`);
      
      // Use the existing ingest-camp-source function
      const { data, error } = await supabase.functions.invoke('ingest-camp-source', {
        body: {
          user_id: 'system', // System user for automated ingestion
          camp_name: discovery.name,
          location_hint: discovery.location,
          source_url: discovery.url
        }
      });
      
      if (error) {
        console.error(`Failed to ingest ${discovery.url}:`, error);
        results.failed++;
        results.errors.push(`${discovery.url}: ${error.message}`);
      } else {
        console.log(`✅ Successfully ingested ${discovery.name}`);
        results.successful++;
      }
      
      // Rate limiting - don't overwhelm servers
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error ingesting ${discovery.url}:`, error);
      results.failed++;
      results.errors.push(`${discovery.url}: ${error.message}`);
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      city, 
      state, 
      stateCode,
      limit = 50,
      autoIngest = false 
    } = await req.json();

    const supabase = getSupabaseClient();

    switch (action) {
      case 'discover_state':
        console.log(`🗺️ Starting state-wide discovery for ${state || stateCode}`);
        
        // Get major cities in the state
        const majorCities = await getMajorCitiesForState(stateCode);
        const allDiscoveries = [];
        
        for (const cityInfo of majorCities) {
          const discoveries = await discoverCampsForLocation(cityInfo.name, stateCode, 20);
          allDiscoveries.push(...discoveries);
        }
        
        if (autoIngest) {
          const ingestResults = await ingestDiscoveredCamps(allDiscoveries, supabase);
          return new Response(JSON.stringify({
            success: true,
            discovered: allDiscoveries.length,
            ingested: ingestResults.successful,
            failed: ingestResults.failed,
            errors: ingestResults.errors
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          discoveries: allDiscoveries
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'discover_city':
        console.log(`🏙️ Starting city discovery for ${city}, ${state}`);
        
        const discoveries = await discoverCampsForLocation(city, state, limit);
        
        if (autoIngest) {
          const ingestResults = await ingestDiscoveredCamps(discoveries, supabase);
          return new Response(JSON.stringify({
            success: true,
            discovered: discoveries.length,
            ingested: ingestResults.successful,
            failed: ingestResults.failed,
            errors: ingestResults.errors
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          discoveries
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'ingest_nationwide':
        console.log(`🇺🇸 Starting nationwide ingestion`);
        
        const nationwideResults = {
          states_processed: 0,
          total_discovered: 0,
          total_ingested: 0,
          total_failed: 0,
          errors: [] as string[]
        };
        
        for (const stateInfo of US_STATES.slice(0, 5)) { // Start with 5 states
          console.log(`Processing ${stateInfo.name}...`);
          
          const majorCities = await getMajorCitiesForState(stateInfo.code);
          
          for (const cityInfo of majorCities.slice(0, 3)) { // Top 3 cities per state
            const discoveries = await discoverCampsForLocation(cityInfo.name, stateInfo.code, 10);
            const ingestResults = await ingestDiscoveredCamps(discoveries, supabase);
            
            nationwideResults.total_discovered += discoveries.length;
            nationwideResults.total_ingested += ingestResults.successful;
            nationwideResults.total_failed += ingestResults.failed;
            nationwideResults.errors.push(...ingestResults.errors);
            
            // Rate limiting between cities
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          nationwideResults.states_processed++;
          
          // Rate limiting between states
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        return new Response(JSON.stringify({
          success: true,
          results: nationwideResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Use: discover_state, discover_city, or ingest_nationwide'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Error in nationwide-camp-ingestion:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getMajorCitiesForState(stateCode: string) {
  // Return major cities for systematic crawling
  const cityDatabase: Record<string, Array<{name: string, population: number}>> = {
    'CA': [
      { name: 'Los Angeles', population: 3979576 },
      { name: 'San Diego', population: 1423851 },
      { name: 'San Jose', population: 1021795 },
      { name: 'San Francisco', population: 873965 },
      { name: 'Fresno', population: 542107 }
    ],
    'TX': [
      { name: 'Houston', population: 2320268 },
      { name: 'San Antonio', population: 1547253 },
      { name: 'Dallas', population: 1343573 },
      { name: 'Austin', population: 978908 },
      { name: 'Fort Worth', population: 918915 }
    ],
    'NY': [
      { name: 'New York', population: 8336817 },
      { name: 'Buffalo', population: 261310 },
      { name: 'Rochester', population: 210565 },
      { name: 'Yonkers', population: 211569 },
      { name: 'Syracuse', population: 148620 }
    ],
    'FL': [
      { name: 'Jacksonville', population: 911507 },
      { name: 'Miami', population: 442241 },
      { name: 'Tampa', population: 384959 },
      { name: 'Orlando', population: 307573 },
      { name: 'St. Petersburg', population: 265351 }
    ]
    // Add more states as needed
  };
  
  return cityDatabase[stateCode] || [{ name: 'Unknown', population: 0 }];
}