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
    console.log(`🔧 Environment check:`, {
      hasBrowserbaseToken: !!Deno.env.get('BROWSERBASE_TOKEN'),
      hasBrowserbaseProject: !!Deno.env.get('BROWSERBASE_PROJECT'),
      tokenLength: Deno.env.get('BROWSERBASE_TOKEN')?.length || 0
    });
    
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
      console.error('❌ Browserbase credentials not configured:', {
        hasApiKey: !!browserbaseApiKey,
        hasProjectId: !!browserbaseProjectId
      });
      return new Response(
        JSON.stringify({ 
          error: 'Browserbase not configured',
          details: 'BROWSERBASE_TOKEN and BROWSERBASE_PROJECT must be set in Supabase Edge Functions environment',
          environment: {
            hasApiKey: !!browserbaseApiKey,
            hasProjectId: !!browserbaseProjectId
          }
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
      console.log('🔗 Session details:', JSON.stringify(session, null, 2));
      
      // Navigate to URL and take screenshot using WebSocket CDP connection
      console.log(`🌐 Connecting to browser via WebSocket: ${session.connectUrl}`);
      
      // Create WebSocket connection to CDP
      const wsUrl = session.connectUrl;
      const ws = new WebSocket(wsUrl);
      
      let screenshot = null;
      let wsError = null;
      
      const cdpPromise = new Promise((resolve, reject) => {
        let messageId = 1;
        
        ws.onopen = () => {
          console.log('✅ WebSocket connection established');
          
          // Enable Page domain
          ws.send(JSON.stringify({
            id: messageId++,
            method: 'Page.enable'
          }));
          
          // Navigate to the URL
          setTimeout(() => {
            console.log(`🌐 Navigating to ${url}...`);
            ws.send(JSON.stringify({
              id: messageId++,
              method: 'Page.navigate',
              params: { url }
            }));
          }, 500);
          
          // Wait for page load and take screenshot
          setTimeout(() => {
            console.log('📸 Taking screenshot...');
            ws.send(JSON.stringify({
              id: messageId++,
              method: 'Page.captureScreenshot',
              params: {
                format: 'png',
                quality: 90,
                fullPage: false
              }
            }));
          }, 5000);
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('📥 CDP message:', message.method || `Response ${message.id}`);
          
          if (message.method === 'Page.loadEventFired') {
            console.log('✅ Page loaded');
          }
          
          if (message.result && message.result.data) {
            screenshot = `data:image/png;base64,${message.result.data}`;
            console.log(`✅ Screenshot captured (${message.result.data.length} chars)`);
            ws.close();
            resolve(screenshot);
          }
          
          if (message.error) {
            console.error('❌ CDP error:', message.error);
            reject(new Error(`CDP error: ${message.error.message}`));
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket connection closed');
          if (!screenshot && !wsError) {
            reject(new Error('WebSocket closed without capturing screenshot'));
          }
        };
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          reject(new Error('Screenshot capture timeout'));
        }, 30000);
      });
      
      try {
        screenshot = await cdpPromise;
      } catch (cdpError) {
        console.error('❌ CDP connection error:', cdpError);
        throw new Error(`CDP connection failed: ${cdpError.message}`);
      }
      
      console.log(`✅ Real screenshot captured successfully`);
      
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