import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface TOSMonitorRequest {
  action: 'schedule' | 'check_changes' | 'update_partnership' | 'bulk_monitor';
  urls?: string[];
  hostname?: string;
  partnershipData?: any;
  monitoringFrequency?: 'daily' | 'weekly' | 'monthly';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const requestData: TOSMonitorRequest = await req.json();
    
    console.log('TOS Monitor request:', { action: requestData.action });

    let result;
    
    switch (requestData.action) {
      case 'schedule':
        result = await scheduleMonitoring(requestData.urls || [], requestData.monitoringFrequency || 'weekly');
        break;
      case 'check_changes':
        result = await checkTOSChanges(requestData.urls || [], openaiApiKey);
        break;
      case 'update_partnership':
        result = await updatePartnershipStatus(requestData.hostname!, requestData.partnershipData);
        break;
      case 'bulk_monitor':
        result = await bulkMonitorCampProviders(openaiApiKey);
        break;
      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TOS Monitor error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scheduleMonitoring(urls: string[], frequency: 'daily' | 'weekly' | 'monthly'): Promise<any> {
  console.log(`Scheduling TOS monitoring for ${urls.length} URLs with ${frequency} frequency`);
  
  const scheduledJobs = [];
  
  for (const url of urls) {
    const hostname = new URL(url).hostname;
    
    // Calculate next check time based on frequency
    const nextCheck = getNextCheckTime(frequency);
    
    // Upsert monitoring schedule
    const { data, error } = await supabase
      .from('tos_monitoring_schedule')
      .upsert({
        hostname,
        url,
        frequency,
        next_check: nextCheck.toISOString(),
        status: 'scheduled',
        created_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Failed to schedule monitoring for', url, error);
      continue;
    }
    
    scheduledJobs.push(data);
  }
  
  console.log(`Successfully scheduled ${scheduledJobs.length} monitoring jobs`);
  
  return {
    success: true,
    scheduled: scheduledJobs.length,
    jobs: scheduledJobs
  };
}

async function checkTOSChanges(urls: string[], openaiApiKey?: string): Promise<any> {
  console.log(`Checking TOS changes for ${urls.length} URLs`);
  
  const results = [];
  
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname;
      
      // Get the last known TOS content
      const { data: lastTOS } = await supabase
        .from('tos_compliance_cache')
        .select('*')
        .eq('url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Fetch current TOS content
      const currentTOS = await fetchCurrentTOS(url);
      
      if (!currentTOS.found) {
        results.push({
          url,
          hostname,
          status: 'not_found',
          message: 'TOS not found or not accessible'
        });
        continue;
      }
      
      // Compare with previous version
      const hasChanged = !lastTOS || 
        computeContentHash(currentTOS.content) !== computeContentHash(lastTOS.analysis_result?.details?.tosContent || '');
      
      if (hasChanged) {
        console.log(`TOS changes detected for ${hostname}`);
        
        // Analyze the changes with AI if available
        let changeAnalysis = null;
        if (openaiApiKey && lastTOS) {
          changeAnalysis = await analyzeChangesWithAI(
            lastTOS.analysis_result?.details?.tosContent || '',
            currentTOS.content,
            openaiApiKey
          );
        }
        
        // Run full compliance analysis on the new TOS
        const complianceResult = await supabase.functions.invoke('tos-compliance-checker', {
          body: { url, forceRefresh: true }
        });
        
        // Log the change event
        await logTOSChange(url, {
          previousVersion: lastTOS?.analysis_result,
          newVersion: complianceResult.data,
          changeAnalysis,
          detectedAt: new Date().toISOString()
        });
        
        // Update monitoring status
        await supabase
          .from('tos_monitoring_schedule')
          .update({
            last_checked: new Date().toISOString(),
            status: 'changes_detected',
            last_change_detected: new Date().toISOString()
          })
          .eq('url', url);
        
        results.push({
          url,
          hostname,
          status: 'changed',
          changeAnalysis,
          newCompliance: complianceResult.data,
          significance: changeAnalysis?.significance || 'unknown'
        });
        
      } else {
        // No changes detected
        await supabase
          .from('tos_monitoring_schedule')
          .update({
            last_checked: new Date().toISOString(),
            status: 'no_changes'
          })
          .eq('url', url);
        
        results.push({
          url,
          hostname,
          status: 'unchanged',
          message: 'No significant changes detected'
        });
      }
      
    } catch (error) {
      console.error(`Error checking TOS changes for ${url}:`, error);
      results.push({
        url,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    success: true,
    checked: urls.length,
    results,
    changesDetected: results.filter(r => r.status === 'changed').length,
    timestamp: new Date().toISOString()
  };
}

async function updatePartnershipStatus(hostname: string, partnershipData: any): Promise<any> {
  console.log('Updating partnership status for:', hostname);
  
  try {
    const updateData = {
      hostname,
      organization_name: partnershipData.organizationName,
      status: partnershipData.status, // 'partner', 'approved', 'pending', 'rejected', 'unknown'
      partnership_type: partnershipData.partnershipType, // 'official_api', 'approved_automation', 'manual_only'
      api_endpoint: partnershipData.apiEndpoint,
      contact_email: partnershipData.contactEmail,
      last_contact: partnershipData.lastContact ? new Date(partnershipData.lastContact).toISOString() : null,
      notes: partnershipData.notes,
      confidence_score: partnershipData.confidenceScore || 0.8,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('camp_provider_partnerships')
      .upsert(updateData)
      .select()
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    // Log the partnership update
    await supabase.from('compliance_audit').insert({
      event_type: 'PARTNERSHIP_UPDATE',
      event_data: {
        hostname,
        previousStatus: 'unknown',
        newStatus: partnershipData.status,
        partnershipType: partnershipData.partnershipType,
        timestamp: new Date().toISOString()
      },
      payload_summary: `Partnership updated: ${hostname} -> ${partnershipData.status}`
    });
    
    // Invalidate TOS cache to force re-analysis with new partnership status
    await supabase
      .from('tos_compliance_cache')
      .delete()
      .like('url', `%${hostname}%`);
    
    return {
      success: true,
      partnership: data,
      message: `Partnership status updated to ${partnershipData.status}`
    };
    
  } catch (error) {
    console.error('Failed to update partnership status:', error);
    throw error;
  }
}

async function bulkMonitorCampProviders(openaiApiKey?: string): Promise<any> {
  console.log('Running bulk monitoring for all tracked camp providers');
  
  try {
    // Get all partnerships that need monitoring
    const { data: partnerships } = await supabase
      .from('camp_provider_partnerships')
      .select('hostname, organization_name, status, updated_at')
      .not('status', 'eq', 'rejected');
    
    if (!partnerships || partnerships.length === 0) {
      return {
        success: true,
        message: 'No partnerships found to monitor'
      };
    }
    
    // Get scheduled monitoring tasks
    const { data: schedules } = await supabase
      .from('tos_monitoring_schedule')
      .select('*')
      .lte('next_check', new Date().toISOString())
      .eq('status', 'scheduled');
    
    const urlsToCheck = schedules?.map(s => s.url) || [];
    
    // Also check partnerships that haven't been analyzed recently
    const stalePartnerships = partnerships.filter(p => {
      const lastUpdate = new Date(p.updated_at);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7; // Check weekly
    });
    
    const staleUrls = stalePartnerships.map(p => `https://${p.hostname}/terms`);
    const allUrls = [...new Set([...urlsToCheck, ...staleUrls])];
    
    if (allUrls.length === 0) {
      return {
        success: true,
        message: 'No URLs need monitoring at this time'
      };
    }
    
    // Check for changes
    const changeResults = await checkTOSChanges(allUrls, openaiApiKey);
    
    // Update next check times for scheduled tasks
    if (schedules) {
      for (const schedule of schedules) {
        const nextCheck = getNextCheckTime(schedule.frequency);
        await supabase
          .from('tos_monitoring_schedule')
          .update({
            next_check: nextCheck.toISOString(),
            status: 'scheduled'
          })
          .eq('id', schedule.id);
      }
    }
    
    return {
      success: true,
      monitoredUrls: allUrls.length,
      changesDetected: changeResults.changesDetected,
      results: changeResults.results,
      schedulesProcessed: schedules?.length || 0
    };
    
  } catch (error) {
    console.error('Bulk monitoring failed:', error);
    throw error;
  }
}

async function fetchCurrentTOS(url: string): Promise<{ found: boolean; content?: string; error?: string }> {
  try {
    const tosUrls = [
      url,
      `${url}/terms`,
      `${url}/terms-of-service`,
      `${url}/legal/terms`,
      `${url}/terms-and-conditions`
    ];
    
    for (const tosUrl of tosUrls) {
      try {
        const response = await fetch(tosUrl, {
          headers: { 'User-Agent': 'CampScheduleBot/1.0 (+https://campschedule.com/bot)' },
          signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
          const content = await response.text();
          return { found: true, content };
        }
      } catch (error) {
        continue;
      }
    }
    
    return { found: false, error: 'TOS not found at any common URLs' };
    
  } catch (error) {
    return { found: false, error: error.message };
  }
}

function computeContentHash(content: string): string {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

async function analyzeChangesWithAI(oldContent: string, newContent: string, openaiApiKey: string): Promise<any> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are analyzing changes between two versions of Terms of Service for a camp/recreation provider. Focus on changes that affect automated registration assistance policies.

            Key areas to analyze:
            1. Automation/bot policy changes
            2. Registration assistance policy changes
            3. API or integration policy changes
            4. General restriction or permission changes

            Response format (JSON only):
            {
              "significantChanges": true/false,
              "significance": "minor|moderate|major",
              "summary": "brief description of changes",
              "impactOnAutomation": "positive|negative|neutral",
              "keyChanges": ["specific changes found"],
              "complianceImpact": "improved|degraded|unchanged",
              "recommendedAction": "continue|review|pause|contact_provider"
            }`
          },
          {
            role: 'user',
            content: `Compare these two versions of Terms of Service:

OLD VERSION (truncated):
${oldContent.substring(0, 6000)}

NEW VERSION (truncated):
${newContent.substring(0, 6000)}

Analyze the changes and their impact on automated registration assistance tools.`
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      return {
        significantChanges: true,
        significance: 'moderate',
        summary: 'AI analysis failed to parse, manual review needed',
        impactOnAutomation: 'neutral',
        recommendedAction: 'review',
        error: parseError.message
      };
    }
    
  } catch (error) {
    console.error('AI change analysis failed:', error);
    return {
      significantChanges: true,
      significance: 'unknown',
      summary: 'Change analysis failed',
      impactOnAutomation: 'neutral',
      recommendedAction: 'review',
      error: error.message
    };
  }
}

function getNextCheckTime(frequency: 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
  }
  
  return now;
}

async function logTOSChange(url: string, changeData: any): Promise<void> {
  try {
    await supabase.from('tos_change_log').insert({
      url,
      hostname: new URL(url).hostname,
      change_detected_at: new Date().toISOString(),
      previous_analysis: changeData.previousVersion,
      new_analysis: changeData.newVersion,
      change_analysis: changeData.changeAnalysis,
      significance: changeData.changeAnalysis?.significance || 'unknown',
      impact_on_automation: changeData.changeAnalysis?.impactOnAutomation || 'neutral',
      recommended_action: changeData.changeAnalysis?.recommendedAction || 'review'
    });
    
    console.log(`Logged TOS change for ${url}`);
  } catch (error) {
    console.warn('Failed to log TOS change:', error);
  }
}