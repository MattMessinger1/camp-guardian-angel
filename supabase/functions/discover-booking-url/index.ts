import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrowserbaseSession {
  id: string;
  status: string;
}

interface VisionAnalysis {
  selector?: string;
  url?: string;
  found: boolean;
  confidence: number;
  reasoning: string;
}

async function createBrowserbaseSession(): Promise<string> {
  const token = Deno.env.get('BROWSERBASE_TOKEN');
  const projectId = Deno.env.get('BROWSERBASE_PROJECT');
  
  if (!token || !projectId) {
    throw new Error('Missing Browserbase credentials');
  }

  const response = await fetch('https://api.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BB-API-Key': token,
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  const session = await response.json() as BrowserbaseSession;
  return session.id;
}

async function navigateAndWait(sessionId: string, url: string): Promise<void> {
  const token = Deno.env.get('BROWSERBASE_TOKEN');
  
  const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-BB-API-Key': token!,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Navigation failed: ${response.status}`);
  }

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
}

async function takeScreenshot(sessionId: string): Promise<string> {
  const token = Deno.env.get('BROWSERBASE_TOKEN');
  
  const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/screenshot`, {
    method: 'GET',
    headers: {
      'X-BB-API-Key': token!,
    },
  });

  if (!response.ok) {
    throw new Error(`Screenshot failed: ${response.status}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:image/png;base64,${base64}`;
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
  
  // 1. Create Browserbase session
  const sessionId = await createBrowserbaseSession();
  console.log(`📱 Created session: ${sessionId}`);
  
  try {
    // 2. Navigate to Resy
    await navigateAndWait(sessionId, 'https://resy.com');
    console.log('🌐 Navigated to Resy');
    
    // 3. Take screenshot of search page
    const searchScreenshot = await takeScreenshot(sessionId);
    console.log('📸 Took search page screenshot');
    
    // 4. Use Vision to find and interact with search
    const searchAnalysis = await analyzeWithVision(
      searchScreenshot,
      `Find the search input field on this Resy page where I can search for "${venueName}". Look for search boxes, input fields, or search buttons.`
    );
    
    console.log('🔍 Search analysis:', searchAnalysis);
    
    if (!searchAnalysis.found) {
      throw new Error('Could not find search functionality on Resy');
    }
    
    // For now, return a constructed URL based on venue name
    // This is a simplified version until we can implement browser interactions
    const normalizedName = venueName.toLowerCase().replace(/\s+/g, '-');
    const constructedUrl = `https://resy.com/cities/ny/${normalizedName}`;
    
    console.log(`✅ Constructed URL: ${constructedUrl}`);
    return constructedUrl;
    
  } finally {
    // Clean up session
    try {
      const token = Deno.env.get('BROWSERBASE_TOKEN');
      await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'X-BB-API-Key': token! },
      });
      console.log('🧹 Cleaned up session');
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
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