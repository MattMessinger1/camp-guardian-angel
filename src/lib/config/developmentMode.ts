import { env } from '@/config/environment';

/**
 * Development Mode Configuration
 * 
 * Controls whether development and testing features are available:
 * - Test pages and debugging tools
 * - Admin dashboards and operations panels
 * - Development-only Edge Functions
 * - Testing components and workflows
 */

export function isDevelopmentMode(): boolean {
  // In Lovable environment, always prioritize Vite's DEV mode detection
  if (import.meta.env.DEV) {
    return true;
  }
  
  // Check environment variable for explicit override
  if (env.DEVELOPMENT_MODE !== undefined) {
    return env.DEVELOPMENT_MODE;
  }
  
  // Default to false for production
  return false;
}

export function logDevelopmentInfo(feature: string, context?: string) {
  if (isDevelopmentMode()) {
    const message = `🛠️ DEV MODE: ${feature}`;
    const details = context ? ` - ${context}` : '';
    console.info(`${message}${details}`);
  }
}

/**
 * Conditional wrapper for development-only components
 */
export function withDevelopmentMode<T>(component: T): T | null {
  return isDevelopmentMode() ? component : null;
}