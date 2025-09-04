import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrowserAutomationResult {
  success: boolean;
  sessionId?: string;
  screenshot?: string;
  result?: string;
  error?: string;
}

interface VisionAnalysis {
  selector?: string;
  url?: string;
  found: boolean;
  confidence: number;
  reasoning: string;
}

async function callBrowserAutomation(action: string, sessionId: string, additionalData: any = {}): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const response = await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      action,
      sessionId,
      ...additionalData
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browser automation failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function analyzeWithVision(screenshot: string, prompt: string): Promise<VisionAnalysis> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API key');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}. Respond with JSON: {"found": boolean, "selector": "css selector if found", "url": "extracted url if visible", "confidence": 0-100, "reasoning": "explanation"}`
            },
            {
              type: 'image_url',
              image_url: { url: screenshot }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision analysis failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      found: false,
      confidence: 0,
      reasoning: 'Failed to parse vision response',
    };
  }
}

async function discoverResyUrl(venueName: string): Promise<string> {
  console.log(`🔍 Starting URL discovery for: ${venueName}`);
  
  try {
    // 1. Create session and navigate to Resy
    const createResult = await callBrowserAutomation('create', '', {});
    const sessionId = createResult.sessionId;
    console.log(`📱 Created session: ${sessionId}`);
    
    // 2. Navigate to Resy
    await callBrowserAutomation('navigate', sessionId, { url: 'https://resy.com' });
    console.log('🌐 Navigated to Resy');
    
    // 3. Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Take screenshot of search page
    const screenshotResult = await callBrowserAutomation('screenshot', sessionId, {});
    const searchScreenshot = screenshotResult.screenshot;
    console.log('📸 Took search page screenshot');
    
    // 5. Use Vision to find search input
    const searchAnalysis = await analyzeWithVision(
      searchScreenshot,
      `Find the search input field on this Resy page where I can search for "${venueName}". Look for search boxes, input fields, or search buttons.`
    );
    
    console.log('🔍 Search analysis:', searchAnalysis);
    
    if (!searchAnalysis.found || !searchAnalysis.selector) {
      console.log('⚠️ Could not find search field, trying common selectors');
      // Fallback to common search selectors
      try {
        await callBrowserAutomation('type', sessionId, {
          selector: 'input[type="search"], input[placeholder*="Search"], #search-query',
          text: venueName
        });
      } catch (error) {
        console.log('❌ Could not type in search field, constructing URL');
        const normalizedName = venueName.toLowerCase().replace(/\s+/g, '-');
        return `https://resy.com/cities/ny/${normalizedName}`;
      }
    } else {
      // 6. Type venue name in search
      await callBrowserAutomation('type', sessionId, {
        selector: searchAnalysis.selector,
        text: venueName
      });
    }
    
    // 7. Press Enter to search
    await callBrowserAutomation('press', sessionId, { key: 'Enter' });
    console.log('🔍 Performed search');
    
    // 8. Wait for results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 9. Take screenshot of results
    const resultsScreenshot = await callBrowserAutomation('screenshot', sessionId, {});
    
    // 10. Use Vision to find the right restaurant result
    const resultsAnalysis = await analyzeWithVision(
      resultsScreenshot.screenshot,
      `Find the restaurant link for "${venueName}" in the search results. Look for clickable links or cards that match this restaurant name.`
    );
    
    console.log('🎯 Results analysis:', resultsAnalysis);
    
    if (resultsAnalysis.found && resultsAnalysis.selector) {
      // 11. Click on the restaurant result
      await callBrowserAutomation('click', sessionId, {
        selector: resultsAnalysis.selector
      });
      
      // 12. Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 13. Get the final URL
      const urlResult = await callBrowserAutomation('evaluate', sessionId, {
        script: 'window.location.href'
      });
      
      console.log(`✅ Discovered URL: ${urlResult.result}`);
      return urlResult.result;
    } else {
      // Fallback: construct URL based on venue name
      const normalizedName = venueName.toLowerCase().replace(/\s+/g, '-');
      const constructedUrl = `https://resy.com/cities/ny/${normalizedName}`;
      console.log(`⚠️ Could not find specific result, constructed URL: ${constructedUrl}`);
      return constructedUrl;
    }
    
  } catch (error) {
    console.error('❌ URL discovery failed:', error);
    // Final fallback
    const normalizedName = venueName.toLowerCase().replace(/\s+/g, '-');
    const fallbackUrl = `https://resy.com/cities/ny/${normalizedName}`;
    console.log(`🆘 Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueName, provider = 'resy' } = await req.json();
    
    if (!venueName) {
      return new Response(
        JSON.stringify({ error: 'venueName is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎯 Discovering URL for: ${venueName} on ${provider}`);
    
    let discoveredUrl: string;
    
    if (provider === 'resy') {
      discoveredUrl = await discoverResyUrl(venueName);
    } else {
      throw new Error(`Provider ${provider} not supported yet`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        venueName,
        provider,
        discoveredUrl,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ URL discovery error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});