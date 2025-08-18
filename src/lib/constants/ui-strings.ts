// UI strings for Ready for Signup features and general app messaging

export const UI_STRINGS = {
  // Payment Method Banner & Cards
  PAYMENT_METHOD_BANNER: "Add a payment method now so you're ready. We'll only charge $20 if your signup succeeds.",
  PAYMENT_METHOD_READY_TITLE: "Payment Method Ready",
  PAYMENT_METHOD_READY_DESC: "You have a payment method on file. You're ready to register!",
  PAYMENT_METHOD_REQUIRED_TITLE: "Payment Method Required", 
  PAYMENT_METHOD_REQUIRED_DESC: "Add a payment method now so you're ready for registration.",
  PAYMENT_METHOD_SUCCESS_FEE_NOTE: "We'll only charge $20 if your signup succeeds.",
  PAYMENT_METHOD_NO_FAILED_CHARGES: "No charges for failed attempts or if registration doesn't open.",

  // Reserve Modal Consent
  RESERVE_CONSENT_CHECKBOX: "I authorize a $20 success fee only if my signup is successful.",
  RESERVE_CONSENT_REQUIRED_ERROR: "You must authorize the success fee to proceed with reservation.",

  // Error Messages
  ERROR_TWO_CHILD_CAP: "Each family may reserve spots for up to two children per session. You already have two.",
  ERROR_DUPLICATE_CHILD: "This child appears to already exist in our system. If this seems wrong, please contact support.",
  ERROR_NO_PAYMENT_METHOD: "A saved payment method is required to register. Please add a card and try again.",
  ERROR_AUTHENTICATION_REQUIRED: "Please log in to make a reservation.",
  ERROR_PAYMENT_SETUP_FAILED: "Failed to set up payment method. Please try again.",

  // Success Messages
  SUCCESS_PAYMENT_METHOD_ADDED: "Your payment method has been saved successfully",
  SUCCESS_RESERVATION_CONFIRMED: "Success! Your spot is reserved.",
  SUCCESS_VERIFICATION_SENT: "Quick verification sent via SMS. Tap the link or enter the code to finish.",

  // Readiness Status
  READINESS_READY_TITLE: "Ready for Signup",
  READINESS_READY_DESC: "All Set!",
  READINESS_IN_PROGRESS_TITLE: "In Progress", 
  READINESS_IN_PROGRESS_DESC: "Under Review",
  READINESS_NEEDS_SETUP_TITLE: "Setup Required",
  READINESS_NEEDS_SETUP_DESC: "Research Required",
  READINESS_BLOCKED_TITLE: "Action Required",

  // Time Urgency
  TIME_OPENS_TODAY: "Opens Today",
  TIME_OPENS_TOMORROW: "Opens Tomorrow", 
  TIME_OPENS_IN_DAYS: (days: number) => `Opens in ${days} days`,

  // Progress Indicators
  PROGRESS_COMPLETE: (completed: number, total: number) => `${completed} of ${total} complete`,
  PROGRESS_PERCENTAGE: (percentage: number) => `${percentage}%`,

  // Research & Requirements
  RESEARCH_REQUIREMENTS_BTN: "Research Requirements",
  RESEARCH_MODAL_TITLE: "Research Session Requirements",
  RESEARCH_SUBMIT_SUCCESS: "Research submitted successfully",
  RESEARCH_CONFIDENCE_HIGH: "Very confident in requirements",
  RESEARCH_CONFIDENCE_LOW: "Could not find clear information",

  // General Actions
  ACTION_ADD_CARD: "Add Card",
  ACTION_COMPLETE_PREP: "Complete Prep", 
  ACTION_RESERVE: "Reserve",
  ACTION_CANCEL: "Cancel",
  ACTION_SETTING_UP: "Setting up...",
  ACTION_WORKING: "Working…",

  // Notifications
  NOTIFICATION_LOGIN_REQUIRED: "Please log in to add a payment method",
  NOTIFICATION_SETUP_REDIRECTING: "Redirecting to secure payment method setup...",
  NOTIFICATION_VERIFICATION_REQUIRED: "Verification required. Please check your messages or contact support.",

} as const;

export type UIStringKey = keyof typeof UI_STRINGS;