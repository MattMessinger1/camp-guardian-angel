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
    // TODO: Implement captcha checks, connectivity tests, etc.
    return { ok: true };
  },
  async findSessions(_ctx: ProviderContext, _intent?: ProviderIntent): Promise<ProviderSessionCandidate[]> {
    // TODO: Scrape or API lookup for sessions
    return [];
  },
  async reserve(_ctx: ProviderContext, candidate: ProviderSessionCandidate): Promise<ReserveResult> {
    // TODO: Reserve the spot prior to checkout
    return { success: false, candidate, reason: 'Adapter not implemented' };
  },
  async finalizePayment(_ctx: ProviderContext, _candidate: ProviderSessionCandidate): Promise<FinalizeResult> {
    // TODO: Complete payment flow and return confirmation id
    return { success: false, error: 'Adapter not implemented' };
  },
};

export default adapter;
