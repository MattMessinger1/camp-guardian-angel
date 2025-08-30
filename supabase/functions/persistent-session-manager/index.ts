import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SessionRequest {
  action: 'create' | 'restore' | 'update' | 'cleanup';
  session_id?: string;
  user_id?: string;
  data?: any;
}

serve(async (req) => {
  console.log('=== PERSISTENT SESSION MANAGER ===');
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Session manager request:', body);

    const { action, session_id, user_id, data } = body as SessionRequest;

    switch (action) {
      case 'create':
        return await handleCreateSession(supabase, { session_id, user_id, data });
      
      case 'restore':
        return await handleRestoreSession(supabase, { session_id, user_id });
      
      case 'update':
        return await handleUpdateSession(supabase, { session_id, user_id, data });
      
      case 'cleanup':
        return await handleCleanup(supabase);
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Session manager error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Session management failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleCreateSession(supabase: any, { session_id, user_id, data }: any) {
  console.log('[PERSISTENT-SESSION] Creating session:', session_id);
  
  const sessionData = {
    session_id: session_id || crypto.randomUUID(),
    user_id: user_id,
    status: 'initialized',
    predicted_barriers: [],
    current_step: 'analysis',
    session_data: data || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };

  try {
    // Use session_states table (which exists) instead of persistent_session_states
    const { data: insertedData, error } = await supabase
      .from('session_states')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('[PERSISTENT-SESSION] Insert error:', error);
      throw error;
    }

    console.log('[PERSISTENT-SESSION] Session created successfully:', insertedData.session_id);

    return new Response(
      JSON.stringify({
        success: true,
        session: insertedData
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[PERSISTENT-SESSION] Create session error:', error);
    
    // Return basic session data if database insert fails
    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData,
        fallback: true,
        warning: 'Session created in memory only'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleRestoreSession(supabase: any, { session_id, user_id }: any) {
  console.log('[PERSISTENT-SESSION] Restoring session:', session_id);

  try {
    // Try to get session from session_states table
    const { data: sessionData, error } = await supabase
      .from('session_states')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (error) {
      console.error('[PERSISTENT-SESSION] Restore error:', error);
      
      // If session not found, create a new one
      if (error.code === 'PGRST116') {
        console.log('[PERSISTENT-SESSION] Session not found, creating new one');
        return await handleCreateSession(supabase, { session_id, user_id, data: {} });
      }
      throw error;
    }

    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(sessionData.expires_at);
    
    if (expiresAt < now) {
      console.log('[PERSISTENT-SESSION] Session expired, creating new one');
      return await handleCreateSession(supabase, { session_id, user_id, data: {} });
    }

    console.log('[PERSISTENT-SESSION] Session restored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData,
        restored: true
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[PERSISTENT-SESSION] Restore session error:', error);
    
    // Fallback: create a new session
    return await handleCreateSession(supabase, { session_id, user_id, data: {} });
  }
}

async function handleUpdateSession(supabase: any, { session_id, user_id, data }: any) {
  console.log('[PERSISTENT-SESSION] Updating session:', session_id);

  try {
    const { data: updatedData, error } = await supabase
      .from('session_states')
      .update({
        session_data: data,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (error) {
      console.error('[PERSISTENT-SESSION] Update error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: updatedData
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[PERSISTENT-SESSION] Update session error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update session', 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleCleanup(supabase: any) {
  console.log('[PERSISTENT-SESSION] Starting cleanup process');

  try {
    // Clean expired session states
    const { data: expiredSessions, error } = await supabase
      .from('session_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('session_id');

    if (error) {
      console.error('[PERSISTENT-SESSION] Cleanup error:', error);
      throw error;
    }

    const cleanedCount = expiredSessions?.length || 0;
    console.log('[PERSISTENT-SESSION] Cleanup complete:', { cleanedSessions: cleanedCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleanedSessions: cleanedCount,
        cleanedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PERSISTENT-SESSION] Cleanup error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Cleanup failed', 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}