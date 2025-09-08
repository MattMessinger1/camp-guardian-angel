import { supabase } from '@/integrations/supabase/client';
import { logPublicDataInfo } from '@/lib/config/publicMode';
import type {
  ProviderAdapter,
  ProviderContext,
  ProviderIntent,
  ProviderProfile,
  ProviderSessionCandidate,
  FinalizeResult,
  ProviderPlatform,
} from './types';

// Adapters (stubs for now)
import jackrabbitAdapter from './adapters/jackrabbit_class';
import daysmartAdapter from './adapters/daysmart_recreation';
import shopifyAdapter from './adapters/shopify_product';
import playmetricsAdapter from './adapters/playmetrics';
import skiclubproAdapter from './adapters/skiclubpro';

let cachedProfiles: ProviderProfile[] | null = null;

function toRegex(pattern: string): RegExp {
  // Support patterns like '*.domain.com' or 'domain.com'
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function hostnameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

export async function detectPlatform(url: string): Promise<ProviderProfile | null> {
  const host = hostnameFromUrl(url);
  if (!host) return null;

  if (!cachedProfiles) {
    const { data, error } = await supabase
      .from('provider_profiles')
      .select('*');
    if (error) {
      console.error('Failed to load provider profiles', error);
      return null;
    }
    cachedProfiles = data as ProviderProfile[];
  }

  for (const profile of cachedProfiles) {
    for (const pattern of profile.domain_patterns || []) {
      const rx = toRegex(pattern);
      if (rx.test(host)) {
        return profile;
      }
    }
  }
  return null;
}

export function loadAdapter(platform: ProviderPlatform): ProviderAdapter {
  switch (platform) {
    case 'jackrabbit_class':
      return jackrabbitAdapter;
    case 'daysmart_recreation':
      return daysmartAdapter;
    case 'shopify_product':
      return shopifyAdapter;
    case 'playmetrics':
      return playmetricsAdapter;
    case 'skiclubpro':
      return skiclubproAdapter;
    // New platforms use generic adapters until specific ones are built
    case 'resy':
    case 'opentable':
    case 'peloton':
    case 'ticketmaster':
    case 'eventbrite':
      // For now, return a basic adapter that logs and fails gracefully
      return {
        precheck: async (ctx) => ({ ok: false, reason: `${platform} adapter not yet implemented` }),
        findSessions: async (ctx, intent) => [],
        reserve: async (ctx, candidate) => ({ success: false, reason: `${platform} reservation not yet implemented` }),
        finalizePayment: async (ctx, candidate) => ({ success: false, error: `${platform} payment not yet implemented` })
      };
    default:
      throw new Error(`No adapter for platform: ${platform}`);
  }
}

export async function run(
  ctx: ProviderContext,
  intent?: ProviderIntent
): Promise<FinalizeResult & { profile?: ProviderProfile; candidate?: ProviderSessionCandidate | null }> {
  const profile = await detectPlatform(ctx.canonical_url);
  if (!profile) {
    return { success: false, error: 'Platform not recognized for URL' };
  }

  // Log that we're using public data sources for camp operations
  logPublicDataInfo('Camp provider operation', `Platform: ${profile.platform}, URL: ${ctx.canonical_url}`);

  const adapter = loadAdapter(profile.platform);
  
  await adapter.precheck(ctx);

  const candidates = await adapter.findSessions(ctx, intent);
  const candidate = candidates[0] || null;
  if (!candidate) {
    return { success: false, error: 'No matching sessions found', profile };
  }

  const reserved = await adapter.reserve(ctx, candidate);
  if (!reserved.success) {
    return { success: false, error: reserved.reason || 'Reservation failed', profile, candidate };
  }

  const finalized = await adapter.finalizePayment(ctx, candidate);
  return { ...finalized, profile, candidate };
}

export * from './types';
