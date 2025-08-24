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

interface BrowserSessionRequest {
  action: 'create' | 'navigate' | 'interact' | 'extract' | 'close';
  sessionId?: string;
  url?: string;
  campProviderId?: string;
  parentId?: string;
  registrationData?: any;
  approvalToken?: string;
}

interface BrowserSession {
  id: string;
  browserId: string;
  status: 'active' | 'idle' | 'closed' | 'error';
  campProviderId?: string;
  parentId?: string;
  createdAt: string;
  lastActivity: string;
  complianceStatus: 'approved' | 'pending' | 'rejected';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_API_KEY');
    if (!browserbaseApiKey) {
      console.error('BROWSERBASE_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('BROWSER')));
      throw new Error('BROWSERBASE_API_KEY not configured');
    }
    console.log('API key found, length:', browserbaseApiKey.length);

    const requestData: BrowserSessionRequest = await req.json();
    console.log('Browser automation request:', { 
      action: requestData.action, 
      sessionId: requestData.sessionId,
      url: requestData.url 
    });

    let result;
    
    switch (requestData.action) {
      case 'create':
        result = await createBrowserSession(browserbaseApiKey, requestData);
        break;
      case 'navigate':
        result = await navigateToUrl(browserbaseApiKey, requestData);
        break;
      case 'interact':
        result = await interactWithPage(browserbaseApiKey, requestData);
        break;
      case 'extract':
        result = await extractPageData(browserbaseApiKey, requestData);
        break;
      case 'close':
        result = await closeBrowserSession(browserbaseApiKey, requestData);
        break;
      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

    // Log compliance audit
    await logComplianceEvent(requestData, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Browser automation error:', error);
    
    // Log error for compliance
    await logComplianceEvent(null, { error: error.message }, 'error');
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createBrowserSession(apiKey: string, request: BrowserSessionRequest): Promise<BrowserSession> {
  console.log('Creating new browser session...');
  
  // Check TOS compliance first
  if (request.url) {
    const tosCompliance = await checkTosCompliance(request.url, request.campProviderId);
    if (tosCompliance.status === 'red') {
      throw new Error(`TOS compliance check failed: ${tosCompliance.reason}`);
    }
  }

  const projectId = Deno.env.get('BROWSERBASE_PROJECT_ID');
  if (!projectId) {
    console.error('BROWSERBASE_PROJECT_ID not found in environment variables');
    console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('BROWSER')));
    throw new Error('BROWSERBASE_PROJECT_ID not configured');
  }

  console.log('Creating session with project ID:', projectId);
  console.log('Using API key ending in:', apiKey.slice(-8));

  const response = await fetch('https://www.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      keepAlive: true,
      timeout: 300000, // 5 minutes
    }),
  });

  console.log('Browserbase response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Browserbase error response:', errorText);
    throw new Error(`Failed to create browser session (${response.status}): ${errorText}`);
  }

  let sessionData;
  try {
    const responseText = await response.text();
    console.log('Browserbase response:', responseText);
    sessionData = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse Browserbase response:', parseError);
    throw new Error('Invalid JSON response from Browserbase API');
  }
  
  const browserSession: BrowserSession = {
    id: sessionData.id,
    browserId: sessionData.id,
    status: 'active',
    campProviderId: request.campProviderId,
    parentId: request.parentId,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    complianceStatus: 'approved'
  };

  // Store session in database
  await supabase.from('browser_sessions').insert({
    session_id: browserSession.id,
    browser_id: browserSession.browserId,
    status: browserSession.status,
    camp_provider_id: browserSession.campProviderId,
    parent_id: browserSession.parentId,
    compliance_status: browserSession.complianceStatus,
    metadata: { browserbaseData: sessionData }
  });

  console.log('Browser session created:', browserSession.id);
  return browserSession;
}

async function navigateToUrl(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId || !request.url) {
    throw new Error('Session ID and URL required for navigation');
  }

  console.log(`Navigating session ${request.sessionId} to ${request.url}`);

  // Check TOS compliance before navigation
  const tosCompliance = await checkTosCompliance(request.url, request.campProviderId);
  if (tosCompliance.status === 'red') {
    throw new Error(`Navigation blocked by TOS compliance: ${tosCompliance.reason}`);
  }

  const response = await fetch(`https://www.browserbase.com/v1/sessions/${request.sessionId}/navigate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: request.url,
      waitUntil: 'networkidle0',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Navigation failed: ${errorText}`);
  }

  // Update session activity
  await supabase.from('browser_sessions')
    .update({ 
      last_activity: new Date().toISOString(),
      current_url: request.url 
    })
    .eq('session_id', request.sessionId);

  const result = await response.json();
  console.log('Navigation completed');
  return result;
}

