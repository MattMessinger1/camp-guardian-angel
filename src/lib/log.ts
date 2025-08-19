// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// Structured logging to replace all console.log usage

type LogLevel = "info" | "warn" | "error";

interface LogMetadata extends Record<string, unknown> {
  // Common metadata fields
  userId?: string;
  sessionId?: string;
  feature?: string;
  component?: string;
  action?: string;
  duration?: number;
  
  // PHI avoidance metadata
  phiAvoidance?: {
    reason: string;
    dataType: string;
    decision: 'excluded' | 'sanitized' | 'anonymized';
  };
}

/**
 * Structured logger for the Learning System
 * Replaces all console.log usage with standardized logging
 * 
 * @param level - Log level (info, warn, error)
 * @param message - Human-readable message
 * @param meta - Structured metadata object
 */
export function log(
  level: LogLevel,
  message: string,
  meta: LogMetadata = {}
): void {
  // Ensure no PHI data is accidentally logged
  const sanitizedMeta = sanitizeMetadata(meta);
  
  const logEntry = {
    level,
    message,
    ts: new Date().toISOString(),
    env: getEnvironment(),
    ...sanitizedMeta,
  };

  // Use appropriate console method
  console[level](logEntry);
  
  // In production, you might also send to external logging service
  if (shouldSendToExternalService(level)) {
    sendToExternalLogger(logEntry);
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  info: (message: string, meta?: LogMetadata) => log("info", message, meta),
  warn: (message: string, meta?: LogMetadata) => log("warn", message, meta),
  error: (message: string, meta?: LogMetadata) => log("error", message, meta),
  
  // Specialized logging methods
  phiAvoidance: (message: string, avoidanceDetails: LogMetadata['phiAvoidance'], meta?: LogMetadata) => {
    log("info", message, {
      ...meta,
      phiAvoidance: avoidanceDetails,
      category: 'phi-compliance',
    });
  },
  
  performance: (message: string, duration: number, meta?: LogMetadata) => {
    log("info", message, {
      ...meta,
      duration,
      category: 'performance',
    });
  },
  
  userAction: (action: string, userId: string, meta?: LogMetadata) => {
    log("info", `User action: ${action}`, {
      ...meta,
      userId,
      action,
      category: 'user-action',
    });
  },
  
  featureFlag: (flag: string, enabled: boolean, meta?: LogMetadata) => {
    log("info", `Feature flag ${flag}: ${enabled ? 'enabled' : 'disabled'}`, {
      ...meta,
      feature: flag,
      enabled,
      category: 'feature-flag',
    });
  },
};

/**
 * Sanitize metadata to ensure no PHI data is accidentally logged
 */
function sanitizeMetadata(meta: LogMetadata): LogMetadata {
  const sanitized = { ...meta };
  
  // List of fields that should never be logged
  const prohibitedFields = [
    'ssn', 'medicalRecord', 'diagnosis', 'medication', 'allergy',
    'healthInsurance', 'doctorName', 'medicalProvider', 'treatment',
    'password', 'token', 'secret', 'apiKey',
  ];
  
  // Remove any prohibited fields
  prohibitedFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
      sanitized[`${field}_removed`] = 'PHI_AVOIDANCE';
    }
  });
  
  // Sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeNestedObject(sanitized[key] as Record<string, unknown>);
    }
  });
  
  return sanitized;
}

/**
 * Recursively sanitize nested objects
 */
function sanitizeNestedObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...obj };
  
  // Add your sanitization logic here
  if ('email' in sanitized && typeof sanitized.email === 'string') {
    // Hash or mask email for privacy
    sanitized.email = sanitized.email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }
  
  return sanitized;
}

/**
 * Determine current environment
 */
function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('localhost') ? 'development' : 'production';
  }
  return 'server';
}

/**
 * Determine if log should be sent to external service
 */
function shouldSendToExternalService(level: LogLevel): boolean {
  // Only send errors and warnings to external service in production
  return getEnvironment() === 'production' && (level === 'error' || level === 'warn');
}

/**
 * Send log to external logging service (placeholder)
 */
function sendToExternalLogger(logEntry: unknown): void {
  // Placeholder for external logging integration
  // Could integrate with services like DataDog, LogRocket, etc.
  
  // For now, we'll just store in a simple queue
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(logEntry);
      // Keep only last 100 logs
      const recentLogs = logs.slice(-100);
      localStorage.setItem('app_logs', JSON.stringify(recentLogs));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }
}

/**
 * Development helper to view recent logs
 */
export function getRecentLogs(): unknown[] {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Clear stored logs (useful for debugging)
 */
export function clearLogs(): void {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    localStorage.removeItem('app_logs');
  }
}
