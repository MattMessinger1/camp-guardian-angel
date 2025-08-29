import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  action: 'analyze_and_notify' | 'send_context_notification' | 'queue_barrier_notifications';
  userId: string;
  sessionId: string;
  barriers: BarrierInfo[];
  providerInfo?: {
    name: string;
    url: string;
    type: string;
  };
  userPreferences?: {
    phone?: string;
    email?: string;
    notificationMethod: 'sms' | 'email' | 'both';
  };
}

interface BarrierInfo {
  type: 'account_creation' | 'login' | 'captcha' | 'payment' | 'form_completion';
  stage: string;
  likelihood: number;
  context: Record<string, any>;
  estimatedDuration: number;
  requiresParentIntervention: boolean;
  urgent: boolean;
}

interface NotificationTemplate {
  type: string;
  stage: string;
  template: string;
  urgency: 'low' | 'medium' | 'high';
  timing: 'immediate' | 'pre_barrier' | 'at_barrier' | 'reminder';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const requestData: NotificationRequest = await req.json();
    console.log('[SMART-NOTIFICATIONS] Processing:', requestData.action);

    switch (requestData.action) {
      case 'analyze_and_notify':
        return await handleAnalyzeAndNotify(supabase, requestData);
      case 'send_context_notification':
        return await handleContextNotification(supabase, requestData);
      case 'queue_barrier_notifications':
        return await handleQueueBarrierNotifications(supabase, requestData);
      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

  } catch (error: any) {
    console.error('[SMART-NOTIFICATIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAnalyzeAndNotify(supabase: any, requestData: NotificationRequest) {
  const { userId, sessionId, barriers, providerInfo, userPreferences } = requestData;
  
  console.log('[SMART-NOTIFICATIONS] Analyzing barriers for intelligent notifications');

  // Categorize and prioritize barriers
  const urgentBarriers = barriers.filter(b => b.urgent || b.likelihood > 0.8);
  const upcomingBarriers = barriers.filter(b => !b.urgent && b.likelihood > 0.5);
  
  // Generate notification sequence
  const notificationSequence = await generateNotificationSequence(
    barriers, 
    providerInfo, 
    userPreferences
  );

  // Send immediate notifications for urgent barriers
  for (const barrier of urgentBarriers) {
    await sendContextualNotification(supabase, {
      userId,
      sessionId,
      barrier,
      providerInfo,
      userPreferences,
      timing: 'immediate'
    });
  }

  // Queue pre-notifications for upcoming barriers
  for (const notification of notificationSequence) {
    await queueNotification(supabase, {
      userId,
      sessionId,
      notification,
      scheduledAt: notification.scheduledAt
    });
  }

  // Log notification strategy
  await supabase.from('compliance_audit').insert({
    user_id: userId,
    event_type: 'SMART_NOTIFICATION_ANALYSIS',
    event_data: {
      session_id: sessionId,
      total_barriers: barriers.length,
      urgent_barriers: urgentBarriers.length,
      notification_sequence_length: notificationSequence.length,
      provider_info: providerInfo,
      timestamp: new Date().toISOString()
    },
    payload_summary: `Smart notification analysis: ${barriers.length} barriers, ${urgentBarriers.length} urgent`
  });

  return new Response(
    JSON.stringify({
      success: true,
      urgentBarriers: urgentBarriers.length,
      upcomingBarriers: upcomingBarriers.length,
      notificationsScheduled: notificationSequence.length,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleContextNotification(supabase: any, requestData: NotificationRequest) {
  const { userId, barriers, providerInfo, userPreferences } = requestData;
  
  if (!barriers.length) {
    throw new Error('No barriers provided for context notification');
  }

  const barrier = barriers[0]; // Process first barrier
  const notification = await generateContextualMessage(barrier, providerInfo);
  
  // Send via appropriate channel
  if (userPreferences?.notificationMethod === 'sms' || userPreferences?.notificationMethod === 'both') {
    if (userPreferences.phone) {
      await sendSMS(supabase, {
        to: userPreferences.phone,
        message: notification.smsMessage,
        userId,
        context: { barrier: barrier.type, stage: barrier.stage }
      });
    }
  }

  if (userPreferences?.notificationMethod === 'email' || userPreferences?.notificationMethod === 'both') {
    if (userPreferences.email) {
      await sendEmail(supabase, {
        to: userPreferences.email,
        subject: notification.emailSubject,
        html: notification.emailHtml,
        userId,
        context: { barrier: barrier.type, stage: barrier.stage }
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      notificationSent: true,
      channels: [
        userPreferences?.phone ? 'sms' : null,
        userPreferences?.email ? 'email' : null
      ].filter(Boolean),
      barrier: barrier.type
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleQueueBarrierNotifications(supabase: any, requestData: NotificationRequest) {
  const { userId, sessionId, barriers } = requestData;
  
  console.log('[SMART-NOTIFICATIONS] Queuing barrier notifications');

  const notifications = [];
  let cumulativeDelay = 0;

  for (const barrier of barriers) {
    // Schedule pre-notification 2 minutes before expected barrier
    const preNotificationTime = new Date();
    preNotificationTime.setMinutes(preNotificationTime.getMinutes() + cumulativeDelay - 2);

    // Schedule at-barrier notification
    const atBarrierTime = new Date();
    atBarrierTime.setMinutes(atBarrierTime.getMinutes() + cumulativeDelay);

    notifications.push({
      type: 'pre_barrier',
      barrier,
      scheduledAt: preNotificationTime.toISOString(),
      priority: barrier.urgent ? 'high' : 'medium'
    });

    notifications.push({
      type: 'at_barrier',
      barrier,
      scheduledAt: atBarrierTime.toISOString(),
      priority: barrier.requiresParentIntervention ? 'high' : 'low'
    });

    cumulativeDelay += barrier.estimatedDuration;
  }

  // Store queued notifications
  for (const notification of notifications) {
    await supabase.from('notification_queue').insert({
      user_id: userId,
      session_id: sessionId,
      notification_type: notification.type,
      barrier_info: notification.barrier,
      scheduled_at: notification.scheduledAt,
      priority: notification.priority,
      status: 'queued'
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      notificationsQueued: notifications.length,
      totalEstimatedDuration: cumulativeDelay,
      barriers: barriers.map(b => ({ type: b.type, stage: b.stage, duration: b.estimatedDuration }))
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateNotificationSequence(
  barriers: BarrierInfo[], 
  providerInfo: any, 
  userPreferences: any
): Promise<any[]> {
  const templates = getNotificationTemplates();
  const sequence = [];
  let currentTime = new Date();

  for (const barrier of barriers) {
    const template = templates.find(t => t.type === barrier.type && t.stage === barrier.stage);
    if (!template) continue;

    // Schedule pre-notification
    const preNotificationTime = new Date(currentTime);
    preNotificationTime.setMinutes(preNotificationTime.getMinutes() - 2);

    sequence.push({
      type: 'pre_barrier',
      barrier,
      template,
      scheduledAt: preNotificationTime.toISOString(),
      message: generateMessage(template, barrier, providerInfo, 'pre_barrier')
    });

    // Update time for next barrier
    currentTime.setMinutes(currentTime.getMinutes() + barrier.estimatedDuration);
  }

  return sequence;
}

async function generateContextualMessage(barrier: BarrierInfo, providerInfo: any) {
  const providerName = providerInfo?.name || 'the camp provider';
  const context = barrier.context || {};

  const messages = {
    account_creation: {
      smsMessage: `🏕️ ${providerName} requires account creation for registration. We'll guide you through this step. Reply READY when you can assist (~${barrier.estimatedDuration} min)`,
      emailSubject: `Account Setup Needed - ${providerName} Registration`,
      emailHtml: `
        <h2>Account Creation Required</h2>
        <p>To complete your registration with ${providerName}, we need to create an account.</p>
        <p><strong>What's needed:</strong></p>
        <ul>
          <li>Email address for the account</li>
          <li>Secure password</li>
          <li>Basic profile information</li>
        </ul>
        <p><strong>Estimated time:</strong> ${barrier.estimatedDuration} minutes</p>
        <p>We'll guide you through each step to make this as quick as possible.</p>
      `
    },
    captcha: {
      smsMessage: `🤖 CAPTCHA detected during ${barrier.stage} with ${providerName}. We'll help you solve it. This should take ~${barrier.estimatedDuration} min.`,
      emailSubject: `CAPTCHA Assistance Needed - ${providerName}`,
      emailHtml: `
        <h2>CAPTCHA Challenge Detected</h2>
        <p>We've encountered a CAPTCHA during your registration with ${providerName}.</p>
        <p><strong>Challenge type:</strong> ${context.captchaType || 'Image selection'}</p>
        <p><strong>Context:</strong> ${barrier.stage}</p>
        <p>Our AI will analyze the challenge and provide clear solving instructions.</p>
      `
    },
    payment: {
      smsMessage: `💳 Payment step reached for ${providerName}. We'll help secure your spot. Estimated time: ${barrier.estimatedDuration} min.`,
      emailSubject: `Payment Setup - ${providerName} Registration`,
      emailHtml: `
        <h2>Payment Information Needed</h2>
        <p>You've successfully navigated to the payment step with ${providerName}!</p>
        <p>We'll help you securely complete the payment process to secure your registration.</p>
        <p><strong>Estimated time:</strong> ${barrier.estimatedDuration} minutes</p>
      `
    }
  };

  return messages[barrier.type as keyof typeof messages] || {
    smsMessage: `📋 Assistance needed for ${barrier.stage} with ${providerName}. Estimated time: ${barrier.estimatedDuration} min.`,
    emailSubject: `Registration Assistance - ${providerName}`,
    emailHtml: `<p>We need your assistance to continue the registration process.</p>`
  };
}

function generateMessage(template: NotificationTemplate, barrier: BarrierInfo, providerInfo: any, timing: string): string {
  return template.template
    .replace('{provider_name}', providerInfo?.name || 'the camp provider')
    .replace('{barrier_type}', barrier.type.replace('_', ' '))
    .replace('{estimated_duration}', barrier.estimatedDuration.toString())
    .replace('{stage}', barrier.stage);
}

function getNotificationTemplates(): NotificationTemplate[] {
  return [
    {
      type: 'account_creation',
      stage: 'registration',
      template: 'Account creation needed for {provider_name}. We\'ll guide you through this (~{estimated_duration} min)',
      urgency: 'medium',
      timing: 'pre_barrier'
    },
    {
      type: 'captcha',
      stage: 'any',
      template: 'CAPTCHA detected at {provider_name}. Our AI will help solve it (~{estimated_duration} min)',
      urgency: 'high',
      timing: 'at_barrier'
    },
    {
      type: 'payment',
      stage: 'checkout',
      template: 'Payment step reached for {provider_name}. Ready to secure your spot? (~{estimated_duration} min)',
      urgency: 'high',
      timing: 'at_barrier'
    }
  ];
}

async function sendContextualNotification(supabase: any, params: any) {
  const notification = await generateContextualMessage(params.barrier, params.providerInfo);
  
  if (params.userPreferences?.phone) {
    await sendSMS(supabase, {
      to: params.userPreferences.phone,
      message: notification.smsMessage,
      userId: params.userId,
      context: { barrier: params.barrier.type, timing: params.timing }
    });
  }
}

async function queueNotification(supabase: any, params: any) {
  await supabase.from('notification_queue').insert({
    user_id: params.userId,
    session_id: params.sessionId,
    notification_data: params.notification,
    scheduled_at: params.scheduledAt,
    status: 'queued'
  });
}

async function sendSMS(supabase: any, params: any) {
  try {
    const { error } = await supabase.functions.invoke('sms-send', {
      body: {
        to: params.to,
        message: params.message,
        context: params.context
      }
    });
    
    if (error) throw error;
    console.log('[SMART-NOTIFICATIONS] SMS sent successfully');
  } catch (error) {
    console.error('[SMART-NOTIFICATIONS] SMS failed:', error);
  }
}

async function sendEmail(supabase: any, params: any) {
  // Email sending would be implemented here using existing email service
  console.log('[SMART-NOTIFICATIONS] Email would be sent:', params.subject);
}