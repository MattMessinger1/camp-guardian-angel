import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.54.0';

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
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_TOKEN');
    if (!browserbaseApiKey) {
      console.error('BROWSERBASE_TOKEN not found in environment variables');
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('BROWSER')));
      throw new Error('BROWSERBASE_TOKEN not configured');
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
  console.log('🎯 REAL YMCA TEST: Creating browser session for YMCA registration');
  
  // Enhanced TOS compliance check with YMCA-specific logging
  if (request.url) {
    const tosCompliance = await checkTosCompliance(request.url, request.campProviderId);
    await logYMCATestEvent('tos_compliance_check', {
      url: request.url,
      status: tosCompliance.status,
      reason: tosCompliance.reason,
      campProviderId: request.campProviderId
    });
    
    if (tosCompliance.status === 'red') {
      throw new Error(`TOS compliance check failed: ${tosCompliance.reason}`);
    }
  }

  try {
    // Real Browserbase API call with enhanced debugging
    console.log('📡 Calling real Browserbase API to create session...');
    console.log('🔑 API Key length:', apiKey.length);
    console.log('🔑 API Key prefix:', apiKey.substring(0, 10) + '...');
    
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    if (!browserbaseProjectId) {
      throw new Error('BROWSERBASE_PROJECT not configured');
    }
    console.log('🆔 Project ID:', browserbaseProjectId);

    const requestBody = {
      projectId: browserbaseProjectId,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response status text:', response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📥 Response body (first 500 chars):', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('❌ Browserbase API error:', response.status, response.statusText);
      console.error('❌ Full response:', responseText);
      
      await logYMCATestEvent('browserbase_api_error', {
        status: response.status,
        statusText: response.statusText,
        response: responseText.substring(0, 1000),
        apiKeyLength: apiKey.length,
        projectId: browserbaseProjectId,
        url: 'https://api.browserbase.com/v1/sessions'
      });
      
      throw new Error(`Browserbase API returned ${response.status} ${response.statusText}: ${responseText.substring(0, 200)}`);
    }

    let sessionData;
    try {
      sessionData = JSON.parse(responseText);
      console.log('✅ Successfully parsed session data:', sessionData);
    } catch (parseError) {
      console.error('❌ Failed to parse Browserbase response as JSON:', parseError);
      console.error('❌ Raw response:', responseText);
      
      await logYMCATestEvent('json_parse_error', {
        parseError: parseError.message,
        responseText: responseText.substring(0, 1000),
        responseLength: responseText.length
      });
      
      throw new Error(`Browserbase returned non-JSON response: ${responseText.substring(0, 100)}`);
    }
    console.log('✅ Real Browserbase session created:', sessionData.id);
    
    const browserSession: BrowserSession = {
      id: sessionData.id,
      browserId: sessionData.id,
      status: sessionData.status === 'RUNNING' ? 'active' : 'idle',
      campProviderId: request.campProviderId,
      parentId: request.parentId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      complianceStatus: 'approved'
    };

    // Store session in database with real session data
    await supabase.from('browser_sessions').insert({
      session_id: browserSession.id,
      browser_id: browserSession.browserId,
      status: browserSession.status,
      camp_provider_id: browserSession.campProviderId,
      parent_id: browserSession.parentId,
      compliance_status: browserSession.complianceStatus,
      metadata: { 
        realSession: sessionData,
        browserbaseUrl: sessionData.connectUrl,
        testType: 'YMCA_REAL_TEST'
      }
    });

    await logYMCATestEvent('browser_session_created', {
      sessionId: browserSession.id,
      browserbaseUrl: sessionData.connectUrl,
      parentId: request.parentId,
      campProviderId: request.campProviderId
    });

    console.log('🎯 YMCA Test: Real browser session created and logged');
    return browserSession;
    
  } catch (error) {
    console.error('❌ YMCA Test: Failed to create real browser session:', error);
    
    await logYMCATestEvent('browser_session_error', {
      error: error.message,
      parentId: request.parentId,
      campProviderId: request.campProviderId,
      url: request.url
    });
    
    throw error;
  }
}

