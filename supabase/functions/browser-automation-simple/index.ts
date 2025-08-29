import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-mode',
  'Access-Control-Max-Age': '86400',
};

interface BrowserSessionRequest {
  action: 'create' | 'navigate' | 'interact' | 'extract' | 'close' | 'cleanup' | 'login' | 'navigate_and_register' | 'fill_and_submit' | 'analyze_registration_page';
  sessionId?: string;
  url?: string;
  campProviderId?: string;
  steps?: string[];
  expected_fields?: string[];
  formData?: {
    childName?: string;
    childAge?: number;
    childDob?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    medicalNotes?: string;
    username?: string;
    password?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests FIRST - before any other processing
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request received');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('🚀 Browser automation simple - starting...', req.method, req.url);
    
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
      case 'fill_and_submit':
        result = await handleFillAndSubmit(browserbaseApiKey, browserbaseProjectId, requestData);
        break;
      case 'analyze_registration_page':
        result = await handleAnalyzeRegistrationPage(browserbaseApiKey, browserbaseProjectId, requestData);
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

  if (request.steps?.includes('fill_registration_form')) {
    console.log('📝 Step: Fill registration form');
    const formFillResult = simulateFormFilling(request.url, request.formData);
    results.steps_executed.push({
      step: 'fill_registration_form',
      success: formFillResult.success,
      result: formFillResult
    });
  }

  if (request.steps?.includes('submit_registration')) {
    console.log('🚀 Step: Submit registration');
    const submitResult = simulateRegistrationSubmission(request.url, request.formData);
    results.steps_executed.push({
      step: 'submit_registration',
      success: submitResult.success,
      result: submitResult
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

async function handleFillAndSubmit(apiKey: string, projectId: string, request: BrowserSessionRequest): Promise<any> {
  console.log('📝 Starting form fill and submit for:', request.url);

  const results = {
    success: true,
    sessionId: request.sessionId,
    url: request.url,
    timestamp: new Date().toISOString(),
    steps_executed: [],
    formData: request.formData,
    registration_result: null,
    simulated: true
  };

  // Step 1: Navigate to form
  console.log('📍 Step: Navigate to registration form');
  results.steps_executed.push({
    step: 'navigate_to_form',
    success: true,
    result: { url: request.url, form_detected: true }
  });

  // Step 2: Handle authentication if required
  if (determineAuthRequirement(request.url)) {
    console.log('🔐 Step: Handle authentication');
    const authResult = simulateAuthentication(request.url, request.formData);
    results.steps_executed.push({
      step: 'handle_authentication',
      success: authResult.success,
      result: authResult
    });
    
    if (!authResult.success) {
      results.success = false;
      return results;
    }
  }

  // Step 3: Fill registration form
  console.log('📝 Step: Fill registration form');
  const formFillResult = simulateFormFilling(request.url, request.formData);
  results.steps_executed.push({
    step: 'fill_form',
    success: formFillResult.success,
    result: formFillResult
  });

  if (!formFillResult.success) {
    results.success = false;
    return results;
  }

  // Step 4: Submit registration
  console.log('🚀 Step: Submit registration');
  const submitResult = simulateRegistrationSubmission(request.url, request.formData);
  results.steps_executed.push({
    step: 'submit_registration',
    success: submitResult.success,
    result: submitResult
  });

  results.registration_result = submitResult;
  results.success = submitResult.success;

  console.log('✅ Form fill and submit completed');
  return results;
}

function simulateAuthentication(url: string, formData: any): any {
  const pageType = getPageType(url);
  
  if (pageType === 'login_wall') {
    // Community Pass requires account creation/login
    if (!formData?.username || !formData?.password) {
      return {
        success: false,
        error: 'Missing authentication credentials',
        required_fields: ['username', 'password'],
        action_needed: 'provide_credentials'
      };
    }

    // Simulate account creation/login flow
    return {
      success: true,
      action_taken: 'account_created_and_logged_in',
      account_details: {
        username: formData.username,
        account_created: true,
        login_successful: true
      },
      next_step: 'registration_form_available'
    };
  }

  return {
    success: true,
    action_taken: 'no_auth_required',
    message: 'Direct registration available'
  };
}

function simulateFormFilling(url: string, formData: any): any {
  const expectedFields = getExpectedFormFields(url);
  const filledFields = [];
  const missingFields = [];

  // Check required fields
  for (const field of expectedFields) {
    const fieldValue = getFormDataValue(formData, field.name);
    
    if (fieldValue) {
      filledFields.push({
        name: field.name,
        label: field.label,
        value: fieldValue,
        type: field.type
      });
    } else if (field.required) {
      missingFields.push({
        name: field.name,
        label: field.label,
        type: field.type
      });
    }
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      error: 'Missing required form fields',
      missing_fields: missingFields,
      filled_fields: filledFields
    };
  }

  return {
    success: true,
    filled_fields: filledFields,
    form_valid: true,
    ready_for_submission: true
  };
}

function simulateRegistrationSubmission(url: string, formData: any): any {
  const pageType = getPageType(url);
  
  // Simulate different outcomes based on provider
  if (url.includes('seattle')) {
    // Seattle Parks - simpler flow
    return {
      success: true,
      registration_id: `SEA-${Date.now()}`,
      confirmation_number: `SEA${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      status: 'confirmed',
      message: 'Registration successful! You will receive a confirmation email.',
      next_steps: ['Check email for confirmation', 'Payment due on first day'],
      child_name: formData?.childName || 'Test Child',
      activity: 'Summer Soccer Camp',
      session_dates: '2024-07-15 to 2024-07-19'
    };
  } else if (url.includes('communitypass')) {
    // Community Pass - more complex flow with payment
    return {
      success: true,
      registration_id: `CP-${Date.now()}`,
      confirmation_number: `CP${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      status: 'pending_payment',
      message: 'Registration submitted! Payment required to confirm.',
      payment_required: true,
      payment_amount: '$95.00',
      payment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      next_steps: ['Complete payment within 7 days', 'Check confirmation email'],
      child_name: formData?.childName || 'Test Child',
      activity: 'Basketball Camp',
      session_dates: '2024-07-22 to 2024-07-26'
    };
  }

  // Generic provider
  return {
    success: true,
    registration_id: `REG-${Date.now()}`,
    confirmation_number: `REG${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    status: 'confirmed',
    message: 'Registration completed successfully!',
    child_name: formData?.childName || 'Test Child',
    activity: 'Camp Activity',
    session_dates: 'TBD'
  };
}

function getFormDataValue(formData: any, fieldName: string): string | null {
  if (!formData) return null;
  
  const mapping: { [key: string]: string } = {
    'child_name': 'childName',
    'parent_email': 'parentEmail', 
    'phone': 'parentPhone',
    'username': 'username',
    'password': 'password',
    'parent_name': 'parentName',
    'emergency_contact': 'emergencyContact',
    'emergency_phone': 'emergencyPhone',
    'child_age': 'childAge',
    'child_dob': 'childDob',
    'medical_notes': 'medicalNotes'
  };

  const dataKey = mapping[fieldName] || fieldName;
  return formData[dataKey] || null;
}

// New handler for analyze_registration_page action
async function handleAnalyzeRegistrationPage(apiKey: string, projectId: string, requestData: BrowserSessionRequest): Promise<any> {
  console.log('🔍 Analyzing registration page:', requestData.url);
  
  try {
    const url = requestData.url!;
    const expectedFields = requestData.expected_fields || [];
    
    // Simulate real registration page analysis
    const authRequired = determineAuthRequirement(url);
    const pageType = getPageType(url);
    const formFields = getExpectedFormFields(url);
    
    // Simulate CAPTCHA detection based on URL patterns
    const captchaDetected = url.includes('recaptcha') || 
                           url.includes('captcha') || 
                           Math.random() < 0.3; // 30% chance for realistic testing
    
    // Calculate complexity score
    const complexityScore = formFields.length + (authRequired ? 2 : 0) + (captchaDetected ? 3 : 0);
    
    // Simulate field discovery accuracy
    const discoveredFields = formFields.map(field => field.name);
    const matchedFields = expectedFields.filter(field => 
      discoveredFields.some(discovered => 
        discovered.includes(field) || field.includes(discovered)
      )
    );
    
    const accuracy = expectedFields.length > 0 ? matchedFields.length / expectedFields.length : 0.8;
    
    console.log('✅ Analysis complete:', {
      url,
      authRequired,
      pageType,
      fieldsFound: formFields.length,
      captchaDetected,
      complexityScore,
      accuracy
    });
    
    return {
      success: true,
      url,
      sessionId: requestData.sessionId,
      timestamp: new Date().toISOString(),
      analysis: {
        auth_required: authRequired,
        page_type: pageType,
        form_fields: formFields,
        captcha_detected: captchaDetected,
        complexity_score: complexityScore,
        field_discovery_accuracy: accuracy,
        expected_fields: expectedFields,
        matched_fields: matchedFields
      },
      automation_feasible: !captchaDetected && (authRequired ? false : true),
      recommended_approach: captchaDetected ? 'human_assistance' : 
                           authRequired ? 'account_creation' : 'direct_automation'
    };
    
  } catch (error) {
    console.error('❌ Registration page analysis failed:', error);
    return {
      success: false,
      error: error.message,
      url: requestData.url,
      sessionId: requestData.sessionId,
      timestamp: new Date().toISOString()
    };
  }
}