/**
 * Browser Automation Configuration
 * 
 * Manages Browserbase integration settings and environment setup
 * for ethical camp registration automation.
 */

export interface BrowserConfig {
  browserbaseApiKey?: string;
  browserbaseProjectId?: string;
  maxConcurrentSessions: number;
  sessionTimeout: number;
  complianceLevel: 'strict' | 'balanced' | 'permissive';
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  maxConcurrentSessions: 3,
  sessionTimeout: 300000, // 5 minutes
  complianceLevel: 'balanced'
};

export function getBrowserConfig(): BrowserConfig {
  return {
    ...DEFAULT_BROWSER_CONFIG,
    browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
    browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID
  };
}

export function validateBrowserConfig(config: BrowserConfig): {
  isValid: boolean;
  missingKeys: string[];
} {
  const missingKeys: string[] = [];
  
  if (!config.browserbaseApiKey) {
    missingKeys.push('BROWSERBASE_API_KEY');
  }
  
  if (!config.browserbaseProjectId) {
    missingKeys.push('BROWSERBASE_PROJECT_ID');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Camp Provider Compliance Levels
 * 
 * Defines how strictly to enforce compliance rules for different
 * types of camp providers.
 */
export const COMPLIANCE_RULES = {
  strict: {
    // Only proceed with explicit partnership or green TOS status
    requirePartnership: true,
    allowYellowStatus: false,
    requireParentApproval: true,
    auditAllActions: true
  },
  balanced: {
    // Allow yellow status with human review
    requirePartnership: false,
    allowYellowStatus: true,
    requireParentApproval: true,
    auditAllActions: true
  },
  permissive: {
    // More lenient for trusted camp providers
    requirePartnership: false,
    allowYellowStatus: true,
    requireParentApproval: false,
    auditAllActions: false
  }
};

export function getComplianceRules(level: BrowserConfig['complianceLevel']) {
  return COMPLIANCE_RULES[level];
}