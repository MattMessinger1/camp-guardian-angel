import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common camp provider domains and their confirmation patterns
const PROVIDER_PATTERNS = [
  {
    domains: ['active.com', 'activenetwork.com'],
    subject_patterns: [
      /registration\s+confirmation/i,
      /activity\s+confirmation/i,
      /enrollment\s+confirmation/i
    ],
    content_patterns: [
      /thank\s+you\s+for\s+registering/i,
      /registration\s+complete/i,
      /enrollment\s+successful/i
    ]
  },
  {
    domains: ['campbrain.com', 'ultracamp.com'],
    subject_patterns: [
      /camp\s+registration/i,
      /enrollment\s+confirmation/i
    ],
    content_patterns: [
      /registration\s+confirmed/i,
      /enrollment\s+complete/i
    ]
  },
  {
    domains: ['jumbula.com', 'campmanagement.com'],
    subject_patterns: [
      /registration\s+receipt/i,
      /confirmation/i
    ],
    content_patterns: [
      /successfully\s+registered/i,
      /payment\s+received/i
    ]
  }
];

// Extract potential session identifiers from email content
function extractSessionInfo(content: string): {
  sessionName?: string;
  dates?: string[];
  childName?: string;
  amount?: number;
} {
  const result: any = {};
  
  // Look for camp/program names (common patterns)
  const programPatterns = [
    /program[:\s]+([^\n\r.,]+)/i,
    /camp[:\s]+([^\n\r.,]+)/i,
    /activity[:\s]+([^\n\r.,]+)/i,
    /session[:\s]+([^\n\r.,]+)/i
  ];
  
  for (const pattern of programPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.sessionName = match[1].trim();
      break;
    }
  }
  
  // Look for dates
  const datePatterns = [
    /(?:start|begin|from)[:\s]*([a-z]+ \d{1,2},? \d{4})/gi,
    /(?:date|when)[:\s]*([a-z]+ \d{1,2},? \d{4})/gi,
    /(\d{1,2}\/\d{1,2}\/\d{4})/g
  ];
  
  const dates = [];
  for (const pattern of datePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      dates.push(match[1]);
    }
  }
  if (dates.length > 0) {
    result.dates = dates;
  }
  
  // Look for child names (after "for" or similar)
  const childPatterns = [
    /(?:for|child)[:\s]+([a-z]+ [a-z]+)/i,
    /participant[:\s]+([a-z]+ [a-z]+)/i,
    /student[:\s]+([a-z]+ [a-z]+)/i
  ];
  
  for (const pattern of childPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.childName = match[1].trim();
      break;
    }
  }
  
  // Look for amounts
  const amountPatterns = [
    /(?:total|amount|fee|cost|paid)[:\s]*\$?([\d,]+\.?\d*)/i,
    /\$(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g
  ];
  
  for (const pattern of amountPatterns) {
    const match = content.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 10000) { // Reasonable range
        result.amount = amount;
        break;
      }
    }
  }
  
  return result;
}

// Check if email matches a known provider pattern
function isProviderConfirmation(fromEmail: string, subject: string, content: string): boolean {
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  for (const provider of PROVIDER_PATTERNS) {
    // Check if domain matches
    const domainMatch = provider.domains.some(d => domain.includes(d));
    if (!domainMatch) continue;
    
    // Check subject patterns
    const subjectMatch = provider.subject_patterns.some(pattern => pattern.test(subject));
    if (!subjectMatch) continue;
    
    // Check content patterns
    const contentMatch = provider.content_patterns.some(pattern => pattern.test(content));
    if (contentMatch) return true;
  }
  
  // Fallback: generic confirmation patterns
  const genericPatterns = [
    /registration.*confirm/i,
    /confirm.*registration/i,
    /enrollment.*success/i,
    /payment.*received/i
  ];
  
  return genericPatterns.some(pattern => 
    pattern.test(subject) || pattern.test(content)
  );
}

// Create a hash for privacy (redact PII)
function createPrivacyHash(data: string): string {
  const encoder = new TextEncoder();
  const hashBuffer = crypto.subtle.digestSync('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16); // First 16 chars for storage
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse SendGrid Inbound Parse payload
    const formData = await req.formData();
    const to = formData.get('to') as string;
    const from = formData.get('from') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string;

    console.log('Processing email:', { to, from, subject: subject?.substring(0, 100) });

    // Verify this is sent to our success email
    if (!to?.includes('success@')) {
      return new Response('Not a success email', { status: 400, headers: corsHeaders });
    }

    const content = html || text || '';
    
    // Check if this looks like a registration confirmation
    if (!isProviderConfirmation(from, subject, content)) {
      console.log('Email does not match confirmation patterns');
      return new Response('Not a confirmation email', { status: 200, headers: corsHeaders });
    }

    // Extract session information
    const sessionInfo = extractSessionInfo(content);
    console.log('Extracted session info:', sessionInfo);

    // Try to match to an existing session
    let matchedSession = null;
    if (sessionInfo.sessionName) {
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, title, name, start_date, end_date, price_min, price_max')
        .or(`title.ilike.%${sessionInfo.sessionName}%,name.ilike.%${sessionInfo.sessionName}%`)
        .limit(5);

      if (!error && sessions?.length > 0) {
        // For now, take the first match - could improve with date/price matching
        matchedSession = sessions[0];
        console.log('Matched session:', matchedSession.id, matchedSession.title || matchedSession.name);
      }
    }

    // Create privacy-friendly hash
    const contentHash = createPrivacyHash(content.substring(0, 500)); // First 500 chars
    const emailHash = createPrivacyHash(from + subject);

    // Store the successful signup (even if we couldn't match a session)
    const { error: insertError } = await supabase
      .from('successful_signups')
      .insert({
        session_id: matchedSession?.id || null,
        user_id: null, // We don't know the user from email forwarding
        amount_cents: sessionInfo.amount ? Math.round(sessionInfo.amount * 100) : null,
        notes: `Email confirmation from ${from.split('@')[1]}. Session: ${sessionInfo.sessionName || 'Unknown'}. Child: ${sessionInfo.childName || 'Unknown'}.`,
        ip_address: null,
        user_agent: `Email-Parser-${emailHash.substring(0, 8)}`
      });

    if (insertError) {
      console.error('Error inserting successful signup:', insertError);
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    // Log the email processing for audit
    await supabase
      .from('signup_reminders') // Reusing for email audit log
      .insert({
        session_id: matchedSession?.id || null,
        user_id: null,
        email: `parsed-from-${from.split('@')[1]}`,
        reminder_type: 'email_confirmation_parsed'
      });

    console.log('Successfully processed confirmation email');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        matched_session: matchedSession?.id || null,
        extracted_info: sessionInfo
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-email-confirmation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});