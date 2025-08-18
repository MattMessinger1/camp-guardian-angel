// Shared child fingerprint utilities for deduplication
// Single source of truth for child fingerprint computation

/**
 * Normalize a child's name for fingerprint computation
 * Removes diacritics, converts to lowercase, removes non-alphanumeric chars
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD') // Decompose characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim();
}

/**
 * Compute a deterministic fingerprint for a child
 * Same inputs will always produce the same fingerprint
 */
export function computeChildFingerprint(name: string, dobISO: string): string {
  const normalizedName = normalizeName(name);
  const dobDate = dobISO.slice(0, 10); // YYYY-MM-DD format
  const input = `${normalizedName}|${dobDate}`;
  
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

/**
 * Synchronous version using a simple hash for edge functions
 * (Web Crypto API is async, this provides sync alternative)
 */
export function computeChildFingerprintSync(name: string, dobISO: string): string {
  const normalizedName = normalizeName(name);
  const dobDate = dobISO.slice(0, 10); // YYYY-MM-DD format
  const input = `${normalizedName}|${dobDate}`;
  
  // Simple hash function for sync operation
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex and pad
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if error is a child fingerprint duplicate violation
 */
export function isChildDuplicateError(error: any): boolean {
  return error?.code === '23505' && 
         error?.message?.includes('uniq_children_fingerprint');
}

/**
 * Get friendly error message for duplicate child
 */
export function getChildDuplicateErrorMessage(): string {
  return "This child appears to already exist in our system. If this seems wrong, contact support.";
}