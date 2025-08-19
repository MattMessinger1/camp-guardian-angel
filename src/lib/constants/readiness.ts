// Product-wide constants for readiness status
export const READINESS_STATUS = {
  READY_FOR_SIGNUP: "ready_for_signup",
  NEEDS_SETUP: "needs_setup", 
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked"
} as const;

export const READINESS_LABELS = {
  [READINESS_STATUS.READY_FOR_SIGNUP]: "Ready for Signup",
  [READINESS_STATUS.NEEDS_SETUP]: "Setup Required",
  [READINESS_STATUS.IN_PROGRESS]: "In Progress", 
  [READINESS_STATUS.BLOCKED]: "Action Required"
} as const;

export const COMMUNICATION_CADENCE = {
  IMMEDIATE: "immediate", // For urgent/blocking issues
  DAILY: "daily", // During final week
  BI_DAILY: "bi_daily", // 2-3 weeks out
  WEEKLY: "weekly", // More than 3 weeks out
  NONE: "none" // User is ready or scenario complete
} as const;

export type ReadinessStatus = typeof READINESS_STATUS[keyof typeof READINESS_STATUS];
export type CommunicationCadence = typeof COMMUNICATION_CADENCE[keyof typeof COMMUNICATION_CADENCE];