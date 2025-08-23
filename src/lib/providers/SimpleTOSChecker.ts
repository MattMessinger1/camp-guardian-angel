/**
 * Simplified TOS Compliance System
 * 
 * Optimized for SPEED and SUCCESSFUL SIGNUPS over perfect compliance.
 * Pre-classifies major camp providers for instant decisions.
 */

// Pre-classified trusted camp providers (GREEN = proceed immediately)
const TRUSTED_PROVIDERS = [
  // Major camp management platforms (they WANT registrations)
  'active.com',
  'campwise.com', 
  'campminder.com',
  'daysmart.com',
  'jackrabbit.com',
  'sawyer.com',
  'campbrain.com',
  'ultracamp.com',
  'communitypass.net',
  'playmetrics.com',
  'trakstar.com',
  'perfectmind.com',
  'recdesk.com',
  
  // YMCA and major organizations
  'ymca.org',
  'ymca.net',
  'jcc.org',
  'jewishcc.org',
  
  // Recreation departments (public services)
  'parks.ca.gov',
  'nycgovparks.org',
  'chicago.gov',
  'recreation.gov',
  
  // Summer camp directories/platforms
  'summercamps.com',
  'mysummercamps.com',
  'camppage.com'
];

// Providers that have explicitly requested blocks (RED = avoid)
const BLOCKED_PROVIDERS = [
  // Add any providers that have explicitly requested no automation
  // Currently empty - most camp providers want successful registrations
];

export interface SimpleTOSResult {
  status: 'green' | 'yellow' | 'red';
  reason: string;
  canProceed: boolean;
  requiresConsent: boolean;
  checkDurationMs: number;
}

export class SimpleTOSChecker {
  /**
   * Fast TOS compliance check - optimized for signup speed
   * Returns result in <10ms for known providers
   */
  static checkProvider(url: string): SimpleTOSResult {
    const startTime = Date.now();
    
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const domain = this.extractDomain(hostname);
      
      // Check trusted providers first (fastest path)
      if (this.isTrustedProvider(domain)) {
        return {
          status: 'green',
          reason: 'Trusted camp provider - proceed with registration',
          canProceed: true,
          requiresConsent: true, // Always get parent consent
          checkDurationMs: Date.now() - startTime
        };
      }
      
      // Check blocked providers
      if (this.isBlockedProvider(domain)) {
        return {
          status: 'red', 
          reason: 'Provider has requested no automated access',
          canProceed: false,
          requiresConsent: false,
          checkDurationMs: Date.now() - startTime
        };
      }
      
      // Unknown provider - default to cautious proceed with consent
      return {
        status: 'yellow',
        reason: 'Unknown provider - proceeding with explicit parent consent',
        canProceed: true,
        requiresConsent: true,
        checkDurationMs: Date.now() - startTime
      };
      
    } catch (error) {
      // Invalid URL or other error - allow with consent
      return {
        status: 'yellow',
        reason: 'Unable to analyze provider - proceeding with parent consent',
        canProceed: true,
        requiresConsent: true,
        checkDurationMs: Date.now() - startTime
      };
    }
  }
  
  private static extractDomain(hostname: string): string {
    // Extract main domain from subdomain (e.g., register.active.com -> active.com)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }
  
  private static isTrustedProvider(domain: string): boolean {
    return TRUSTED_PROVIDERS.some(trusted => 
      domain === trusted || domain.endsWith('.' + trusted)
    );
  }
  
  private static isBlockedProvider(domain: string): boolean {
    return BLOCKED_PROVIDERS.some(blocked =>
      domain === blocked || domain.endsWith('.' + blocked)
    );
  }
  
  /**
   * Get human-readable explanation for parents
   */
  static getParentExplanation(result: SimpleTOSResult, providerName: string): string {
    switch (result.status) {
      case 'green':
        return `${providerName} is a trusted camp provider. We'll help you register with your explicit consent.`;
      case 'yellow':
        return `We'll help you register at ${providerName} with your explicit consent. You maintain full control of the process.`;
      case 'red':
        return `${providerName} has requested that we not provide automated assistance. You'll need to register manually.`;
      default:
        return 'Registration assistance available with your consent.';
    }
  }
  
  /**
   * Background compliance logging (non-blocking)
   */
  static async logComplianceCheck(url: string, result: SimpleTOSResult): Promise<void> {
    // Run in background - don't block signup flow
    setTimeout(async () => {
      try {
        // Log to observability system for compliance auditing
        console.log('TOS_COMPLIANCE_CHECK', {
          url,
          status: result.status,
          duration_ms: result.checkDurationMs,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Silent fail - don't impact signup
        console.warn('Failed to log compliance check:', error);
      }
    }, 0);
  }
}