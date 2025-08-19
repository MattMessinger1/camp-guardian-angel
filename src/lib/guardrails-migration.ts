// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// Migration helper for updating console.log to structured logging

import { logger } from './log';

/**
 * Migration utility to help identify and update console.log usage
 * This file serves as a reference for the logging migration pattern
 */

// Example migration patterns:

// ❌ OLD: Direct console logging
// console.log('User action:', action);
// console.error('Error occurred:', error);
// console.warn('Warning message:', details);

// ✅ NEW: Structured logging with metadata
// logger.info('User action executed', { action, userId, component: 'ComponentName' });
// logger.error('Operation failed', { error: error.message, component: 'ComponentName', action: 'operationName' });
// logger.warn('Warning condition detected', { details, component: 'ComponentName' });

/**
 * Common migration patterns for different types of logging
 */

export const migrationExamples = {
  // Data ingestion logging
  dataIngestion: {
    before: `console.log('Data received:', data);`,
    after: `logger.info('Data ingestion completed', {
      component: 'ComponentName',
      action: 'dataIngestion',
      recordCount: data.length,
      phiAvoidance: {
        reason: 'Medical data excluded from ingestion',
        dataType: 'user-input',
        decision: 'excluded'
      }
    });`
  },

  // Error handling
  errorHandling: {
    before: `console.error('API call failed:', error);`,
    after: `logger.error('API call failed', {
      component: 'ComponentName',
      action: 'apiCall',
      errorType: error.code || 'unknown',
      errorMessage: error.message,
      endpoint: '/api/endpoint'
    });`
  },

  // User actions
  userActions: {
    before: `console.log('User clicked button:', buttonId);`,
    after: `logger.userAction('button-click', userId, {
      component: 'ComponentName',
      buttonId,
      timestamp: Date.now()
    });`
  },

  // Feature flag usage
  featureFlags: {
    before: `console.log('Feature enabled:', featureName);`,
    after: `logger.featureFlag(featureName, isEnabled, {
      component: 'ComponentName',
      userId
    });`
  },

  // Performance monitoring
  performance: {
    before: `console.log('Operation completed in:', duration);`,
    after: `logger.performance('Operation completed', duration, {
      component: 'ComponentName',
      action: 'operationName'
    });`
  }
};

/**
 * Files that need migration (reference list)
 * Use this as a checklist for updating console.log usage
 */
export const filesToMigrate = [
  'src/components/AssistedSignupRequirements.tsx',
  'src/components/CampWatchModal.tsx',
  'src/components/CaptchaHelper.tsx',
  'src/components/CopyChildInfo.tsx',
  'src/components/EmbeddingsBackfill.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/MultiChildSelector.tsx',
  'src/components/MultiChildSummary.tsx',
  'src/components/MultiSessionPlanner.tsx',
  'src/components/ObservabilityDashboard.tsx',
  'src/components/PaymentMethodBanner.tsx',
  'src/components/PaymentMethodCard.tsx',
  'src/components/PhoneVerification.tsx',
  'src/components/PhoneVerificationBanner.tsx',
  'src/components/PreparationGuide.tsx',
  'src/components/RequirementResearchModal.tsx',
  'src/components/ReservationHoldCard.tsx',
  'src/components/SessionReadinessCard.tsx',
  'src/components/SmartSearchBar.tsx',
  'src/components/camp-search/CampLinkIngestModal.tsx',
  'src/components/reserve/ReserveModal.tsx',
  'src/components/search/AddSessionModal.tsx',
  'src/components/ui/error-boundary.tsx',
  'src/config/environment.ts',
  'src/hooks/useGeocoding.ts',
  'src/hooks/useHealthCheck.ts',
  'src/hooks/useSessionExtraction.ts',
  // Add Edge Functions
  'supabase/functions/*/index.ts'
];

/**
 * PHI Avoidance comment template
 * Add this comment to all data ingestion points
 */
export const phiAvoidanceComment = `
// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// PHI Avoidance: This endpoint deliberately avoids collecting any PHI data
`;

/**
 * Standard metadata for common operations
 */
export const standardMetadata = {
  signup: {
    phiAvoidance: {
      reason: 'Signup process excludes medical information',
      dataType: 'user-registration',
      decision: 'excluded'
    }
  },
  
  reservation: {
    phiAvoidance: {
      reason: 'Reservation data excludes medical/health information',
      dataType: 'reservation-data',
      decision: 'excluded'
    }
  },
  
  payment: {
    phiAvoidance: {
      reason: 'Payment processing excludes health insurance data',
      dataType: 'payment-info',
      decision: 'excluded'
    }
  },
  
  userProfile: {
    phiAvoidance: {
      reason: 'Profile data excludes medical conditions and health records',
      dataType: 'user-profile',
      decision: 'excluded'
    }
  }
};

export default migrationExamples;