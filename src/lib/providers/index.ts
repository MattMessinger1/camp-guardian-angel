import { supabase } from '@/integrations/supabase/client';
import { blockCampProviderAPI, logCampProviderWarning } from '@/lib/config/publicMode';
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
    default:
      throw new Error(`No adapter for platform: ${platform}`);
  }
}

export async function run(
  ctx: ProviderContext,
  intent?: ProviderIntent
): Promise<FinalizeResult & { profile?: ProviderProfile; candidate?: ProviderSessionCandidate | null }> {
  // Check if camp provider APIs are blocked
  const blocked = blockCampProviderAPI(
    'Camp provider automation',
    { success: false, error: 'Camp provider APIs disabled in public data mode - only public camp data available' },
    `URL: ${ctx.canonical_url}`
  );
  
  if (blocked) {
    return blocked;
  }

  const profile = await detectPlatform(ctx.canonical_url);
  if (!profile) {
    return { success: false, error: 'Platform not recognized for URL' };
  }

  const adapter = loadAdapter(profile.platform);
  
  // Log that we're attempting camp provider operations
  logCampProviderWarning('Camp provider operation attempted', `Platform: ${profile.platform}`);
  
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
