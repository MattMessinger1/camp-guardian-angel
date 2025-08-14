import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getSecureCorsHeaders, logSecurityEvent, extractClientInfo } from '../_shared/security.ts';

const corsHeaders = getSecureCorsHeaders();

interface PreflightCheckRequest {
  plan_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { plan_id }: PreflightCheckRequest = await req.json();

    console.log('Running preflight check for plan:', plan_id);

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('registration_plans')
      .select('account_mode, detect_url, camp_id')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single();

    if (planError || !planData) {
      throw new Error('Plan not found');
    }

    let preflightStatus = 'unknown';
    const checks = [];

    // Check autopilot credentials - validate VGS aliases exist
    if (planData.account_mode === 'autopilot') {
      const { data: credData } = await supabase
        .from('provider_credentials')
        .select('vgs_username_alias, vgs_password_alias, vgs_payment_alias, payment_type')
        .eq('user_id', user.id)
        .eq('camp_id', planData.camp_id)
        .single();

      if (credData) {
        // Validate required aliases exist
        const hasUsername = !!credData.vgs_username_alias;
        const hasPassword = !!credData.vgs_password_alias;
        const hasPayment = credData.payment_type === 'defer' || !!credData.vgs_payment_alias;
        
        if (hasUsername && hasPassword && hasPayment) {
          checks.push('✓ Autopilot credentials complete');
        } else {
          const missing = [];
          if (!hasUsername) missing.push('username');
          if (!hasPassword) missing.push('password');
          if (!hasPayment) missing.push('payment');
          checks.push(`✗ Missing VGS aliases: ${missing.join(', ')}`);
          preflightStatus = 'failed';
        }
      } else {
        checks.push('✗ No autopilot credentials stored');
        preflightStatus = 'failed';
      }
    } else {
      checks.push('ℹ Assist mode - no credentials needed');
    }

    // Check detect URL if provided
    if (planData.detect_url) {
      try {
        const response = await fetch(planData.detect_url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          checks.push(`✓ Detect URL reachable (${response.status})`);
          if (preflightStatus === 'unknown') preflightStatus = 'passed';
        } else {
          checks.push(`✗ Detect URL returned ${response.status}`);
          preflightStatus = 'failed';
        }
      } catch (error) {
        checks.push(`✗ Detect URL unreachable: ${error.message}`);
        preflightStatus = 'failed';
      }
    } else {
      checks.push('ℹ No detect URL configured');
      if (preflightStatus === 'unknown') preflightStatus = 'passed';
    }

    // Update preflight status
    const { error: updateError } = await supabase
      .from('registration_plans')
      .update({
        preflight_status: preflightStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.warn('Failed to update preflight status:', updateError.message);
    }

    // Log security event
    const clientInfo = extractClientInfo(req);
    await logSecurityEvent(
      'preflight_check',
      user.id,
      clientInfo.ip,
      clientInfo.userAgent,
      { 
        plan_id,
        camp_id: planData.camp_id,
        account_mode: planData.account_mode,
        detect_url: planData.detect_url,
        status: preflightStatus,
        checks_count: checks.length
      }
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        status: preflightStatus,
        checks: checks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in preflight-check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});