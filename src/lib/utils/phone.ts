/**
 * Format phone number for display with masking
 * Example: +15551234567 -> (•••) ••-••67
 */
export function formatPhoneMasked(phoneE164: string): string {
  // Extract the last 2 digits
  const lastTwo = phoneE164.slice(-2);
  return `(•••) ••-••${lastTwo}`;
}

/**
 * Format phone number for display without masking
 * Example: +15551234567 -> (555) 123-4567
 */
export function formatPhoneDisplay(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('1')) {
    // US/Canada format
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  if (digits.length === 10) {
    // US format without country code
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // International or other format - just return as is
  return phoneE164;
}

/**
 * Show SMS sent toast notification
 */
export function showSMSSentToast(phoneE164: string, expiresMinutes: number = 10, toast: any) {
  const maskedPhone = formatPhoneMasked(phoneE164);
  toast({
    title: "SMS sent",
    description: `SMS sent to ${maskedPhone}. Link expires in ${expiresMinutes} minutes.`,
  });
}