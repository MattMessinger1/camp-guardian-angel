/**
 * Centralized logging utilities for edge functions
 * Reuse this instead of creating new logging patterns
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.54.0';

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface FetchAuditEntry {
  url: string;
  host: string;
  status: string;
  reason?: string;
  user_agent?: string;
  ip_address?: string;
  robots_allowed?: boolean;
  rate_limited?: boolean;
  response_code?: number;
  content_length?: number;
  fetch_duration_ms?: number;
}

export async function logFetchAudit(entry: FetchAuditEntry) {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('fetch_audit')
      .insert(entry);
    
    if (error) {
      console.error('Failed to log fetch audit:', error);
    }
  } catch (error) {
    console.error('Error logging fetch audit:', error);
  }
}

export interface ExtractionLogEntry {
  url: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  schema_ok: boolean;
  retry_count: number;
  trap_hit: string[];
  raw_output: string;
}

export async function logExtractionAttempt(entry: ExtractionLogEntry) {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('ai_extract_logs')
      .insert(entry);
    
    if (error) {
      console.error('Failed to log extraction attempt:', error);
    }
  } catch (error) {
    console.error('Error logging extraction attempt:', error);
  }
}