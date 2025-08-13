/**
 * Cryptographic utilities for secure password storage using AES-256-GCM
 */

/**
 * Encrypts text using AES-256-GCM encryption
 * @param text - The plaintext to encrypt
 * @returns Promise<string> - Base64 encoded ciphertext with IV
 */
export async function encrypt(text: string): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Decode the base64 key
  const keyBytes = new TextEncoder().encode(encryptionKey);
  
  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import the key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0, 32), // Use first 32 bytes for AES-256
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt the text
  const textBytes = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    textBytes
  );
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts base64 encoded ciphertext using AES-256-GCM
 * @param cipherBase64 - Base64 encoded ciphertext with IV
 * @returns Promise<string> - The decrypted plaintext
 */
export async function decrypt(cipherBase64: string): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Decode the base64 key
  const keyBytes = new TextEncoder().encode(encryptionKey);
  
  // Decode the base64 ciphertext
  const combined = new Uint8Array(
    atob(cipherBase64)
      .split('')
      .map(char => char.charCodeAt(0))
  );
  
  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Import the key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0, 32), // Use first 32 bytes for AES-256
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt the ciphertext
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    ciphertext
  );
  
  // Return as string
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts payment method data (card or ACH details)
 * @param paymentData - Payment method object to encrypt
 * @returns Promise<string> - Base64 encoded encrypted payment data
 */
export async function encryptPaymentMethod(paymentData: any): Promise<string> {
  const jsonString = JSON.stringify(paymentData);
  return await encrypt(jsonString);
}

/**
 * Decrypts payment method data
 * @param encryptedData - Base64 encoded encrypted payment data
 * @returns Promise<any> - Decrypted payment method object
 */
export async function decryptPaymentMethod(encryptedData: string): Promise<any> {
  const jsonString = await decrypt(encryptedData);
  return JSON.parse(jsonString);
}