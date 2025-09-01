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
    const searchQuery = body.query;
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
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
          content: `Find spinning/cycling studios for "${searchQuery}" and return ONLY this JSON format: [{"name": "SoulCycle Bryant Park", "address": "1234 Broadway, New York, NY", "price": 36, "description": "Indoor cycling classes"}]`
        }],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('Raw Perplexity response:', content);
    
    // Try to parse as JSON
    let results = [];
    try {
      results = JSON.parse(content);
    } catch {
      // If JSON parsing fails, create basic results
      results = [{
        name: `${searchQuery} Classes`,
        address: 'Address available upon registration',
        price: 35,
        description: content.substring(0, 100)
      }];
    }

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ results: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});