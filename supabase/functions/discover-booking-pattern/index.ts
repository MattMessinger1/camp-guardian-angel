import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { venueName, platform, credentials } = await req.json()
    console.log(`🔍 Discovering booking pattern for ${venueName} on ${platform}`)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Browserbase session
    const { data: sessionData } = await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', sessionId: `discover-${Date.now()}` })
    }).then(r => r.json())
    
    const { sessionId } = sessionData
    
    // Login to platform (Resy, OpenTable, etc)
    const loginUrls = {
      'resy': 'https://resy.com/login',
      'opentable': 'https://www.opentable.com/login'
    }
    
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'navigate', sessionId, url: loginUrls[platform] || 'https://resy.com' })
    })
    
    await new Promise(r => setTimeout(r, 3000))
    
    // Login with credentials
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'type', 
        sessionId, 
        selector: 'input[type="email"]',
        text: credentials.email 
      })
    })
    
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'type', 
        sessionId, 
        selector: 'input[type="password"]',
        text: credentials.password 
      })
    })
    
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click', sessionId, selector: 'button[type="submit"]' })
    })
    
    await new Promise(r => setTimeout(r, 5000))
    
    // Search for venue
    const searchUrl = platform === 'resy' ? 'https://resy.com/search' : 'https://www.opentable.com/search'
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'navigate', sessionId, url: searchUrl })
    })
    
    await new Promise(r => setTimeout(r, 3000))
    
    // Type venue name
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'type', 
        sessionId, 
        selector: 'input[type="search"], input[placeholder*="search" i]',
        text: venueName 
      })
    })
    
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'press', sessionId, key: 'Enter' })
    })
    
    await new Promise(r => setTimeout(r, 4000))
    
    // Click first result
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'click', 
        sessionId, 
        selector: 'a[href*="/cities/"], [data-test-id="venue-card"]:first-child a'
      })
    })
    
    await new Promise(r => setTimeout(r, 4000))
    
    // Capture screenshot
    const { data: screenshotData } = await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'captureScreenshot', sessionId })
    }).then(r => r.json())
    
    // Use Vision to find booking pattern
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Find when reservations open for ${venueName}. Look for patterns like "X days in advance at Y time". Return JSON: {"pattern": "text found", "daysInAdvance": number, "openTime": "10:00 AM", "timezone": "ET"}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${screenshotData.screenshot}` }
            }
          ]
        }],
        max_tokens: 200,
        temperature: 0.1
      })
    })
    
    const visionResult = await visionResponse.json()
    const pattern = JSON.parse(visionResult.choices[0].message.content)
    
    // Close session
    await fetch(`${supabaseUrl}/functions/v1/browser-automation-simple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', sessionId })
    })
    
    return new Response(
      JSON.stringify({ success: true, pattern }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Discovery error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})