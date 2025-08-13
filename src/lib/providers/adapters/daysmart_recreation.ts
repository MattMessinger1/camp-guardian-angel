import type {
  ProviderAdapter,
  ProviderContext,
  ProviderIntent,
  ProviderSessionCandidate,
  ReserveResult,
  FinalizeResult,
} from '../types';

const adapter: ProviderAdapter = {
  async precheck(_ctx: ProviderContext) {
    return { ok: true };
  },
  async findSessions(_ctx: ProviderContext, _intent?: ProviderIntent): Promise<ProviderSessionCandidate[]> {
    return [];
  },
  async reserve(_ctx: ProviderContext, candidate: ProviderSessionCandidate): Promise<ReserveResult> {
    // TODO: Implement reservation logic
    // If human challenge detected during reservation process:
    // return { success: false, needs_captcha: true, provider: 'daysmart_recreation', candidate };
    
    return { success: false, candidate, reason: 'Adapter not implemented' };
  },
  async finalizePayment(_ctx: ProviderContext, _candidate: ProviderSessionCandidate): Promise<FinalizeResult> {
    return { success: false, error: 'Adapter not implemented' };
  },
};

export default adapter;
