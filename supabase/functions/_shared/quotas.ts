/**
 * Quotas and Rate Limiting Helper
 * 
 * Centralized logic for enforcing reservation quotas and limits.
 * Single source of truth for quota enforcement - no duplicate quota logic elsewhere.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ACTIVE_RESERVATION_STATES, ACTIVE_REGISTRATION_STATES } from "./states.ts";

// Quota constants - single source of truth
export const MAX_ACTIVE_PER_ACCOUNT = 3;
export const MAX_ACTIVE_PER_CHILD = 1;
export const MAX_DAILY_ATTEMPTS_IP = 10;
export const MAX_PER_USER_PER_SESSION = 2;

export interface QuotaCheckResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export interface QuotaCheckParams {
  userId: string;
  childId?: string;
  sessionId?: string;
  ip?: string;
  supabase?: any;
}

/**
 * Consolidated quota check - single source of truth for all admission decisions
 * Checks all quotas and returns first violation encountered
 * @param params Object with userId, childId, sessionId, ip, and optional supabase client
 * @returns Promise<QuotaCheckResult>
 */
export async function checkQuotas({
  userId,
  childId,
  sessionId,
  ip,
  supabase
}: QuotaCheckParams): Promise<QuotaCheckResult> {
  console.log(`[QUOTAS] Running consolidated quota check for user ${userId}`);
  
  // Use provided client or create service role client
  const client = supabase || createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // 1. Check account-wide active reservation limit
    const { count: accountCount, error: accountError } = await client
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ACTIVE_RESERVATION_STATES);

    if (accountError) {
      console.error(`[QUOTAS] Error checking account reservations:`, accountError);
      throw new Error(`Account quota check failed: ${accountError.message}`);
    }

    const activeAccountReservations = accountCount || 0;
    console.log(`[QUOTAS] User ${userId} has ${activeAccountReservations} active reservations (limit: ${MAX_ACTIVE_PER_ACCOUNT})`);

    if (activeAccountReservations >= MAX_ACTIVE_PER_ACCOUNT) {
      return {
        ok: false,
        code: 'ACCOUNT_QUOTA',
        message: `You can have at most ${MAX_ACTIVE_PER_ACCOUNT} active reservations across all sessions.`
      };
    }

    // 2. Check per-child active reservation limit (if childId provided)
    if (childId) {
      const { count: childCount, error: childError } = await client
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("child_id", childId)
        .in("status", ACTIVE_RESERVATION_STATES);

      if (childError) {
        console.error(`[QUOTAS] Error checking child reservations:`, childError);
        throw new Error(`Child quota check failed: ${childError.message}`);
      }

      const activeChildReservations = childCount || 0;
      console.log(`[QUOTAS] Child ${childId} has ${activeChildReservations} active reservations (limit: ${MAX_ACTIVE_PER_CHILD})`);

      if (activeChildReservations >= MAX_ACTIVE_PER_CHILD) {
        return {
          ok: false,
          code: 'CHILD_QUOTA',
          message: `Each child can have at most ${MAX_ACTIVE_PER_CHILD} active reservation at a time.`
        };
      }
    }

    // 3. Check per-session limit for this user (if sessionId provided)
    if (sessionId) {
      const { count: sessionCount, error: sessionError } = await client
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .in("status", ACTIVE_RESERVATION_STATES);

      if (sessionError) {
        console.error(`[QUOTAS] Error checking session reservations:`, sessionError);
        throw new Error(`Session quota check failed: ${sessionError.message}`);
      }

      const activeSessionReservations = sessionCount || 0;
      console.log(`[QUOTAS] User ${userId} has ${activeSessionReservations} active reservations for session ${sessionId} (limit: ${MAX_PER_USER_PER_SESSION})`);

      if (activeSessionReservations >= MAX_PER_USER_PER_SESSION) {
        return {
          ok: false,
          code: 'USER_SESSION_CAP',
          message: `You can register at most ${MAX_PER_USER_PER_SESSION} children per session.`
        };
      }
    }

    // 4. Check daily IP attempt limit (if ip provided)
    if (ip) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: ipCount, error: ipError } = await client
        .from("reservation_attempts")
        .select("*", { count: "exact", head: true })
        .eq("client_ip", ip)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString());

      if (ipError) {
        console.error(`[QUOTAS] Error checking IP attempts:`, ipError);
        throw new Error(`IP quota check failed: ${ipError.message}`);
      }

      const dailyAttempts = ipCount || 0;
      console.log(`[QUOTAS] IP ${ip} has ${dailyAttempts} attempts today (limit: ${MAX_DAILY_ATTEMPTS_IP})`);

      if (dailyAttempts >= MAX_DAILY_ATTEMPTS_IP) {
        return {
          ok: false,
          code: 'IP_ATTEMPTS',
          message: `Too many registration attempts from this IP address today. Limit: ${MAX_DAILY_ATTEMPTS_IP} per day.`
        };
      }
    }

    console.log(`[QUOTAS] All quota checks passed for user ${userId}`);
    return { ok: true };

  } catch (error) {
    console.error(`[QUOTAS] Failed to check quotas:`, error);
    throw error;
  }
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