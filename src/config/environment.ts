// Environment Configuration
// This file defines all required environment variables and provides validation

export interface EnvironmentConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Stripe Configuration  
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CONNECT: boolean;
  
  // SendGrid Configuration
  SENDGRID_API_KEY: string;
  SENDGRID_FROM_EMAIL: string;
  
  // VGS Configuration
  VGS_VAULT_ID: string;
  VGS_ENV: 'sandbox' | 'live';
  VGS_COLLECT_PUBLIC_KEY: string;
  VGS_INBOUND_HOST: string;
  VGS_OUTBOUND_HOST: string;
  
  // Application Configuration
  APP_BASE_URL: string;
  
  // Feature Flags
  FEATURE_PROVIDER_AUTOMATION_SIMULATE: boolean;
  VGS_BYPASS_MODE: boolean;
}

export interface EnvironmentVariable {
  key: keyof EnvironmentConfig;
  required: boolean;
  description: string;
  sensitive: boolean;
  defaultValue?: string | boolean;
  validValues?: string[];
}

export const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    sensitive: false,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    sensitive: true,
  },
  {
    key: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key (test mode)',
    sensitive: true,
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook secret for event verification',
    sensitive: true,
  },
  {
    key: 'STRIPE_CONNECT',
    required: false,
    description: 'Enable Stripe Connect for multi-party payments',
    sensitive: false,
    defaultValue: false,
  },
  {
    key: 'SENDGRID_API_KEY',
    required: true,
    description: 'SendGrid API key for email notifications',
    sensitive: true,
  },
  {
    key: 'SENDGRID_FROM_EMAIL',
    required: true,
    description: 'Verified sender email address in SendGrid',
    sensitive: false,
  },
  {
    key: 'VGS_VAULT_ID',
    required: false, // Made optional for bypass mode
    description: 'VGS Vault ID for tokenizing sensitive child data',
    sensitive: false,
  },
  {
    key: 'VGS_ENV',
    required: false, // Made optional for bypass mode
    description: 'VGS environment (sandbox or live)',
    sensitive: false,
    defaultValue: 'sandbox',
    validValues: ['sandbox', 'live'],
  },
  {
    key: 'VGS_COLLECT_PUBLIC_KEY',
    required: false, // Made optional for bypass mode
    description: 'VGS Collect public key for frontend tokenization',
    sensitive: false,
  },
  {
    key: 'VGS_INBOUND_HOST',
    required: false, // Made optional for bypass mode
    description: 'VGS inbound proxy host for secure data collection',
    sensitive: false,
  },
  {
    key: 'VGS_OUTBOUND_HOST',
    required: false, // Made optional for bypass mode
    description: 'VGS outbound proxy host for secure data transmission',
    sensitive: true,
  },
  {
    key: 'APP_BASE_URL',
    required: true,
    description: 'Base URL of the application (for redirects and webhooks)',
    sensitive: false,
  },
  {
    key: 'FEATURE_PROVIDER_AUTOMATION_SIMULATE',
    required: false,
    description: 'Enable simulation mode for provider automation',
    sensitive: false,
    defaultValue: true,
  },
  {
    key: 'VGS_BYPASS_MODE',
    required: false,
    description: 'Enable VGS bypass mode for development testing (SECURITY WARNING: DO NOT USE IN PRODUCTION)',
    sensitive: false,
    defaultValue: false,
  },
];

export class EnvironmentError extends Error {
  constructor(message: string, public missingVariables: string[] = []) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];
  const config = {} as EnvironmentConfig;

  for (const envVar of ENVIRONMENT_VARIABLES) {
    const value = getEnvironmentVariable(envVar.key);
    
    if (!value && envVar.required) {
      errors.push(`Missing required environment variable: ${envVar.key}`);
      continue;
    }
    
    if (!value && envVar.defaultValue !== undefined) {
      (config as any)[envVar.key] = envVar.defaultValue;
      continue;
    }
    
    if (!value) {
      continue; // Optional variable not set
    }
    
    // Type conversion and validation
    if (envVar.key === 'STRIPE_CONNECT' || envVar.key === 'FEATURE_PROVIDER_AUTOMATION_SIMULATE' || envVar.key === 'VGS_BYPASS_MODE') {
      (config as any)[envVar.key] = value.toLowerCase() === 'true';
    } else if (envVar.validValues && !envVar.validValues.includes(value)) {
      errors.push(`Invalid value for ${envVar.key}. Expected one of: ${envVar.validValues.join(', ')}`);
    } else {
      (config as any)[envVar.key] = value;
    }
  }

  if (errors.length > 0) {
    throw new EnvironmentError(
      `Environment validation failed:\n${errors.join('\n')}`,
      errors.map(err => err.split(': ')[1]).filter(Boolean)
    );
  }

  return config;
}

function getEnvironmentVariable(key: string): string | undefined {
  // In browser environment, only NEXT_PUBLIC_ variables are available
  if (typeof window !== 'undefined') {
    if (key.startsWith('NEXT_PUBLIC_')) {
      // Try to get from window.__ENV__ first (if set by build process)
      const windowEnv = (window as any).__ENV__?.[key];
      if (windowEnv) return windowEnv;
      
      // For Lovable environment, hardcode the known values
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        return 'https://ezvwyfqtyanwnoyymhav.supabase.co';
      }
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
        return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI';
      }
    }
    return undefined;
  }
  
  // In server environment (Edge Functions), all variables are available
  if (typeof globalThis !== 'undefined' && (globalThis as any).Deno) {
    return (globalThis as any).Deno.env.get(key);
  }
  
  // Fallback for Node.js environments (if process is available)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

export function getEnvironmentStatus() {
  const status = ENVIRONMENT_VARIABLES.map(envVar => {
    const value = getEnvironmentVariable(envVar.key);
    const isSet = !!value;
    const maskedValue = value && envVar.sensitive 
      ? `${value.substring(0, 4)}${'*'.repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`
      : value;
    
    return {
      key: envVar.key,
      required: envVar.required,
      description: envVar.description,
      isSet,
      value: maskedValue,
      status: isSet ? 'SET' : envVar.required ? 'MISSING' : 'OPTIONAL',
    };
  });
  
  const missingRequired = status.filter(s => s.status === 'MISSING');
  const isValid = missingRequired.length === 0;
  
  return {
    status,
    isValid,
    missingRequired: missingRequired.map(s => s.key),
  };
}

// Initialize and validate on import (fail fast)
let config: EnvironmentConfig;
try {
  config = validateEnvironment();
} catch (error) {
  if (error instanceof EnvironmentError) {
    console.error('❌ Environment validation failed:', error.message);
    // Don't throw in browser environment, let the settings page handle it
    if (typeof window === 'undefined') {
      throw error;
    }
  }
  // Provide empty config for browser when validation fails
  config = {} as EnvironmentConfig;
}

export { config as env };