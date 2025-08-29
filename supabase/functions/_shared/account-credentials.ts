/**
 * Account Credentials Management
 * Handles secure storage and retrieval of provider account credentials
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface AccountCredentials {
  id: string;
  user_id: string;
  provider_url: string;
  provider_name: string;
  email: string;
  password_encrypted: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface LoginAttemptResult {
  success: boolean;
  account_found: boolean;
  login_attempted: boolean;
  error?: string;
  credentials_expired?: boolean;
}

/**
 * Simple XOR encryption for password storage
 * Note: This is basic encryption for demo purposes
 * Production should use proper encryption libraries
 */
function encryptPassword(password: string): string {
  const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-me';
  const encrypted = Array.from(password)
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
  return btoa(encrypted); // Base64 encode
}

function decryptPassword(encryptedPassword: string): string {
  const key = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-me';
  const encrypted = atob(encryptedPassword); // Base64 decode
  return Array.from(encrypted)
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
}

/**
 * Store account credentials for a user and provider
 */
export async function storeAccountCredentials(params: {
  userId: string;
  providerUrl: string;
  providerName: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  
  try {
    console.log('[CREDENTIALS] Storing account credentials for:', {
      userId: params.userId,
      providerUrl: params.providerUrl,
      providerName: params.providerName,
      email: params.email
    });

    const encryptedPassword = encryptPassword(params.password);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    const { error } = await supabase
      .from('provider_credentials')
      .upsert({
        user_id: params.userId,
        provider_url: params.providerUrl,
        provider_name: params.providerName,
        email: params.email,
        password_encrypted: encryptedPassword,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'user_id,provider_url'
      });

    if (error) {
      console.error('[CREDENTIALS] Storage error:', error);
      return { success: false, error: error.message };
    }

    console.log('[CREDENTIALS] Successfully stored credentials');
    return { success: true };

  } catch (error: any) {
    console.error('[CREDENTIALS] Storage exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve account credentials for a user and provider
 */
export async function getAccountCredentials(params: {
  userId: string;
  providerUrl: string;
}): Promise<{ credentials: AccountCredentials | null; error?: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  
  try {
    console.log('[CREDENTIALS] Retrieving credentials for:', {
      userId: params.userId,
      providerUrl: params.providerUrl
    });

    const { data, error } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('user_id', params.userId)
      .eq('provider_url', params.providerUrl)
      .gt('expires_at', new Date().toISOString()) // Only get non-expired credentials
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[CREDENTIALS] No valid credentials found');
        return { credentials: null };
      }
      console.error('[CREDENTIALS] Retrieval error:', error);
      return { credentials: null, error: error.message };
    }

    console.log('[CREDENTIALS] Successfully retrieved credentials');
    return { credentials: data };

  } catch (error: any) {
    console.error('[CREDENTIALS] Retrieval exception:', error);
    return { credentials: null, error: error.message };
  }
}

/**
 * Get decrypted login credentials for browser automation
 */
export async function getDecryptedCredentials(params: {
  userId: string;
  providerUrl: string;
}): Promise<{ email?: string; password?: string; error?: string }> {
  const { credentials, error } = await getAccountCredentials(params);
  
  if (error) {
    return { error };
  }
  
  if (!credentials) {
    return { error: 'No credentials found' };
  }

  try {
    const decryptedPassword = decryptPassword(credentials.password_encrypted);
    return {
      email: credentials.email,
      password: decryptedPassword
    };
  } catch (decryptError: any) {
    console.error('[CREDENTIALS] Decryption error:', decryptError);
    return { error: 'Failed to decrypt credentials' };
  }
}

/**
 * Check if user has valid credentials for a provider
 */
export async function hasValidCredentials(params: {
  userId: string;
  providerUrl: string;
}): Promise<boolean> {
  const { credentials } = await getAccountCredentials(params);
  return credentials !== null;
}

/**
 * Clean up expired credentials
 */
export async function cleanupExpiredCredentials(): Promise<{ cleaned: number; error?: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  
  try {
    const { data, error } = await supabase
      .from('provider_credentials')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('[CREDENTIALS] Cleanup error:', error);
      return { cleaned: 0, error: error.message };
    }

    const cleanedCount = data?.length || 0;
    console.log(`[CREDENTIALS] Cleaned up ${cleanedCount} expired credentials`);
    return { cleaned: cleanedCount };

  } catch (error: any) {
    console.error('[CREDENTIALS] Cleanup exception:', error);
    return { cleaned: 0, error: error.message };
  }
}

/**
 * Log account login attempt for compliance
 */
export async function logLoginAttempt(params: {
  userId: string;
  providerUrl: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  
  try {
    await supabase
      .from('compliance_audit')
      .insert({
        user_id: params.userId,
        event_type: 'ACCOUNT_LOGIN_ATTEMPT',
        event_data: {
          provider_url: params.providerUrl,
          success: params.success,
          error: params.error,
          session_id: params.sessionId,
          timestamp: new Date().toISOString()
        },
        payload_summary: `Account login ${params.success ? 'successful' : 'failed'} for ${params.providerUrl}`
      });
  } catch (error) {
    console.error('[CREDENTIALS] Failed to log login attempt:', error);
  }
}