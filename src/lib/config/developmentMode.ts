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
  // Check environment variable first
  if (env.DEVELOPMENT_MODE !== undefined) {
    return env.DEVELOPMENT_MODE;
  }
  
  // Fallback to checking if we're in development environment
  return import.meta.env.DEV;
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