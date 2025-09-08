import type { ProviderAdapter, ProviderSessionCandidate, FinalizeResult } from '../types';
import { supabase } from '@/integrations/supabase/client';

const adapter: ProviderAdapter = {
  precheck: async (ctx) => {
    if (!ctx?.metadata?.planId) return { ok: false, reason: 'Missing planId' };
    return { ok: true };
  },
  findSessions: async (ctx) => {
    // We delegate to serverless runner; this candidate is just a placeholder
    const planId = ctx.metadata?.planId || 'plan';
    return [{
      id: planId,
      url: ctx.canonical_url,
      title: 'SkiClubPro plan',
      provider_id: null,
      start_at: null, 
      end_at: null, 
      capacity: null
    }] as ProviderSessionCandidate[];
  },
  reserve: async (ctx) => {
    const { data, error } = await supabase.functions.invoke('skiclubpro-register', {
      body: { plan_id: ctx.metadata?.planId }
    });
    if (error || !data?.success) {
      return { success: false, reason: data?.message || error?.message || 'skiclubpro-register failed' };
    }
    return { success: true, reservation_id: data.run_id || null };
  },
  finalizePayment: async (): Promise<FinalizeResult> => {
    return { success: true, confirmation_id: 'skiclubpro:checkout-complete' };
  },
};

export default adapter;