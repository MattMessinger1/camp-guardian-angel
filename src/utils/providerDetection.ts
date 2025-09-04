export const RESTAURANT_PLATFORMS = {
  'carbone': 'resy',
  'don angie': 'resy', 
  'rao\'s': 'resy',
  'eleven madison park': 'opentable',
  'le bernardin': 'opentable',
  'gramercy tavern': 'opentable'
};

export function detectPlatform(businessName: string): { platform: string; type: 'restaurant' | 'camp' | 'fitness' } {
  const normalized = businessName.toLowerCase();
  
  // Check restaurants
  if (RESTAURANT_PLATFORMS[normalized]) {
    return { platform: RESTAURANT_PLATFORMS[normalized], type: 'restaurant' };
  }
  
  // Check if it's a camp
  if (normalized.includes('camp')) {
    return { platform: 'jackrabbit', type: 'camp' };
  }
  
  // Default
  return { platform: 'unknown', type: 'restaurant' };
}

// Simple provider detection function (legacy)
export function detectProvider(url: string): string {
  if (!url) return 'unknown';
  
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes('peloton')) return 'peloton';
    if (domain.includes('ticketmaster')) return 'ticketmaster';
    if (domain.includes('eventbrite')) return 'eventbrite';
    if (domain.includes('ymca')) return 'ymca';
    if (domain.includes('communitypass')) return 'communitypass';
    if (domain.includes('activecommunities')) return 'activecommunities';
    if (domain.includes('resy')) return 'resy';
    if (domain.includes('opentable')) return 'opentable';
    
    return 'unknown';
  } catch (error) {
    console.error('Failed to detect provider from URL:', error);
    return 'unknown';
  }
}