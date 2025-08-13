export type ProviderPlatform = 'jackrabbit_class' | 'daysmart_recreation' | 'shopify_product' | 'playmetrics';
export type ProviderLoginType = 'none' | 'email_password' | 'account_required';

export interface ProviderProfile {
  id: string;
  name: string;
  platform: ProviderPlatform;
  domain_patterns: string[];
  login_type: ProviderLoginType;
  captcha_expected: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderContext {
  canonical_url: string;
  child_token?: string | Record<string, any>; // tokenized sensitive data
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface ProviderIntent {
  date?: string; // ISO date preference
  titleContains?: string;
  location?: string;
  quantity?: number;
  priority?: boolean;
}

export interface ProviderSessionCandidate {
  id: string;
  url?: string;
  title?: string;
  start_at?: string | null;
  end_at?: string | null;
  capacity?: number | null;
  provider_id?: string;
}

export interface ReserveResult {
  success: boolean;
  waitlisted?: boolean;
  candidate?: ProviderSessionCandidate;
  reason?: string;
  needs_captcha?: boolean;
  provider?: string;
}

export interface FinalizeResult {
  success: boolean;
  confirmation_id?: string;
  waitlisted?: boolean;
  error?: string;
}

export interface ProviderAdapter {
  precheck: (ctx: ProviderContext) => Promise<void | { ok: boolean; reason?: string }>;
  findSessions: (ctx: ProviderContext, intent?: ProviderIntent) => Promise<ProviderSessionCandidate[]>;
  reserve: (ctx: ProviderContext, candidate: ProviderSessionCandidate) => Promise<ReserveResult>;
  finalizePayment: (ctx: ProviderContext, candidate: ProviderSessionCandidate) => Promise<FinalizeResult>;
  cancel?: (
    ctx: ProviderContext,
    candidate: ProviderSessionCandidate
  ) => Promise<{ success: boolean; error?: string }>;
}
