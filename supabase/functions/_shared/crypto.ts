// supabase/functions/_shared/crypto.ts
const te = new TextEncoder();
const td = new TextDecoder();

const b64 = {
  encode(buf: ArrayBuffer | Uint8Array) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = ""; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  },
  decode(s: string) {
    const a = atob(s); const u8 = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) u8[i] = a.charCodeAt(i);
    return u8;
  },
};

async function importKey() {
  const keyB64 = Deno.env.get("CRYPTO_KEY_V1");
  if (!keyB64) throw new Error("CRYPTO_KEY_V1 missing");
  const raw = b64.decode(keyB64);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPII(plaintext: string) {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(plaintext));
  return { v: Number(Deno.env.get("CRYPTO_KEY_VERSION") ?? 1), alg: Deno.env.get("CRYPTO_ALG") ?? "AES-GCM", iv: b64.encode(iv), ct: b64.encode(ct) };
}

export async function decryptPII(payload: { v: number; alg: string; iv: string; ct: string }) {
  if (!payload?.iv || !payload?.ct) throw new Error("Bad ciphertext");
  const key = await importKey();
  const iv = b64.decode(payload.iv);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64.decode(payload.ct));
  return td.decode(pt);
}

/** Hash for DEV "tokens" (so plaintext is never stored during dev) */
export async function devHashToken(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", te.encode(input));
  return "devtok_" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

/** Redact for logs */
export function redactPII<T extends Record<string, any>>(obj: T, fields: string[] = ["email","phone","name","address"]) {
  const copy: any = { ...obj };
  for (const f of fields) if (copy[f]) copy[f] = "[redacted]";
  return copy as T;
}

/**
 * Legacy functions for backward compatibility
 * @deprecated Use encryptPII/decryptPII instead
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