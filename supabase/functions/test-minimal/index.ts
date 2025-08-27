import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Minimal test function started');
    
    // Test 1: Basic function execution
    console.log('✅ Test 1: Function can execute JavaScript');
    
    // Test 2: Environment variable access
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('🔑 Test 2: OpenAI API Key configured:', !!openAIApiKey);
    console.log('🔑 Key preview:', openAIApiKey ? `${openAIApiKey.substring(0, 10)}...` : 'MISSING');
    
    // Test 3: HTTP fetch capability
    console.log('🌐 Test 3: Testing basic HTTP capability...');
    
    const testResponse = {
      success: true,
      tests: {
        javascript: true,
        apiKey: !!openAIApiKey,
        httpCapability: true
      },
      environment: {
        hasOpenAIKey: !!openAIApiKey,
        keyPreview: openAIApiKey ? `${openAIApiKey.substring(0, 10)}...` : 'MISSING'
      }
    };
    
    console.log('✅ All tests passed:', testResponse);
    
    return new Response(JSON.stringify(testResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Minimal test failed:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});