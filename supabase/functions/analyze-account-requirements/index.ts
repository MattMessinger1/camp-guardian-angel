import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { camp_url, session_id } = await req.json()
    
    if (!camp_url && !session_id) {
      return new Response(
        JSON.stringify({ error: 'camp_url or session_id required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Analyzing account requirements for:', camp_url || `session ${session_id}`)

    // For demo/testing purposes, return mock analysis
    // In production, this would use web scraping + AI analysis
    const mockAnalysis = {
      account_requirement: {
        provider_name: extractProviderName(camp_url),
        provider_url: camp_url,
        requires_account: Math.random() > 0.3, // 70% chance requires account
        account_creation_url: camp_url ? `${camp_url}/register` : undefined,
        login_detection: {
          has_login_form: true,
          has_create_account_link: true,
          account_required_for_registration: true,
          confidence_score: 85
        },
        preparation_steps: [
          "Visit the camp registration website",
          "Click 'Create Account' or 'Sign Up'",
          "Fill out basic parent/guardian information",
          "Verify your email address",
          "Log in to confirm account is active",
          "Bookmark the login page for quick access"
        ],
        estimated_setup_time: 5,
        ai_analysis: {
          complexity_score: 3, // 1-5 scale
          recommended_prep_days: 2,
          risk_factors: [
            "Email verification may take time",
            "Account approval might be manual",
            "Website may experience high traffic"
          ]
        }
      }
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    return new Response(
      JSON.stringify(mockAnalysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Account analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze account requirements' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function extractProviderName(url: string): string {
  if (!url) return 'Camp Provider'
  
  try {
    const domain = new URL(url).hostname
    const parts = domain.split('.')
    const name = parts[parts.length - 2] || domain
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return 'Camp Provider'
  }
}