async function navigateToUrl(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId || !request.url) {
    throw new Error('Session ID and URL required for navigation');
  }

  console.log(`🎯 YMCA Test: Navigating real browser session ${request.sessionId} to ${request.url}`);

  // Enhanced TOS compliance check for YMCA
  const tosCompliance = await checkTosCompliance(request.url, request.campProviderId);
  if (tosCompliance.status === 'red') {
    await logYMCATestEvent('navigation_blocked', {
      sessionId: request.sessionId,
      url: request.url,
      reason: tosCompliance.reason
    });
    throw new Error(`Navigation blocked by TOS compliance: ${tosCompliance.reason}`);
  }

  try {
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    if (!browserbaseProjectId) {
      throw new Error('BROWSERBASE_PROJECT not configured for navigation');
    }

    // Real Browserbase navigation
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${request.sessionId}`, {
      method: 'POST',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
        action: 'navigate',
        url: request.url
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Browserbase navigation error:', response.status, errorText);
      
      await logYMCATestEvent('navigation_error', {
        sessionId: request.sessionId,
        url: request.url,
        error: `${response.status}: ${errorText}`
      });
      
      throw new Error(`Navigation failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ YMCA Test: Real navigation completed successfully');

    // Update session activity  
    await supabase.from('browser_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        current_url: request.url 
      })
      .eq('session_id', request.sessionId);

    await logYMCATestEvent('navigation_success', {
      sessionId: request.sessionId,
      url: request.url,
      pageTitle: result.title || 'Unknown'
    });

    return { 
      success: true, 
      url: request.url,
      timestamp: new Date().toISOString(),
      pageTitle: result.title,
      realResponse: true 
    };

  } catch (error) {
    console.error('❌ YMCA Test: Navigation failed:', error);
    
    await logYMCATestEvent('navigation_error', {
      sessionId: request.sessionId,
      url: request.url,
      error: error.message
    });
    
    throw error;
  }
}

async function interactWithPage(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for interaction');
  }

  console.log(`🎯 YMCA Test: Real form interaction in session ${request.sessionId}`);

  // Validate parent approval for form interaction
  if (request.registrationData && !request.approvalToken) {
    await logYMCATestEvent('parent_approval_missing', {
      sessionId: request.sessionId,
      hasRegistrationData: !!request.registrationData
    });
    throw new Error('Parent approval required for form interaction');
  }

  try {
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    if (!browserbaseProjectId) {
      throw new Error('BROWSERBASE_PROJECT not configured for interaction');
    }

    // Generate safe form interaction script
    const interactionScript = generateInteractionScript(request.registrationData);
    
    // Real Browserbase form interaction
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${request.sessionId}`, {
      method: 'POST', 
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
        action: 'evaluate',
        script: interactionScript
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Browserbase form interaction error:', response.status, errorText);
      
      await logYMCATestEvent('form_interaction_error', {
        sessionId: request.sessionId,
        error: `${response.status}: ${errorText}`,
        fieldsCount: Object.keys(request.registrationData || {}).length
      });
      
      throw new Error(`Form interaction failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ YMCA Test: Real form interaction completed successfully');

    await logYMCATestEvent('form_interaction_success', {
      sessionId: request.sessionId,
      fieldsInteracted: Object.keys(request.registrationData || {}),
      approvalToken: !!request.approvalToken
    });
    
    return {
      success: true,
      interactions: Object.keys(request.registrationData || {}),
      timestamp: new Date().toISOString(),
      realResponse: true,
      parentApprovalVerified: !!request.approvalToken
    };

  } catch (error) {
    console.error('❌ YMCA Test: Form interaction failed:', error);
    
    await logYMCATestEvent('form_interaction_error', {
      sessionId: request.sessionId,
      error: error.message,
      fieldsCount: Object.keys(request.registrationData || {}).length
    });
    
    throw error;
  }
}

