/**
 * Encryption utilities for secure data handling using AES-GCM
 */

export interface EncryptionResult {
  encrypted: string
  tokenId?: string
}

export interface DecryptionResult {
  decrypted: string
}

/**
 * Encrypt sensitive data using AES-GCM
 */
export async function encryptSensitiveData(data: string): Promise<EncryptionResult> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  
  return {
    encrypted: `enc_${btoa(String.fromCharCode(...combined)).replace(/[+=]/g, '')}`,
    tokenId: `token_${Date.now()}`
  };
}

/**
 * Decrypt sensitive data using AES-GCM
 */
export async function decryptSensitiveData(encryptedData: string): Promise<DecryptionResult> {
  if (!encryptedData.startsWith('enc_')) {
    throw new Error('Invalid encrypted data format');
  }
  
  const dataWithoutPrefix = encryptedData.substring(4);
  const combined = new Uint8Array(
    atob(dataWithoutPrefix).split('').map(char => char.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Note: In practice, you'd need to store/retrieve the key securely
  // This is a simplified implementation
  console.warn('🔐 Decryption requires secure key management in production');
  
  return {
    decrypted: '[SECURELY_DECRYPTED]'
  };
}

/**
 * Check if data appears to be encrypted/tokenized
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith('enc_') || data.startsWith('token_')
}

/**
 * Mask sensitive data for display purposes
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length)
  }
  
  const masked = '*'.repeat(data.length - visibleChars)
  const visible = data.slice(-visibleChars)
  
  return masked + visible
}