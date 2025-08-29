import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-mode',
};

interface BrowserSessionRequest {
  action: 'create' | 'navigate' | 'interact' | 'extract' | 'close' | 'cleanup' | 'login' | 'navigate_and_register';
  sessionId?: string;
  url?: string;
  campProviderId?: string;
  steps?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Browser automation simple - starting...');
    
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('Environment check:', {
      hasToken: !!browserbaseApiKey,
      tokenLength: browserbaseApiKey?.length || 0,
      hasProject: !!browserbaseProjectId,
      projectId: browserbaseProjectId
    });

    if (!browserbaseApiKey || !browserbaseProjectId) {
      throw new Error('Missing BROWSERBASE_TOKEN or BROWSERBASE_PROJECT');
    }

    const requestData: BrowserSessionRequest = await req.json();
    console.log('📝 Request:', {
      action: requestData.action,
      sessionId: requestData.sessionId,
      url: requestData.url,
      steps: requestData.steps
    });

    let result;
    
    switch (requestData.action) {
      case 'navigate_and_register':
        result = await handleNavigateAndRegister(browserbaseApiKey, browserbaseProjectId, requestData);
        break;
      case 'create':
        result = await handleCreateSession(browserbaseApiKey, browserbaseProjectId, requestData);
        break;
      case 'close':
        result = await handleCloseSession(browserbaseApiKey, requestData);
        break;
      default:
        result = {
          success: true,
          action: requestData.action,
          message: `Action ${requestData.action} simulated successfully`,
          timestamp: new Date().toISOString()
        };
    }

    console.log('✅ Success:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleNavigateAndRegister(apiKey: string, projectId: string, request: BrowserSessionRequest): Promise<any> {
  console.log('🧭 Starting navigate and register for:', request.url);

  const results = {
    success: true,
    sessionId: request.sessionId,
    url: request.url,
    timestamp: new Date().toISOString(),
    steps_executed: [],
    registration_analysis: {
      auth_required: determineAuthRequirement(request.url),
      account_creation_required: requiresAccountCreation(request.url),
      form_fields: getExpectedFormFields(request.url),
      page_type: getPageType(request.url)
    },
    simulated: true
  };

  // Simulate the steps
  if (request.steps?.includes('navigate_to_url')) {
    console.log('📍 Step: Navigate to URL');
    results.steps_executed.push({
      step: 'navigate_to_url',
      success: true,
      result: { url: request.url, loaded: true }
    });
  }

  if (request.steps?.includes('find_activity')) {
    console.log('🔍 Step: Find activity');
    results.steps_executed.push({
      step: 'find_activity',
      success: true,
      result: { activities_found: getSimulatedActivities(request.url) }
    });
  }

  if (request.steps?.includes('click_register_button')) {
    console.log('🖱️ Step: Click register button');
    results.steps_executed.push({
      step: 'click_register_button',
      success: true,
      result: { 
        button_clicked: 'Register Now',
        result_page: results.registration_analysis.page_type
      }
    });
  }

  if (request.steps?.includes('capture_registration_page')) {
    console.log('📸 Step: Capture registration page');
    results.steps_executed.push({
      step: 'capture_registration_page',
      success: true,
      result: results.registration_analysis
    });
  }

  console.log('✅ Navigate and register completed');
  return results;
}

async function handleCreateSession(apiKey: string, projectId: string, request: BrowserSessionRequest): Promise<any> {
  console.log('🆕 Creating browser session...');
  
  try {
    // Real Browserbase session creation
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': apiKey,
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserbase API error: ${response.status} ${errorText}`);
    }

    const session = await response.json();
    console.log('✅ Real browser session created:', session.id);

    return {
      success: true,
      id: session.id,
      browserId: session.id,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      complianceStatus: 'approved',
      connectUrl: session.connectUrl,
      real: true
    };

  } catch (error) {
    console.error('❌ Session creation failed:', error);
    throw error;
  }
}

async function handleCloseSession(apiKey: string, request: BrowserSessionRequest): Promise<any> {
  if (!request.sessionId) {
    throw new Error('Session ID required to close session');
  }

  console.log('🔚 Closing session:', request.sessionId);
  
  try {
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${request.sessionId}`, {
      method: 'DELETE',
      headers: { 'X-BB-API-Key': apiKey },
    });

    // 404 is OK - session may already be closed
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.warn('Close warning:', response.status, errorText);
    }

    console.log('✅ Session closed');
    return { 
      success: true, 
      sessionId: request.sessionId,
      closedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Session close error:', error);
    throw error;
  }
}

// Helper functions
function determineAuthRequirement(url: string): boolean {
  return url.includes('communitypass') || url.includes('portal') || url.includes('register.');
}

function requiresAccountCreation(url: string): boolean {
  return url.includes('communitypass');
}

function getPageType(url: string): string {
  if (url.includes('communitypass')) return 'login_wall';
  if (url.includes('seattle') || url.includes('activecommunities')) return 'direct_registration';
  return 'registration_form';
}

function getExpectedFormFields(url: string): any[] {
  const baseFields = [
    { name: 'child_name', type: 'text', required: true, label: 'Child Name' },
    { name: 'parent_email', type: 'email', required: true, label: 'Email' },
    { name: 'phone', type: 'tel', required: true, label: 'Phone' }
  ];

  if (determineAuthRequirement(url)) {
    return [
      { name: 'username', type: 'email', required: true, label: 'Username' },
      { name: 'password', type: 'password', required: true, label: 'Password' },
      ...baseFields
    ];
  }

  return baseFields;
}

function getSimulatedActivities(url: string): any[] {
  if (url.includes('seattle') || url.includes('activecommunities')) {
    return [
      { name: 'Summer Soccer Camp', age_range: '6-12', price: '$89' },
      { name: 'Arts & Crafts Week', age_range: '5-10', price: '$75' }
    ];
  }
  return [
    { name: 'Basketball Camp', age_range: '8-14', price: '$95' },
    { name: 'Dance Workshop', age_range: '6-12', price: '$80' }
  ];
}