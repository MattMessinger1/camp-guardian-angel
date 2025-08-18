/**
 * Quotas and Rate Limiting Helper
 * 
 * Centralized logic for enforcing reservation quotas and limits.
 * Single source of truth for quota enforcement - no duplicate quota logic elsewhere.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ACTIVE_RESERVATION_STATES } from "./states.ts";

// Quota constants
export const MAX_PER_USER_PER_SESSION = 2;

export interface QuotaCheckResult {
  ok: boolean;
  code?: string;
  message?: string;
}

/**
 * Check if user has exceeded the per-session reservation cap
 * @param params Object with userId, sessionId, and optional supabase client
 * @returns Promise<QuotaCheckResult>
 */
export async function checkPerUserSessionCap({
  userId,
  sessionId,
  supabase
}: {
  userId: string;
  sessionId: string;
  supabase?: any;
}): Promise<QuotaCheckResult> {
  console.log(`[QUOTAS] Checking per-user session cap for user ${userId}, session ${sessionId}`);
  
  // Use provided client or create service role client
  const client = supabase || createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Count active reservations for this user+session combination
    const { count, error } = await client
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .in("status", ACTIVE_RESERVATION_STATES);

    if (error) {
      console.error(`[QUOTAS] Error checking reservations:`, error);
      throw new Error(`Quota check failed: ${error.message}`);
    }

    const activeCount = count || 0;
    console.log(`[QUOTAS] User ${userId} has ${activeCount} active reservations for session ${sessionId}`);

    if (activeCount >= MAX_PER_USER_PER_SESSION) {
      return {
        ok: false,
        code: 'USER_SESSION_CAP',
        message: `You can register at most ${MAX_PER_USER_PER_SESSION} children per session.`
      };
    }

    return { ok: true };

  } catch (error) {
    console.error(`[QUOTAS] Failed to check per-user session cap:`, error);
    throw error;
  }
}

/**
 * Acquire advisory lock for user+session to prevent race conditions
 * @param params Object with userId, sessionId, and supabase client
 * @returns Promise<{ lockId: number }> - Returns lock ID for unlocking
 */
export async function acquireUserSessionLock({
  userId,
  sessionId,
  supabase
}: {
  userId: string;
  sessionId: string;
  supabase: any;
}): Promise<{ lockId: number }> {
  // Create deterministic lock ID from userId + sessionId
  const lockString = `${userId}:${sessionId}`;
  const lockId = hashStringToInt(lockString);
  
  console.log(`[QUOTAS] Acquiring advisory lock ${lockId} for ${lockString}`);
  
  const { data, error } = await supabase.rpc('pg_advisory_lock', { key: lockId });
  
  if (error) {
    console.error(`[QUOTAS] Failed to acquire lock ${lockId}:`, error);
    throw new Error(`Failed to acquire lock: ${error.message}`);
  }
  
  console.log(`[QUOTAS] Acquired advisory lock ${lockId}`);
  return { lockId };
}

/**
 * Release advisory lock
 * @param params Object with lockId and supabase client
 */
export async function releaseUserSessionLock({
  lockId,
  supabase
}: {
  lockId: number;
  supabase: any;
}): Promise<void> {
  console.log(`[QUOTAS] Releasing advisory lock ${lockId}`);
  
  const { error } = await supabase.rpc('pg_advisory_unlock', { key: lockId });
  
  if (error) {
    console.error(`[QUOTAS] Failed to release lock ${lockId}:`, error);
    // Don't throw - locks are automatically released on connection close
  } else {
    console.log(`[QUOTAS] Released advisory lock ${lockId}`);
  }
}

/**
 * Helper function to hash string to 32-bit integer for advisory locks
 * @param str String to hash
 * @returns 32-bit integer
 */
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0x7fffffff; // Keep within 32-bit signed range
  }
  return hash;
}