import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessApprovalRequest {
  token: string;
  action: 'approve' | 'decline';
  decision_reason?: string;
  manual_override?: boolean;
  override_reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessApprovalRequest = await req.json();
    
    console.log(`[PROCESS-APPROVAL] Processing ${body.action} for token: ${body.token.substring(0, 10)}...`);

    // Verify and decode secure token
    const tokenData = await verifySecureToken(body.token);
    if (!tokenData) {
      throw new Error('Invalid or expired approval token');
    }

    // Find the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('approval_token', body.token)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found or token mismatch');
    }

    if (workflow.status !== 'pending') {
      throw new Error(`Workflow already ${workflow.status}`);
    }

    if (new Date(workflow.expires_at) < new Date()) {
      throw new Error('Approval token has expired');
    }

    const now = new Date().toISOString();
    let updateData: any = {
      status: body.action === 'approve' ? 'approved' : 'declined',
      decision_reason: body.decision_reason,
      manual_override: body.manual_override || false,
      override_reason: body.override_reason
    };

    if (body.action === 'approve') {
      updateData.approved_at = now;
      updateData.approved_by = tokenData.user_id;
    } else {
      updateData.declined_at = now;
      updateData.declined_by = tokenData.user_id;
    }

    if (body.manual_override) {
      updateData.override_at = now;
      updateData.override_by = tokenData.user_id;
    }

    // Update workflow status
    const { error: updateError } = await supabase
      .from('approval_workflows')
      .update(updateData)
      .eq('id', workflow.id);

    if (updateError) {
      throw new Error(`Failed to update workflow: ${updateError.message}`);
    }

    // Create audit trail entry
    await supabase
      .from('approval_audit_trail')
      .insert({
        workflow_id: workflow.id,
        action_type: body.action === 'approve' ? 'approved' : 'declined',
        actor_type: body.manual_override ? 'admin' : 'parent',
        actor_id: tokenData.user_id,
        action_data: {
          decision_reason: body.decision_reason,
          manual_override: body.manual_override,
          override_reason: body.override_reason
        },
        previous_state: 'pending',
        new_state: body.action === 'approve' ? 'approved' : 'declined',
        metadata: {
          processed_via: 'edge_function',
          request_id: crypto.randomUUID(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }
      });

    console.log(`[PROCESS-APPROVAL] Workflow ${body.action}d successfully: ${workflow.id}`);

    // Trigger downstream actions based on workflow type and approval
    if (body.action === 'approve') {
      await handleApprovalActions(supabase, workflow);
    }

    // Update daily metrics
    await updateDailyMetrics(supabase, workflow.workflow_type, body.action);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Registration ${body.action}d successfully`,
        workflow_id: workflow.id,
        action: body.action,
        workflow_type: workflow.workflow_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PROCESS-APPROVAL] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function verifySecureToken(token: string): Promise<any> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const data = `${headerB64}.${payloadB64}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = new Uint8Array(Array.from(atob(signatureB64), c => c.charCodeAt(0)));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(data)
    );
    
    if (!isValid) {
      throw new Error('Invalid token signature');
    }
    
    const payload = JSON.parse(atob(payloadB64));
    
    // Check expiration
    if (new Date(payload.expires_at) < new Date()) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

async function handleApprovalActions(supabase: any, workflow: any) {
  try {
    switch (workflow.workflow_type) {
      case 'form_completion':
        // Resume form completion automation
        if (workflow.reservation_id) {
          await supabase.functions.invoke('resume-captcha', {
            body: {
              reservation_id: workflow.reservation_id,
              approved_action: 'form_completion'
            }
          });
        }
        break;
        
      case 'captcha_solving':
        // Resume CAPTCHA automation
        if (workflow.reservation_id) {
          await supabase.functions.invoke('resume-captcha', {
            body: {
              reservation_id: workflow.reservation_id, 
              approved_action: 'captcha_solving'
            }
          });
        }
        break;
        
      case 'payment_confirmation':
        // Resume payment processing
        if (workflow.reservation_id) {
          await supabase.functions.invoke('charge-registration', {
            body: {
              registration_id: workflow.reservation_id,
              approved_by_parent: true
            }
          });
        }
        break;
        
      default:
        console.warn(`[PROCESS-APPROVAL] Unknown workflow type: ${workflow.workflow_type}`);
    }
  } catch (error) {
    console.error(`[PROCESS-APPROVAL] Failed to handle approval actions:`, error);
  }
}

async function updateDailyMetrics(supabase: any, workflowType: string, action: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('approval_operations_metrics')
      .select('*')
      .eq('metric_date', today)
      .single();

    const updates: any = {};
    
    if (action === 'approve') {
      updates.approved_workflows = (existing?.approved_workflows || 0) + 1;
    } else {
      updates.declined_workflows = (existing?.declined_workflows || 0) + 1;
    }
    
    // Update type-specific counters
    const typeField = `${workflowType}_count`;
    updates[typeField] = (existing?.[typeField] || 0) + 1;
    
    if (existing) {
      await supabase
        .from('approval_operations_metrics')
        .update(updates)
        .eq('metric_date', today);
    } else {
      await supabase
        .from('approval_operations_metrics')
        .insert({
          metric_date: today,
          total_workflows: 1,
          ...updates
        });
    }
  } catch (error) {
    console.error(`[PROCESS-APPROVAL] Failed to update metrics:`, error);
  }
}