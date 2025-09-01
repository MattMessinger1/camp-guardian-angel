import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const query = body.query || 'activities';
    
    console.log('Searching for:', query);
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ results: [], error: 'No API key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{
          role: 'user',
          content: `Find spinning studios for "${query}" in JSON format`
        }],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return new Response(
        JSON.stringify({ results: [], error: `API error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Perplexity response structure:', Object.keys(data));
    
    // Safe access with proper error checking
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in Perplexity response:', data);
      return new Response(
        JSON.stringify({ results: [], error: 'No content returned' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return basic results for now
    const results = [{
      name: `${query} Studio`,
      address: 'NYC Location', 
      price: 35,
      description: content.substring(0, 100)
    }];

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(
      JSON.stringify({ results: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});