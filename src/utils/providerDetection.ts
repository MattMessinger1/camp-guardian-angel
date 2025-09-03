// Simple provider detection function
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
    
    return 'unknown';
  } catch (error) {
    console.error('Failed to detect provider from URL:', error);
    return 'unknown';
  }
}