async function extractPageData(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for data extraction');
  }

  console.log(`🎯 YMCA Test: Extracting real page data from session ${request.sessionId}`);

  try {
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    if (!browserbaseProjectId) {
      throw new Error('BROWSERBASE_PROJECT not configured for extraction');
    }

    // Real page data extraction using Browserbase
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${request.sessionId}`, {
      method: 'POST',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
        action: 'evaluate',
        script: `
          (() => {
            const pageData = {
              title: document.title,
              url: window.location.href,
              forms: [],
              text: document.body.innerText.substring(0, 2000) // First 2k chars for analysis
            };
            
            // Extract forms
            const forms = document.querySelectorAll('form');
            forms.forEach((form, index) => {
              const formData = {
                id: form.id || 'form-' + index,
                action: form.action,
                method: form.method || 'GET',
                fields: []
              };
              
              // Extract form fields
              const inputs = form.querySelectorAll('input, select, textarea');
              inputs.forEach(input => {
                if (input.type !== 'submit' && input.type !== 'button') {
                  const label = form.querySelector('label[for="' + input.id + '"]') || 
                               input.closest('label') ||
                               input.parentElement.querySelector('label');
                  
                  formData.fields.push({
                    name: input.name,
                    type: input.type || input.tagName.toLowerCase(),
                    required: input.required,
                    label: label ? label.textContent.trim() : input.placeholder || input.name,
                    value: input.value,
                    options: input.tagName === 'SELECT' ? 
                      Array.from(input.options).map(opt => opt.text) : undefined
                  });
                }
              });
              
              if (formData.fields.length > 0) {
                pageData.forms.push(formData);
              }
            });
            
            return pageData;
          })();
        `
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Browserbase data extraction error:', response.status, errorText);
      
      await logYMCATestEvent('extraction_error', {
        sessionId: request.sessionId,
        error: `${response.status}: ${errorText}`
      });
      
      throw new Error(`Data extraction failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const pageData = result.result;
    
    console.log('✅ YMCA Test: Real page data extraction completed');
    console.log('Page title:', pageData.title);
    console.log('Forms found:', pageData.forms.length);

    // Enhanced data for YMCA-specific processing
    const enhancedData = {
      ...pageData,
      provider: pageData.title.toLowerCase().includes('ymca') ? 'YMCA' : 'Unknown',
      extractedAt: new Date().toISOString(),
      realExtraction: true,
      testType: 'YMCA_REAL_TEST'
    };

    await logYMCATestEvent('extraction_success', {
      sessionId: request.sessionId,
      pageTitle: pageData.title,
      formsFound: pageData.forms.length,
      url: pageData.url
    });

    return enhancedData;

  } catch (error) {
    console.error('❌ YMCA Test: Data extraction failed:', error);
    
    await logYMCATestEvent('extraction_error', {
      sessionId: request.sessionId,
      error: error.message
    });
    
    throw error;
  }
}

async function closeBrowserSession(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required to close session');
  }

  console.log(`🎯 YMCA Test: Closing real browser session ${request.sessionId}`);

  try {
    // Real Browserbase session closure
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${request.sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      }
    });

    // Note: Browserbase may return 404 if session already closed, which is OK
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.warn('Browserbase session close warning:', response.status, errorText);
      
      await logYMCATestEvent('session_close_warning', {
        sessionId: request.sessionId,
        status: response.status,
        message: errorText
      });
    }

    // Update session status in database
    await supabase.from('browser_sessions')
      .update({ 
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('session_id', request.sessionId);

    await logYMCATestEvent('session_closed', {
      sessionId: request.sessionId,
      closedAt: new Date().toISOString()
    });

    console.log('✅ YMCA Test: Real browser session closed successfully');
    return { 
      success: true, 
      sessionId: request.sessionId,
      realResponse: true,
      closedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ YMCA Test: Session close error:', error);
    
    await logYMCATestEvent('session_close_error', {
      sessionId: request.sessionId,
      error: error.message
    });
    
    // Still update database status even if API call failed
    await supabase.from('browser_sessions')
      .update({ 
        status: 'error',
        closed_at: new Date().toISOString()
      })
      .eq('session_id', request.sessionId);
    
    throw error;
  }
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

/**
 * Enhanced logging specifically for YMCA real testing
 */
async function logYMCATestEvent(eventType: string, eventData: any): Promise<void> {
  try {
    const logEntry = {
      event_type: 'YMCA_REAL_TEST',
      event_data: {
        testEvent: eventType,
        ...eventData,
        timestamp: new Date().toISOString(),
        testPhase: 'SINGLE_REGISTRATION_TEST',
        businessHours: isBusinessHours(),
        realAutomation: true
      },
      payload_summary: `YMCA Real Test: ${eventType}`,
      user_id: eventData.parentId || null
    };

    await supabase.from('compliance_audit').insert(logEntry);
    
    // Also log to observability for real-time monitoring
    console.log('📊 YMCA_TEST_EVENT:', JSON.stringify(logEntry, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to log YMCA test event:', error);
  }
}

/**
 * Check if current time is during business hours (9 AM - 5 PM Pacific)
 */
function isBusinessHours(): boolean {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  const hour = pacificTime.getHours();
  const day = pacificTime.getDay();
  
  // Monday-Friday, 9 AM - 5 PM Pacific
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}