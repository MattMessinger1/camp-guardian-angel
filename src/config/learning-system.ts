// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// Learning System Configuration for PHI-compliant AI optimization

import { featureFlags } from './featureFlags';

/**
 * Learning System Configuration
 * Controls AI-powered workflow optimization while maintaining PHI compliance
 */

export interface LearningSystemConfig {
  // Core system settings
  enabled: boolean;
  modelVersion: string;
  confidenceThreshold: number;
  
  // PHI compliance settings
  phiAvoidanceStrict: boolean;
  dataRetentionDays: number;
  anonymizationLevel: 'strict' | 'moderate' | 'minimal';
  
  // Learning parameters
  learningRate: number;
  adaptationWindow: number; // hours
  minimumSampleSize: number;
  
  // Feature-specific settings
  velocityTracking: boolean;
  cascadeLearning: boolean;
  decisionVelocityRules: boolean;
  alertsEnabled: boolean;
}

/**
 * Default configuration with PHI-safe defaults
 */
export const defaultConfig: LearningSystemConfig = {
  // Core system - disabled by default for gradual rollout
  enabled: featureFlags.VELOCITY_ENABLED,
  modelVersion: 'v1.0.0',
  confidenceThreshold: 0.75,
  
  // PHI compliance - strict by default
  phiAvoidanceStrict: true,
  dataRetentionDays: 30, // Short retention for compliance
  anonymizationLevel: 'strict',
  
  // Learning parameters - conservative defaults
  learningRate: 0.1,
  adaptationWindow: 24, // 24 hours
  minimumSampleSize: 50,
  
  // Feature flags integration
  velocityTracking: featureFlags.VELOCITY_ENABLED,
  cascadeLearning: featureFlags.CASCADE_V2_ENABLED,
  decisionVelocityRules: featureFlags.DECISION_VELOCITY_RULES,
  alertsEnabled: featureFlags.VELOCITY_ALERTS_ENABLED,
};

/**
 * Learning System Metrics Categories
 * Defines what we can safely learn from without PHI concerns
 */
export const SAFE_METRICS = {
  // Workflow timing metrics (no PHI)
  WORKFLOW_DURATION: 'workflow_duration',
  STEP_COMPLETION_TIME: 'step_completion_time',
  USER_INTERACTION_PATTERNS: 'user_interaction_patterns',
  
  // Error patterns (sanitized)
  ERROR_FREQUENCY: 'error_frequency',
  ERROR_RECOVERY_TIME: 'error_recovery_time',
  VALIDATION_FAILURES: 'validation_failures',
  
  // Success patterns
  COMPLETION_RATES: 'completion_rates',
  CONVERSION_FUNNEL: 'conversion_funnel',
  OPTIMIZATION_IMPACT: 'optimization_impact',
  
  // System performance
  API_RESPONSE_TIMES: 'api_response_times',
  DATABASE_QUERY_PERFORMANCE: 'database_query_performance',
  CACHE_HIT_RATES: 'cache_hit_rates',
} as const;

/**
 * PHI Avoidance Rules for Learning System
 */
export const PHI_AVOIDANCE_RULES = {
  // Prohibited data types
  PROHIBITED_FIELDS: [
    'medical_conditions',
    'allergies',
    'medications',
    'health_insurance',
    'medical_records',
    'doctor_information',
    'health_status',
    'special_needs_medical',
  ],
  
  // Allowed metadata (anonymized/aggregated only)
  ALLOWED_METADATA: [
    'interaction_timing',
    'button_click_patterns',
    'form_completion_rates',
    'error_occurrence_frequency',
    'session_duration',
    'page_navigation_patterns',
  ],
  
  // Data transformation rules
  ANONYMIZATION_RULES: {
    user_id: 'hash_with_salt',
    session_id: 'temporary_identifier',
    timestamps: 'relative_only',
    ip_address: 'exclude',
    user_agent: 'exclude',
  },
} as const;

/**
 * Learning System Event Types
 * Safe events for AI learning without PHI exposure
 */
export const LEARNING_EVENTS = {
  // Workflow events
  SIGNUP_FLOW_START: 'signup_flow_start',
  SIGNUP_FLOW_COMPLETE: 'signup_flow_complete',
  SIGNUP_FLOW_ABANDON: 'signup_flow_abandon',
  
  // Readiness events
  READINESS_CHECK_START: 'readiness_check_start',
  READINESS_CHECK_COMPLETE: 'readiness_check_complete',
  READINESS_OPTIMIZATION: 'readiness_optimization',
  
  // Error events (sanitized)
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',
  USER_ERROR_RECOVERY: 'user_error_recovery',
  
  // Success events
  CONVERSION_SUCCESS: 'conversion_success',
  WORKFLOW_OPTIMIZATION: 'workflow_optimization',
  PERFORMANCE_IMPROVEMENT: 'performance_improvement',
} as const;

/**
 * Get current learning system configuration
 * Respects feature flags and environment settings
 */
export function getLearningSystemConfig(): LearningSystemConfig {
  return {
    ...defaultConfig,
    // Override with feature flag states
    enabled: featureFlags.VELOCITY_ENABLED,
    velocityTracking: featureFlags.VELOCITY_ENABLED,
    cascadeLearning: featureFlags.CASCADE_V2_ENABLED,
    decisionVelocityRules: featureFlags.DECISION_VELOCITY_RULES,
    alertsEnabled: featureFlags.VELOCITY_ALERTS_ENABLED,
    
    // Ensure PHI compliance is always strict
    phiAvoidanceStrict: true,
  };
}

/**
 * Validate that a metric is safe to collect
 */
export function isSafeMetric(metricType: string, data: any): boolean {
  // Check if metric type is in allowed list
  if (!Object.values(SAFE_METRICS).includes(metricType as any)) {
    return false;
  }
  
  // Check for prohibited fields in data
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    const hasProhibitedField = keys.some(key => 
      PHI_AVOIDANCE_RULES.PROHIBITED_FIELDS.some(prohibited => 
        key.toLowerCase().includes(prohibited.toLowerCase())
      )
    );
    
    if (hasProhibitedField) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize learning data to ensure PHI compliance
 */
export function sanitizeLearningData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Remove prohibited fields
  PHI_AVOIDANCE_RULES.PROHIBITED_FIELDS.forEach(field => {
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase().includes(field.toLowerCase())) {
        delete sanitized[key];
        sanitized[`${key}_removed`] = 'PHI_AVOIDANCE';
      }
    });
  });
  
  // Apply anonymization rules
  Object.entries(PHI_AVOIDANCE_RULES.ANONYMIZATION_RULES).forEach(([field, rule]) => {
    if (sanitized[field]) {
      switch (rule) {
        case 'hash_with_salt':
          sanitized[field] = `hashed_${Math.random().toString(36).substr(2, 9)}`;
          break;
        case 'temporary_identifier':
          sanitized[field] = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          break;
        case 'relative_only':
          if (sanitized[field] instanceof Date || typeof sanitized[field] === 'string') {
            sanitized[field] = 'timestamp_relative';
          }
          break;
        case 'exclude':
          delete sanitized[field];
          break;
      }
    }
  });
  
  return sanitized;
}

export default {
  defaultConfig,
  getLearningSystemConfig,
  isSafeMetric,
  sanitizeLearningData,
  SAFE_METRICS,
  PHI_AVOIDANCE_RULES,
  LEARNING_EVENTS,
};