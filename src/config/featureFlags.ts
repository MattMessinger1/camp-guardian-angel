// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// Feature flags for controlled rollouts and PHI avoidance

/**
 * Learning System Feature Flags
 * All flags default to false for gradual staged rollouts
 */

// Core velocity tracking for learning system optimization
export const VELOCITY_ENABLED = false;

// Advanced cascade learning algorithms (v2)
export const CASCADE_V2_ENABLED = false;

// HIPAA boundary enforcement and PHI avoidance monitoring
export const HIPAA_BOUNDARY_ENABLED = false;

// Decision velocity rule engine for signup flow optimization
export const DECISION_VELOCITY_RULES = false;

// Real-time velocity alerts and notifications
export const VELOCITY_ALERTS_ENABLED = false;

/**
 * Additional Learning System Flags
 */

// AI-powered workflow optimization
export const AI_WORKFLOW_OPTIMIZATION = false;

// Advanced analytics and insights
export const ADVANCED_ANALYTICS = false;

// A/B testing framework for signup flows
export const AB_TESTING_FRAMEWORK = false;

// Machine learning model training
export const ML_MODEL_TRAINING = false;

// Real-time learning system monitoring
export const LEARNING_SYSTEM_MONITORING = false;

/**
 * Utility function to check if a feature is enabled
 * @param flagName - The name of the feature flag
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flagName: keyof typeof featureFlags): boolean {
  return featureFlags[flagName] ?? false;
}

// Export all flags as an object for programmatic access
export const featureFlags = {
  VELOCITY_ENABLED,
  CASCADE_V2_ENABLED,
  HIPAA_BOUNDARY_ENABLED,
  DECISION_VELOCITY_RULES,
  VELOCITY_ALERTS_ENABLED,
  AI_WORKFLOW_OPTIMIZATION,
  ADVANCED_ANALYTICS,
  AB_TESTING_FRAMEWORK,
  ML_MODEL_TRAINING,
  LEARNING_SYSTEM_MONITORING,
} as const;

export type FeatureFlag = keyof typeof featureFlags;