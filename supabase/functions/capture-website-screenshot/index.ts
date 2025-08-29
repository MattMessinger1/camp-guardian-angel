import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, sessionId } = await req.json();
    
    console.log(`📸 Capturing screenshot for URL: ${url}`);
    
    if (!url) {
      return new Response(
        JSON.stringify({ 
          error: 'URL is required',
          details: 'Please provide a valid URL to capture'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Real Browserbase screenshot capture
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    if (!browserbaseApiKey || !browserbaseProjectId) {
      console.error('❌ Browserbase credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Browserbase not configured',
          details: 'BROWSERBASE_TOKEN and BROWSERBASE_PROJECT must be set'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`📸 Taking real screenshot of ${url} using Browserbase`);
    
    try {
      // Create Browserbase session
      const sessionResponse = await fetch('https://api.browserbase.com/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BB-API-Key': browserbaseApiKey,
        },
        body: JSON.stringify({
          projectId: browserbaseProjectId,
          browserSettings: {
            viewport: { width: 1280, height: 720 },
          }
        }),
      });
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('❌ Browserbase session creation failed:', sessionResponse.status, errorText);
        throw new Error(`Browserbase session creation failed: ${sessionResponse.status} ${errorText}`);
      }
      
      const session = await sessionResponse.json();
      console.log('✅ Browserbase session created:', session.id);
      
      // Navigate to URL using CDP 
      console.log(`🌐 Navigating to ${url}...`);
      
      // Use CDP to navigate to the page
      const navigateResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}/cdp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BB-API-Key': browserbaseApiKey,
        },
        body: JSON.stringify({
          method: 'Page.navigate',
          params: {
            url: url
          }
        })
      });
      
      if (!navigateResponse.ok) {
        const errorText = await navigateResponse.text();
        console.error('❌ Navigation failed:', navigateResponse.status, errorText);
        // Continue anyway - navigation might work even if response is not perfect
      }
      
      // Wait for page to load
      console.log('⏳ Waiting for page to load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot using CDP
      const screenshotResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}/cdp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BB-API-Key': browserbaseApiKey,
        },
        body: JSON.stringify({
          method: 'Page.captureScreenshot',
          params: {
            format: 'png',
            quality: 90,
            fullPage: false
          }
        })
      });
      
      if (!screenshotResponse.ok) {
        const errorText = await screenshotResponse.text();
        console.error('❌ Browserbase screenshot failed:', screenshotResponse.status, errorText);
        throw new Error(`Screenshot capture failed: ${screenshotResponse.status} ${errorText}`);
      }
      
      const screenshotResult = await screenshotResponse.json();
      
      if (!screenshotResult.result?.data) {
        console.error('❌ No screenshot data in response:', screenshotResult);
        throw new Error('No screenshot data returned from Browserbase');
      }
      
      const screenshot = `data:image/png;base64,${screenshotResult.result.data}`;
      
      console.log(`✅ Real screenshot captured (${screenshotResult.result.data.length} chars)`);
      
      // Clean up session
      try {
        await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
          method: 'DELETE',
          headers: { 'X-BB-API-Key': browserbaseApiKey }
        });
        console.log('🧹 Browserbase session cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Session cleanup warning:', cleanupError);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          screenshot: screenshot,
          url,
          sessionId,
          timestamp: new Date().toISOString(),
          simulated: false,
          browserbase_session_id: session.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } catch (browserbaseError) {
      console.error('❌ Browserbase screenshot error:', browserbaseError);
      return new Response(
        JSON.stringify({ 
          error: 'Browserbase screenshot failed',
          message: browserbaseError.message,
          details: 'Failed to capture real screenshot using Browserbase'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Screenshot capture error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Screenshot capture failed',
        message: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Note: Mock functions removed - now using real Browserbase integration