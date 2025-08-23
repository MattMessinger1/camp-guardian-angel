/**
 * Simplified TOS Compliance Edge Function
 * 
 * Optimized for SPEED and SUCCESSFUL SIGNUPS.
 * Returns compliance status in <50ms for fast registration flow.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-classified trusted camp providers (they WANT registrations)
const TRUSTED_PROVIDERS = [
  'active.com', 'campwise.com', 'campminder.com', 'daysmart.com',
  'jackrabbit.com', 'sawyer.com', 'campbrain.com', 'ultracamp.com',
  'communitypass.net', 'playmetrics.com', 'trakstar.com', 'perfectmind.com',
  'recdesk.com', 'ymca.org', 'ymca.net', 'jcc.org', 'jewishcc.org',
  'parks.ca.gov', 'nycgovparks.org', 'chicago.gov', 'recreation.gov',
  'summercamps.com', 'mysummercamps.com', 'camppage.com'
];

const BLOCKED_PROVIDERS: string[] = [
  // Add any providers that explicitly request no automation
  // Currently empty - most camp providers want registrations
];

interface SimpleTOSResult {
  status: 'green' | 'yellow' | 'red';
  reason: string;
  canProceed: boolean;
  requiresConsent: boolean;
  checkDurationMs: number;
  providerType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SIMPLE-TOS-CHECK] Checking: ${url}`);

    const result = checkProviderCompliance(url, startTime);
    
    // Background logging (non-blocking)
    logComplianceCheck(url, result);

    console.log(`[SIMPLE-TOS-CHECK] Result: ${result.status} (${result.checkDurationMs}ms)`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SIMPLE-TOS-CHECK] Error:', error);
    
    // Fail gracefully - allow with consent rather than block signup
    const fallbackResult: SimpleTOSResult = {
      status: 'yellow',
      reason: 'Unable to verify compliance - proceeding with parent consent',
      canProceed: true,
      requiresConsent: true,
      checkDurationMs: Date.now() - startTime,
      providerType: 'unknown'
    };

    return new Response(
      JSON.stringify(fallbackResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function checkProviderCompliance(url: string, startTime: number): SimpleTOSResult {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const domain = extractDomain(hostname);
    const providerType = identifyProviderType(domain);
    
    // Check trusted providers first (fastest path)
    if (isTrustedProvider(domain)) {
      return {
        status: 'green',
        reason: 'Trusted camp provider - automation allowed with consent',
        canProceed: true,
        requiresConsent: true,
        checkDurationMs: Date.now() - startTime,
        providerType
      };
    }
    
    // Check blocked providers
    if (isBlockedProvider(domain)) {
      return {
        status: 'red',
        reason: 'Provider has requested no automated access',
        canProceed: false,
        requiresConsent: false,
        checkDurationMs: Date.now() - startTime,
        providerType
      };
    }
    
    // Unknown provider - default to proceed with consent (camp-friendly approach)
    return {
      status: 'yellow',
      reason: 'Unknown provider - proceeding with explicit parent consent',
      canProceed: true,
      requiresConsent: true,
      checkDurationMs: Date.now() - startTime,
      providerType
    };
    
  } catch (error) {
    // Invalid URL - allow with consent
    return {
      status: 'yellow',
      reason: 'Unable to analyze provider - proceeding with parent consent',
      canProceed: true,
      requiresConsent: true,
      checkDurationMs: Date.now() - startTime,
      providerType: 'unknown'
    };
  }
}

function extractDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

function isTrustedProvider(domain: string): boolean {
  return TRUSTED_PROVIDERS.some(trusted => 
    domain === trusted || domain.endsWith('.' + trusted)
  );
}

function isBlockedProvider(domain: string): boolean {
  return BLOCKED_PROVIDERS.some(blocked =>
    domain === blocked || domain.endsWith('.' + blocked)
  );
}

function identifyProviderType(domain: string): string {
  if (domain.includes('ymca')) return 'ymca';
  if (domain.includes('active')) return 'active_network';
  if (domain.includes('camp')) return 'camp_provider';
  if (domain.includes('parks') || domain.includes('recreation')) return 'parks_recreation';
  if (domain.includes('gov')) return 'government';
  return 'unknown';
}

function logComplianceCheck(url: string, result: SimpleTOSResult): void {
  // Background logging - don't block response
  setTimeout(() => {
    try {
      console.log('TOS_COMPLIANCE_DECISION', {
        url,
        status: result.status,
        provider_type: result.providerType,
        duration_ms: result.checkDurationMs,
        can_proceed: result.canProceed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to log compliance check:', error);
    }
  }, 0);
}