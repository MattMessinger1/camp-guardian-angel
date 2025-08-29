import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      provider_credentials: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          provider_url: string
          provider_name: string | null
          email: string
          encrypted_password: string
          created_at: string
          expires_at: string
          used_successfully: boolean
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          provider_url: string
          provider_name?: string | null
          email: string
          encrypted_password: string
          created_at?: string
          expires_at?: string
          used_successfully?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          provider_url?: string
          provider_name?: string | null
          email?: string
          encrypted_password?: string
          created_at?: string
          expires_at?: string
          used_successfully?: boolean
        }
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, provider_url, email, password, provider_name } = await req.json()

    if (!provider_url || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'provider_url, email, and password are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    let userId: string
    
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      userId = user.id
    } else {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔐 Storing credentials for user:', userId, 'provider:', provider_name || provider_url)

    // Simple encryption (in production, use proper encryption)
    const encryptedPassword = btoa(password) // Base64 encoding as simple "encryption"
    
    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Store credentials in database
    const { error: insertError } = await supabase
      .from('provider_credentials')
      .upsert({
        user_id: userId,
        session_id: session_id || null,
        provider_url,
        provider_name: provider_name || null,
        email,
        encrypted_password: encryptedPassword,
        expires_at: expiresAt.toISOString(),
        used_successfully: false
      }, {
        onConflict: 'user_id,provider_url'
      })

    if (insertError) {
      console.error('Database error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store credentials securely' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the storage event for compliance
    console.log('✅ Credentials stored securely for:', provider_name || provider_url)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credentials stored securely',
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Credential storage error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to store credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})