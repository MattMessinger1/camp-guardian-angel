
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check if OpenAI API key exists
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    console.log('🔧 Environment check:', {
      hasOpenAIKey: !!openAIKey,
      keyLength: openAIKey?.length || 0
    });
    
    const body = await req.json();
    const { screenshot, sessionId, model = 'gpt-4o', isolationTest = false } = body;
    
    // Log screenshot format for debugging (first 100 characters)
    console.log('Screenshot format received:', {
      hasScreenshot: !!screenshot,
      screenshotStart: screenshot ? screenshot.substring(0, 100) : 'null',
      screenshotLength: screenshot?.length || 0,
      model,
      sessionId,
      isolationTest
    });

    // If no API key, return mock data instead of failing
    if (!openAIKey) {
      console.log('❌ No OpenAI API key found, returning mock data');
      return new Response(JSON.stringify({
        success: true,
        analysis: "Mock mode - OpenAI not configured. This is a simulated analysis of the webpage screenshot.",
        model: model + '-mock',
        sessionId,
        isolationTest,
        mock: true,
        reason: 'No OpenAI API key configured',
        formComplexity: 5,
        captchaRisk: 0.3
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Request received with API key present:', {
      hasApiKey: true,
      keyLength: openAIKey.length,
      keyStart: openAIKey.substring(0, 7), // Should be "sk-..."
      model,
      hasScreenshot: !!screenshot,
      screenshotLength: screenshot?.length,
      isolationTest
    });

    // Enhanced image validation and format handling
    let processedScreenshot = screenshot;
    
    if (!screenshot) {
      console.error('❌ No screenshot provided');
      return new Response(
        JSON.stringify({ 
          error: 'Missing Screenshot',
          details: 'No screenshot data was provided in the request',
          solution: 'Please provide a valid screenshot as base64 data or data URL'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Analyzing screenshot format:', {
      hasDataPrefix: screenshot.startsWith('data:image/'),
      firstChars: screenshot.substring(0, 50),
      totalLength: screenshot.length
    });

    // Check if it's a data URL format
    if (screenshot.startsWith('data:image/')) {
      // Already in correct format
      console.log('✅ Screenshot is in data URL format');
      
      // Validate it's a supported image format
      const formatMatch = screenshot.match(/^data:image\/([^;]+)/);
      if (!formatMatch) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Data URL',
            details: 'Screenshot appears to be a data URL but format is malformed',
            received: screenshot.substring(0, 100),
            solution: 'Ensure the data URL follows format: data:image/[type];base64,[data]'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      const imageFormat = formatMatch[1];
      const supportedFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
      
      if (!supportedFormats.includes(imageFormat.toLowerCase())) {
        return new Response(
          JSON.stringify({ 
            error: 'Unsupported Image Format',
            details: `Image format "${imageFormat}" is not supported by OpenAI Vision API`,
            supportedFormats,
            solution: 'Convert image to PNG, JPEG, GIF, or WebP format'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      processedScreenshot = screenshot;
    } 
    // Check if it's raw base64 data (starts with common base64 chars)
    else if (/^[A-Za-z0-9+/]/.test(screenshot) && screenshot.length > 100) {
      console.log('🔧 Converting raw base64 to data URL format');
      processedScreenshot = `data:image/png;base64,${screenshot}`;
    }
    // Invalid format
    else {
      console.error('❌ Invalid screenshot format:', {
        startsWithData: screenshot.startsWith('data:'),
        startsWithBase64: /^[A-Za-z0-9+/]/.test(screenshot),
        length: screenshot.length,
        firstChars: screenshot.substring(0, 50)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Screenshot Format',
          details: 'Screenshot must be either a data URL (data:image/...) or raw base64 data',
          received: {
            format: screenshot.startsWith('data:') ? 'data-url-malformed' : 'unknown',
            firstChars: screenshot.substring(0, 50),
            length: screenshot.length
          },
          solution: 'Provide screenshot as: 1) data:image/png;base64,[data] or 2) raw base64 string'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Final validation before sending to OpenAI
    if (!processedScreenshot.startsWith('data:image/')) {
      console.error('❌ Final validation failed: Missing data URL prefix');
      
      return new Response(
        JSON.stringify({ 
          error: 'Screenshot Validation Failed',
          details: 'Screenshot must be in data URL format',
          debugInfo: {
            hasCorrectPrefix: processedScreenshot.startsWith('data:image/'),
            length: processedScreenshot.length
          },
          solution: 'Ensure screenshot starts with data:image/'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Force real OpenAI analysis for all screenshots (no more mock mode)
    console.log('🤖 Proceeding with real OpenAI Vision analysis');
    
    // Only return mock data if isolationTest is explicitly true
    if (isolationTest) {
      console.log('🧪 Isolation test mode - returning mock analysis');
      return new Response(JSON.stringify({
        success: true,
        analysis: "Isolation test mode - Mock analysis for testing workflow without OpenAI credits.",
        model: model + '-mock',
        sessionId,
        isolationTest: true,
        mock: true,
        testImageSize: processedScreenshot.length,
        formComplexity: 6,
        captchaRisk: 0.2,
        automationStrategy: "proceed_with_caution"
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Screenshot validation passed, format:', {
      finalFormat: processedScreenshot.match(/^data:image\/([^;]+)/)?.[1] || 'unknown',
      finalLength: processedScreenshot.length
    });

    // Test OpenAI API key by making a simple request
    console.log('Testing OpenAI API with key...');
    
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIKey}`
      }
    });
    
    if (!testResponse.ok) {
      const error = await testResponse.text();
      console.error('OpenAI API key test failed:', testResponse.status, error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OpenAI API Key',
          details: `The OpenAI API key is invalid or expired. Status: ${testResponse.status}`,
          apiError: error,
          debugInfo: {
            keyStart: openAIKey.substring(0, 7),
            status: testResponse.status
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ OpenAI API key is valid, proceeding with vision analysis...');

    // Make the actual vision API call
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model === 'gpt-4o' || model === 'gpt-4o-mini' ? model : 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Analyze this webpage screenshot. Identify any forms, input fields, buttons, and CAPTCHA or verification challenges present.'
              },
                { 
                type: 'image_url',
                image_url: {
                  url: processedScreenshot
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const visionResult = await visionResponse.text();
    
    if (!visionResponse.ok) {
      console.error('Vision API error:', visionResponse.status, visionResult);
      return new Response(
        JSON.stringify({ 
          error: 'Vision API Failed',
          details: visionResult,
          status: visionResponse.status,
          debugInfo: {
            model,
            screenshotFormat: processedScreenshot.match(/^data:image\/([^;]+)/)?.[1]
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = JSON.parse(visionResult);
    
    console.log('✅ Vision analysis completed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        analysis: data.choices[0]?.message?.content || 'No content',
        model,
        sessionId,
        isolationTest,
        usage: data.usage
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Vision analysis error:', error.message);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        data: null,
        error: { message: error.message },
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
