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

  // TEMPORARY: Mock browser session until we fix Browserbase API endpoint
  console.log('🚨 TEMPORARY: Using mock browser session due to API endpoint issues');
  console.log('URL for automation:', request.url);
  
  // Generate a mock session that allows the signup flow to continue
  const mockSessionData = {
    id: `mock-session-${Date.now()}`,
    url: request.url || 'https://example.com',
    status: 'RUNNING'
  };
  
  const browserSession: BrowserSession = {
    id: mockSessionData.id,
    browserId: mockSessionData.id,
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
    metadata: { mockSession: mockSessionData }
  });

  console.log('Browser session created:', browserSession.id);
  return browserSession;
}

async function navigateToUrl(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId || !request.url) {
    throw new Error('Session ID and URL required for navigation');
  }

  console.log(`🚨 MOCK: Navigating session ${request.sessionId} to ${request.url}`);

  // Check TOS compliance before navigation
  const tosCompliance = await checkTosCompliance(request.url, request.campProviderId);
  if (tosCompliance.status === 'red') {
    throw new Error(`Navigation blocked by TOS compliance: ${tosCompliance.reason}`);
  }

  // MOCK: Return successful navigation
  console.log('✅ MOCK: Navigation completed successfully');

  // Update session activity  
  await supabase.from('browser_sessions')
    .update({ 
      last_activity: new Date().toISOString(),
      current_url: request.url 
    })
    .eq('session_id', request.sessionId);

  return { 
    success: true, 
    url: request.url,
    timestamp: new Date().toISOString(),
    mockResponse: true 
  };
}

async function interactWithPage(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for interaction');
  }

  console.log(`🚨 MOCK: Interacting with page in session ${request.sessionId}`);

  // Validate parent approval for form interaction
  if (request.registrationData && !request.approvalToken) {
    throw new Error('Parent approval required for form interaction');
  }

  // MOCK: Return successful interaction
  console.log('✅ MOCK: Page interaction completed successfully');
  
  return {
    success: true,
    interactions: Object.keys(request.registrationData || {}),
    timestamp: new Date().toISOString(),
    mockResponse: true
  };
}

async function extractPageData(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required for data extraction');
  }

  console.log(`🚨 MOCK: Extracting data from session ${request.sessionId}`);

  // MOCK: Return YMCA-specific page data for camp registration
  const mockPageData = {
    title: 'YMCA of Greater Seattle - Summer Camp Registration',
    url: request.url || 'https://www.ymcacamp.org/register',
    provider: 'YMCA',
    forms: [{
      id: 'ymca-registration-form',
      action: '/submit-ymca-registration',
      method: 'POST',
      title: 'YMCA Camp Registration Form',
      fields: [
        { 
          name: 'parent_guardian_name', 
          type: 'text', 
          required: true,
          label: 'Parent/Guardian Full Name',
          help: 'As it appears on your YMCA membership'
        },
        { 
          name: 'ymca_member_id', 
          type: 'text', 
          required: false,
          label: 'YMCA Member ID (Optional)',
          help: 'Member discounts available'
        },
        { 
          name: 'parent_email', 
          type: 'email', 
          required: true,
          label: 'Primary Contact Email'
        },
        { 
          name: 'parent_cell_phone', 
          type: 'tel', 
          required: true,
          label: 'Cell Phone for Camp Updates'
        },
        { 
          name: 'camper_first_name', 
          type: 'text', 
          required: true,
          label: 'Camper\'s First Name'
        },
        { 
          name: 'camper_last_name', 
          type: 'text', 
          required: true,
          label: 'Camper\'s Last Name'
        },
        { 
          name: 'camper_dob', 
          type: 'date', 
          required: true,
          label: 'Camper\'s Date of Birth',
          help: 'Used to determine age-appropriate activities'
        },
        { 
          name: 'emergency_contact_name', 
          type: 'text', 
          required: true,
          label: 'Emergency Contact Name'
        },
        { 
          name: 'emergency_contact_phone', 
          type: 'tel', 
          required: true,
          label: 'Emergency Contact Phone'
        },
        { 
          name: 'medical_conditions', 
          type: 'textarea', 
          required: false,
          label: 'Medical Conditions/Allergies',
          help: 'Please list any conditions our staff should know about'
        },
        { 
          name: 'swim_level', 
          type: 'select', 
          required: true,
          label: 'Camper\'s Swimming Ability',
          options: ['Non-swimmer', 'Beginner', 'Intermediate', 'Advanced'],
          help: 'Required for YMCA water safety protocols'
        }
      ]
    }],
    availability: 'Available - 8 spots remaining',
    pricing: '$275/week (YMCA Members: $225/week)',
    dates: ['July 8-12, 2025', 'July 15-19, 2025'],
    requirements: {
      waiver: 'YMCA liability waiver required',
      deposit: '$50 deposit required to hold spot',
      medical_form: 'YMCA health form required before first day'
    },
    ymca_specific: true,
    mockResponse: true
  };

  console.log('✅ MOCK: Data extraction completed successfully');
  return mockPageData;
}

async function closeBrowserSession(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required to close session');
  }

  console.log(`🚨 MOCK: Closing browser session ${request.sessionId}`);

  // Update session status in database
  await supabase.from('browser_sessions')
    .update({ 
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('session_id', request.sessionId);

  console.log('✅ MOCK: Browser session closed successfully');
  return { 
    success: true, 
    sessionId: request.sessionId,
    mockResponse: true
  };
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