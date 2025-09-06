import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JackrabbitClass {
  id: string;
  title: string;
  description?: string;
  days: string;
  times: string;
  gender: string;
  ages: string;
  openings: number;
  class_starts: string;
  class_ends: string;
  session: string;
  tuition?: string;
  register_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { provider_url, organization_id, user_id } = await req.json();
    
    if (!provider_url || !organization_id) {
      return new Response(JSON.stringify({ 
        error: 'provider_url and organization_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[JACKRABBIT-IMPORT] Starting import for org: ${organization_id}`);

    // Step 1: Scrape class schedule from Jackrabbit
    const classes = await scrapeJackrabbitClasses(provider_url, organization_id);
    
    if (!classes || classes.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No classes found or failed to scrape'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Create or find the provider activity
    const providerName = extractProviderName(provider_url);
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .upsert({
        name: providerName,
        kind: "dance_studio", // Could be made dynamic
        provider_id: organization_id,
        canonical_url: provider_url,
        description: `Dance classes at ${providerName}`,
        city: null, // Could be extracted from provider info
        state: null
      }, { 
        onConflict: "provider_id",
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (activityError || !activity) {
      console.error("[JACKRABBIT-IMPORT] Failed to create/find activity:", activityError);
      throw new Error("Failed to create activity");
    }

    console.log(`[JACKRABBIT-IMPORT] Activity ready: ${activity.id}`);

    // Step 3: Import classes as sessions
    const importedSessions = [];
    for (const classData of classes) {
      try {
        const sessionData = convertClassToSession(classData, activity.id, provider_url, organization_id);
        
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .upsert(sessionData, { 
            onConflict: "provider_session_key",
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (session) {
          importedSessions.push(session);
          console.log(`[JACKRABBIT-IMPORT] Imported session: ${session.title}`);
        } else {
          console.warn(`[JACKRABBIT-IMPORT] Failed to import class: ${classData.title}`, sessionError);
        }
      } catch (error) {
        console.warn(`[JACKRABBIT-IMPORT] Error importing class ${classData.title}:`, error);
      }
    }

    // Step 4: Update search embeddings for new sessions (background task)
    if (importedSessions.length > 0) {
      // Trigger embedding generation for search
      supabase.functions.invoke('generate-session-embeddings', {
        body: { 
          session_ids: importedSessions.map(s => s.id),
          activity_id: activity.id 
        }
      }).catch(err => console.warn("Embedding generation failed:", err));
    }

    return new Response(JSON.stringify({
      success: true,
      imported_count: importedSessions.length,
      activity_id: activity.id,
      provider_name: providerName,
      sessions: importedSessions.map(s => ({
        id: s.id,
        title: s.title,
        start_at: s.start_at,
        signup_url: s.signup_url
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[JACKRABBIT-IMPORT] Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function scrapeJackrabbitClasses(providerUrl: string, orgId: string): Promise<JackrabbitClass[]> {
  try {
    // Navigate to the class listing page
    const classListUrl = `${new URL(providerUrl).origin}/regv2.asp?id=${orgId}`;
    
    console.log(`[JACKRABBIT-SCRAPE] Fetching classes from: ${classListUrl}`);

    // Use browser automation to get the class table
    const browserResponse = await fetch('https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/browser-automation-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        action: 'scrape',
        url: classListUrl,
        selector: 'table tr', // Get all table rows
        metadata: {
          purpose: 'class_import',
          org_id: orgId
        }
      })
    });

    if (!browserResponse.ok) {
      throw new Error(`Browser automation failed: ${browserResponse.status}`);
    }

    const pageData = await browserResponse.json();
    
    // Parse the scraped table data into class objects
    return parseJackrabbitTable(pageData.data, providerUrl, orgId);
    
  } catch (error) {
    console.error("[JACKRABBIT-SCRAPE] Error:", error);
    return [];
  }
}

function parseJackrabbitTable(tableRows: any[], providerUrl: string, orgId: string): JackrabbitClass[] {
  const classes: JackrabbitClass[] = [];
  
  if (!Array.isArray(tableRows) || tableRows.length < 2) {
    console.warn("[JACKRABBIT-PARSE] No table data found");
    return classes;
  }

  // Skip header row, process data rows
  for (let i = 1; i < tableRows.length; i++) {
    const row = tableRows[i];
    if (!row || !Array.isArray(row.cells) || row.cells.length < 10) {
      continue;
    }

    try {
      // Map table columns based on Jackrabbit format
      const classData: JackrabbitClass = {
        id: `${orgId}-${i}`,
        title: row.cells[1]?.text?.trim() || `Class ${i}`,
        description: row.cells[2]?.text?.trim() || "",
        days: row.cells[3]?.text?.trim() || "",
        times: row.cells[4]?.text?.trim() || "",
        gender: row.cells[5]?.text?.trim() || "All",
        ages: row.cells[6]?.text?.trim() || "",
        openings: parseInt(row.cells[7]?.text?.trim() || "0", 10),
        class_starts: row.cells[8]?.text?.trim() || "",
        class_ends: row.cells[9]?.text?.trim() || "",
        session: row.cells[10]?.text?.trim() || "",
        tuition: row.cells[11]?.text?.trim() || "",
        register_url: extractRegisterUrl(row.cells[0]) || `${providerUrl}&class=${i}`
      };

      if (classData.title && classData.title !== "Class") {
        classes.push(classData);
      }
    } catch (error) {
      console.warn(`[JACKRABBIT-PARSE] Error parsing row ${i}:`, error);
    }
  }

  console.log(`[JACKRABBIT-PARSE] Parsed ${classes.length} classes`);
  return classes;
}

function extractRegisterUrl(cell: any): string | null {
  // Look for register links in the first cell
  if (cell?.links && Array.isArray(cell.links) && cell.links.length > 0) {
    const registerLink = cell.links.find(link => 
      link.text?.toLowerCase().includes('register') || 
      link.href?.includes('register')
    );
    return registerLink?.href || null;
  }
  return null;
}

function convertClassToSession(classData: JackrabbitClass, activityId: string, providerUrl: string, orgId: string) {
  // Parse dates and times
  const { startAt, endAt } = parseClassSchedule(classData);
  const { ageMin, ageMax } = parseAgeRange(classData.ages);
  const tuitionCents = parseTuition(classData.tuition);

  return {
    activity_id: activityId,
    title: classData.title,
    provider_session_key: `jackrabbit-${orgId}-${classData.id}`,
    signup_url: classData.register_url,
    start_at: startAt,
    end_at: endAt,
    age_min: ageMin,
    age_max: ageMax,
    capacity: classData.openings > 0 ? classData.openings : null,
    price_min: tuitionCents,
    price_max: tuitionCents,
    availability_status: classData.openings > 0 ? 'open' : 'full',
    platform: 'jackrabbit',
    provider_id: orgId,
    source_url: providerUrl,
    location_city: null, // Could be extracted from provider
    location_state: null,
    days_of_week: parseDaysOfWeek(classData.days),
    evidence_snippet: `${classData.description} | ${classData.days} ${classData.times} | Ages: ${classData.ages}`,
    open_time_exact: false, // Jackrabbit usually doesn't have exact registration times
    high_demand: classData.openings < 5 && classData.openings > 0
  };
}

function parseClassSchedule(classData: JackrabbitClass): { startAt: string | null, endAt: string | null } {
  try {
    // Parse class_starts and class_ends (e.g., "09/08/2025", "06/30/2026")
    if (classData.class_starts && classData.class_ends) {
      const startDate = new Date(classData.class_starts);
      const endDate = new Date(classData.class_ends);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return {
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString()
        };
      }
    }
  } catch (error) {
    console.warn("[JACKRABBIT-PARSE] Error parsing dates:", error);
  }
  
  return { startAt: null, endAt: null };
}

function parseAgeRange(ageString: string): { ageMin: number | null, ageMax: number | null } {
  if (!ageString) return { ageMin: null, ageMax: null };
  
  // Parse formats like "3 - 5", "5 - 8", "All", "8 & up"
  const match = ageString.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) {
    return {
      ageMin: parseInt(match[1], 10),
      ageMax: parseInt(match[2], 10)
    };
  }
  
  // Handle "8 & up" format
  const upMatch = ageString.match(/(\d+)\s*&\s*up/);
  if (upMatch) {
    return {
      ageMin: parseInt(upMatch[1], 10),
      ageMax: null
    };
  }
  
  return { ageMin: null, ageMax: null };
}

function parseTuition(tuitionString: string): number | null {
  if (!tuitionString) return null;
  
  // Extract dollar amounts (e.g., "$70.00", "2025-2026")
  const match = tuitionString.match(/\$?(\d+(?:\.\d{2})?)/);
  if (match) {
    return Math.round(parseFloat(match[1]) * 100); // Convert to cents
  }
  
  return null;
}

function parseDaysOfWeek(daysString: string): string[] {
  if (!daysString) return [];
  
  const dayMappings = {
    'mon': 'monday',
    'tue': 'tuesday', 
    'wed': 'wednesday',
    'thu': 'thursday',
    'fri': 'friday',
    'sat': 'saturday',
    'sun': 'sunday'
  };
  
  const days: string[] = [];
  const lowerDays = daysString.toLowerCase();
  
  Object.entries(dayMappings).forEach(([short, full]) => {
    if (lowerDays.includes(short)) {
      days.push(full);
    }
  });
  
  return days;
}

function extractProviderName(providerUrl: string): string {
  try {
    const url = new URL(providerUrl);
    // Try to extract org name from URL params or domain
    const params = new URLSearchParams(url.search);
    const orgName = params.get('org_name') || params.get('name');
    if (orgName) return orgName;
    
    // Fallback to domain-based name
    return url.hostname.replace(/^www\./, '').replace(/\.(com|net|org)$/, '').replace(/[-_]/g, ' ');
  } catch {
    return "Dance Studio";
  }
}