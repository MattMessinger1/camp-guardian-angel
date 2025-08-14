import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DateTime } from 'https://esm.sh/luxon@3.4.4';
import { getSecureCorsHeaders, logSecurityEvent, extractClientInfo } from '../_shared/security.ts';

const corsHeaders = getSecureCorsHeaders();

interface SaveReadinessRequest {
  plan_id: string;
  account_mode: 'autopilot' | 'assist';
  open_strategy: 'manual' | 'published' | 'auto';
  manual_open_at_local?: string;
  timezone?: string;
  detect_url?: string;
  credentials?: {
    vgs_username_alias: string;
    vgs_password_alias: string;
  } | null;
  payment_info?: {
    payment_type: 'card' | 'ach' | 'defer';
    amount_strategy: 'deposit' | 'full' | 'minimum';
    vgs_payment_alias?: string;
  } | null;
  rules?: Record<string, any>;
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

    const requestData: SaveReadinessRequest = await req.json();
    const { plan_id, account_mode, open_strategy, manual_open_at_local, timezone, detect_url, credentials, payment_info, rules } = requestData;

    console.log('Saving readiness for plan:', plan_id, 'mode:', account_mode, 'timezone:', timezone);

    // Convert local time to UTC if manual strategy and local time provided
    let manualOpenAtUTC: string | null = null;
    if (open_strategy === 'manual' && manual_open_at_local && timezone) {
      try {
        // Parse the local datetime string in the specified timezone
        const localDateTime = DateTime.fromISO(manual_open_at_local, { zone: timezone });
        
        if (!localDateTime.isValid) {
          throw new Error(`Invalid datetime: ${localDateTime.invalidReason}`);
        }
        
        // Convert to UTC
        manualOpenAtUTC = localDateTime.toUTC().toISO();
        console.log(`Converted ${manual_open_at_local} in ${timezone} to UTC: ${manualOpenAtUTC}`);
      } catch (error) {
        console.error('Error converting datetime:', error);
        throw new Error('Failed to convert datetime to UTC');
      }
    }

    // Update registration plan with all new fields
    const updateData: any = {
      account_mode,
      open_strategy,
      timezone: timezone || 'America/Chicago',
      updated_at: new Date().toISOString()
    };

    // Add manual_open_at in UTC if provided
    if (manualOpenAtUTC) {
      updateData.manual_open_at = manualOpenAtUTC;
    }

    // Add detect_url if provided
    if (detect_url) {
      updateData.detect_url = detect_url;
    }

    // Add rules if provided
    if (rules) {
      updateData.rules = rules;
    }

    // Clear preflight_status when readiness is updated
    updateData.preflight_status = null;

    const { error: updateError } = await supabase
      .from('registration_plans')
      .update(updateData)
      .eq('id', plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`);
    }

    // Handle credentials and payment info for autopilot mode
    if (account_mode === 'autopilot' && (credentials || payment_info)) {
      try {
        // Get plan details for camp_id
        const { data: planData } = await supabase
          .from('registration_plans')
          .select('camp_id')
          .eq('id', plan_id)
          .eq('user_id', user.id)
          .single();

        // Prepare upsert data with VGS aliases
        const updateData: any = {
          user_id: user.id,
          camp_id: planData?.camp_id || null,
          updated_at: new Date().toISOString()
        };

        if (credentials?.vgs_username_alias) {
          updateData.vgs_username_alias = credentials.vgs_username_alias;
        }
        
        if (credentials?.vgs_password_alias) {
          updateData.vgs_password_alias = credentials.vgs_password_alias;
        }

        if (payment_info) {
          updateData.payment_type = payment_info.payment_type;
          updateData.amount_strategy = payment_info.amount_strategy;
          
          if (payment_info.vgs_payment_alias) {
            updateData.vgs_payment_alias = payment_info.vgs_payment_alias;
          }
        }

        const { error: credError } = await supabase
          .from('provider_credentials')
          .upsert(updateData, {
            onConflict: 'user_id,camp_id'
          });

        if (credError) {
          throw new Error(`Failed to save credentials: ${credError.message}`);
        }

        // Log successful credential save
        const clientInfo = extractClientInfo(req);
        await logSecurityEvent(
          'credentials_saved',
          user.id,
          clientInfo.ip,
          clientInfo.userAgent,
          { 
            plan_id,
            camp_id: planData?.camp_id,
            has_username: !!credentials?.vgs_username_alias,
            has_password: !!credentials?.vgs_password_alias,
            has_payment: !!payment_info?.vgs_payment_alias,
            payment_type: payment_info?.payment_type
          }
        );
      } catch (saveError) {
        console.error('Error saving credentials:', saveError);
        throw new Error('Failed to save credential aliases');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-readiness:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});