async function interactWithPage(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for interaction');
  }

  console.log(`Interacting with page in session ${request.sessionId}`);

  // Validate parent approval for form interaction
  if (request.registrationData && !request.approvalToken) {
    throw new Error('Parent approval required for form interaction');
  }

  // Execute page interactions (click, type, etc.)
  const response = await fetch(`https://www.browserbase.com/v1/sessions/${request.sessionId}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: generateInteractionScript(request.registrationData),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Page interaction failed: ${errorText}`);
  }

  const result = await response.json();
  console.log('Page interaction completed');
  return result;
}

async function extractPageData(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for data extraction');
  }

  console.log(`Extracting data from session ${request.sessionId}`);

  const response = await fetch(`https://www.browserbase.com/v1/sessions/${request.sessionId}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: `
        // Extract session data, availability, forms, etc.
        const sessionData = {
          title: document.title,
          url: window.location.href,
          forms: Array.from(document.forms).map(form => ({
            id: form.id,
            action: form.action,
            method: form.method,
            fields: Array.from(form.elements).map(el => ({
              name: el.name,
              type: el.type,
              required: el.required
            }))
          })),
          availability: document.querySelector('[data-availability], .availability, .spots-available')?.textContent,
          pricing: document.querySelector('[data-price], .price, .cost')?.textContent,
          dates: Array.from(document.querySelectorAll('[data-date], .date, .session-date')).map(el => el.textContent)
        };
        return sessionData;
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Data extraction failed: ${errorText}`);
  }

  const result = await response.json();
  console.log('Data extraction completed');
  return result;
}

async function closeBrowserSession(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required to close session');
  }

  console.log(`Closing browser session ${request.sessionId}`);

  const response = await fetch(`https://www.browserbase.com/v1/sessions/${request.sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to close session: ${errorText}`);
  }

  // Update session status in database
  await supabase.from('browser_sessions')
    .update({ 
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('session_id', request.sessionId);

  console.log('Browser session closed');
  return { success: true, sessionId: request.sessionId };
}

async function checkTosCompliance(url: string, campProviderId?: string): Promise<{
  status: 'green' | 'yellow' | 'red';
  reason?: string;
  confidence: number;
}> {
  try {
    // Call the simple TOS checker
    const response = await supabase.functions.invoke('simple-tos-check', {
      body: { url }
    });

    if (response.error) {
      console.error('TOS compliance check error:', response.error);
      return { status: 'yellow', reason: 'Unable to verify TOS compliance', confidence: 0.5 };
    }

    // Convert simple result to expected format
    return {
      status: response.data.status,
      reason: response.data.reason,
      confidence: response.data.status === 'green' ? 0.9 : response.data.status === 'yellow' ? 0.6 : 0.1
    };
  } catch (error) {
    console.error('TOS compliance check failed:', error);
    return { status: 'yellow', reason: 'TOS compliance check failed', confidence: 0.3 };
  }
}

function generateInteractionScript(registrationData: any): string {
  if (!registrationData) {
    return 'console.log("No interaction data provided");';
  }

  // Generate safe interaction script based on registration data
  return `
    console.log("Starting form interaction with parent approval");
    
    // Fill form fields safely
    ${Object.entries(registrationData).map(([key, value]) => `
      const ${key}Field = document.querySelector('[name="${key}"], #${key}');
      if (${key}Field && ${key}Field.type !== 'submit') {
        ${key}Field.value = ${JSON.stringify(value)};
        ${key}Field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `).join('')}
    
    console.log("Form interaction completed");
  `;
}

async function logComplianceEvent(request: any, result: any, level: string = 'info'): Promise<void> {
  try {
    await supabase.from('compliance_audit').insert({
      event_type: 'BROWSER_AUTOMATION',
      event_data: {
        request: request ? {
          action: request.action,
          url: request.url,
          campProviderId: request.campProviderId,
          hasApproval: !!request.approvalToken
        } : null,
        result: result ? {
          success: !result.error,
          error: result.error,
          sessionId: result.sessionId || result.id
        } : null,
        level,
        timestamp: new Date().toISOString(),
        userAgent: 'Browser Automation Service'
      },
      payload_summary: `Browser automation ${request?.action || 'unknown'} - ${level}`
    });
  } catch (error) {
    console.error('Failed to log compliance event:', error);
  }
}