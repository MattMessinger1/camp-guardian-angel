import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecureCorsHeaders, logSecurityEvent, extractClientInfo } from '../_shared/security.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { camp_id } = await req.json();

    if (!camp_id) {
      return new Response(
        JSON.stringify({ error: 'camp_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract client info for logging
    const clientInfo = extractClientInfo(req);

    // Delete provider credentials for this user and camp
    const { error: deleteError } = await supabase
      .from('provider_credentials')
      .delete()
      .eq('user_id', user.id)
      .eq('camp_id', camp_id);

    if (deleteError) {
      console.error('Error deleting provider credentials:', deleteError);
      
      await logSecurityEvent(
        'delete_credentials_failed',
        user.id,
        clientInfo.ip,
        clientInfo.userAgent,
        { camp_id, error: deleteError.message }
      );

      return new Response(
        JSON.stringify({ error: 'Failed to delete credentials' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update registration plans to set account_mode to 'assist' for this user and camp
    const { error: updateError } = await supabase
      .from('registration_plans')
      .update({ 
        account_mode: 'assist',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('camp_id', camp_id);

    if (updateError) {
      console.error('Error updating registration plans:', updateError);
      // Don't fail the response since credentials were deleted successfully
    }

    // Log successful deletion
    await logSecurityEvent(
      'credentials_deleted',
      user.id,
      clientInfo.ip,
      clientInfo.userAgent,
      { camp_id, account_mode_updated: !updateError }
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Provider credentials deleted and account mode set to assist'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Delete provider credentials error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});