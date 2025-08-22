import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateWorkflowRequest {
  user_id: string;
  reservation_id?: string;
  session_id?: string;
  workflow_type: 'form_completion' | 'captcha_solving' | 'payment_confirmation';
  title: string;
  description?: string;
  context_data?: Record<string, any>;
  approval_criteria?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expires_in_minutes?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateWorkflowRequest = await req.json();
    
    console.log(`[CREATE-APPROVAL-WORKFLOW] Creating workflow for user: ${body.user_id}, type: ${body.workflow_type}`);

    // Generate secure approval token
    const approvalToken = await generateSecureToken({
      user_id: body.user_id,
      workflow_type: body.workflow_type,
      expires_at: new Date(Date.now() + (body.expires_in_minutes || 30) * 60 * 1000)
    });

    // Create approval workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('approval_workflows')
      .insert({
        user_id: body.user_id,
        reservation_id: body.reservation_id,
        session_id: body.session_id,
        workflow_type: body.workflow_type,
        title: body.title,
        description: body.description,
        context_data: body.context_data || {},
        approval_criteria: body.approval_criteria || {},
        priority: body.priority || 'normal',
        approval_token: approvalToken,
        expires_at: new Date(Date.now() + (body.expires_in_minutes || 30) * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (workflowError) {
      throw new Error(`Failed to create workflow: ${workflowError.message}`);
    }

    // Create audit trail entry
    await supabase
      .from('approval_audit_trail')
      .insert({
        workflow_id: workflow.id,
        action_type: 'created',
        actor_type: 'system',
        action_data: {
          workflow_type: body.workflow_type,
          priority: body.priority || 'normal'
        },
        new_state: 'pending',
        metadata: {
          created_via: 'edge_function',
          request_id: crypto.randomUUID()
        }
      });

    // Send parent notification
    const notificationResult = await supabase.functions.invoke('notify-parent', {
      body: {
        user_id: body.user_id,
        workflow_id: workflow.id,
        workflow_type: body.workflow_type,
        title: body.title,
        approval_token: approvalToken,
        expires_at: workflow.expires_at
      }
    });

    if (notificationResult.error) {
      console.error(`[CREATE-APPROVAL-WORKFLOW] Notification failed:`, notificationResult.error);
    }

    // Update workflow with notification status
    await supabase
      .from('approval_workflows')
      .update({
        notification_sent_at: new Date().toISOString(),
        notification_method: notificationResult.error ? null : 'both',
        notification_attempts: 1
      })
      .eq('id', workflow.id);

    console.log(`[CREATE-APPROVAL-WORKFLOW] Workflow created successfully: ${workflow.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflow_id: workflow.id,
        approval_token: approvalToken,
        expires_at: workflow.expires_at,
        notification_sent: !notificationResult.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-APPROVAL-WORKFLOW] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateSecureToken(payload: any): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = btoa(JSON.stringify(payload));
  
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const data = `${header}.${payloadB64}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${header}.${payloadB64}.${signatureB64}`;
}