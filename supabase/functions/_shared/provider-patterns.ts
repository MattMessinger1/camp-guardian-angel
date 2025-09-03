export const providerPatterns = {
  'peloton': {
    loginRequired: true,
    loginUrl: 'https://studio.onepeloton.com/login',
    bookingPattern: '7 days in advance at 6:00 AM ET',
    selectors: {
      loginButton: '[data-test-id="login-button"]',
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"]'
    }
  },
  'ticketmaster': {
    loginRequired: false,
    queueLikely: true,
    captchaLikely: true,
    warning: 'May require mobile app'
  },
  'eventbrite': {
    loginRequired: false,
    bookingPattern: 'Varies by event'
  }
}

export function detectProvider(url: string): string {
  const domain = new URL(url).hostname.toLowerCase()
  
  if (domain.includes('peloton')) return 'peloton'
  if (domain.includes('ticketmaster')) return 'ticketmaster'
  if (domain.includes('eventbrite')) return 'eventbrite'
  
  return 'unknown'
}

export function getProviderPattern(provider: string) {
  return providerPatterns[provider] || { loginRequired: false }
}