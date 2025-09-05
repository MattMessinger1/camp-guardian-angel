// supabase/functions/verify-provider-credentials/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, email, password, provider_url } = await req.json();
    
    console.log('Verifying credentials for:', { provider, email, provider_url });
    
    // Get Browserbase credentials
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProject = Deno.env.get('BROWSERBASE_PROJECT');
    
    if (!browserbaseToken || !browserbaseProject) {
      throw new Error('Browserbase configuration missing');
    }
    
    // Create a browser session
    const sessionResponse = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserbaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: browserbaseProject,
        options: {
          headless: true,
          viewport: { width: 1920, height: 1080 }
        }
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error('Failed to create browser session');
    }
    
    const session = await sessionResponse.json();
    const sessionId = session.id;
    
    try {
      // Navigate to the provider's login page
      let loginUrl = provider_url;
      let verified = false;
      
      switch (provider) {
        case 'restaurant-resy':
          loginUrl = 'https://resy.com/signin';
          verified = await verifyResyCredentials(sessionId, email, atob(password));
          break;
          
        case 'restaurant-opentable':
          loginUrl = 'https://www.opentable.com/signin';
          verified = await verifyOpenTableCredentials(sessionId, email, atob(password));
          break;
          
        case 'fitness-peloton':
          loginUrl = 'https://studio.onepeloton.com/login';
          verified = await verifyPelotonCredentials(sessionId, email, atob(password));
          break;
          
        default:
          // Generic verification attempt
          verified = await genericCredentialVerification(sessionId, loginUrl, email, atob(password));
      }
      
      // Clean up the browser session
      await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${browserbaseToken}`
        }
      });
      
      return new Response(
        JSON.stringify({
          verified,
          provider,
          message: verified ? 'Credentials verified successfully' : 'Invalid credentials'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
      
    } catch (error) {
      // Clean up on error
      await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${browserbaseToken}`
        }
      });
      throw error;
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    
    return new Response(
      JSON.stringify({
        verified: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

async function verifyResyCredentials(sessionId: string, email: string, password: string): Promise<boolean> {
  const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
  
  // Navigate to Resy login
  await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/navigate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${browserbaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://resy.com/signin'
    })
  });
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Fill in credentials
  const scriptResult = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${browserbaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      script: `
        // Fill email
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        if (emailInput) {
          emailInput.value = '${email}';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill password
        const passwordInput = document.querySelector('input[type="password"]');
        if (passwordInput) {
          passwordInput.value = '${password}';
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Click login button
        const loginButton = document.querySelector('button[type="submit"], button:contains("Sign In")');
        if (loginButton) {
          loginButton.click();
        }
        
        return { filled: true };
      `
    })
  });
  
  // Wait for login attempt
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if login was successful
  const verifyResult = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${browserbaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      script: `
        // Check for successful login indicators
        const isLoggedIn = 
          document.querySelector('[data-test-id="account-menu"]') !== null ||
          document.querySelector('.account-dropdown') !== null ||
          document.cookie.includes('auth_token') ||
          !document.querySelector('input[type="password"]');
        
        return { loggedIn: isLoggedIn };
      `
    })
  });
  
  const result = await verifyResult.json();
  return result?.data?.loggedIn || false;
}

async function verifyOpenTableCredentials(sessionId: string, email: string, password: string): Promise<boolean> {
  // Similar implementation for OpenTable
  // ... implementation details ...
  return false; // Placeholder
}

async function verifyPelotonCredentials(sessionId: string, email: string, password: string): Promise<boolean> {
  // Similar implementation for Peloton
  // ... implementation details ...
  return false; // Placeholder
}

async function genericCredentialVerification(
  sessionId: string, 
  loginUrl: string, 
  email: string, 
  password: string
): Promise<boolean> {
  // Generic login attempt for unknown providers
  // Try common patterns for email/password fields
  return false; // Placeholder
}