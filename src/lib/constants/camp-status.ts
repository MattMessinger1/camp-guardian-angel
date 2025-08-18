// Extended readiness constants for pre-public camps
export const CAMP_STATUS = {
  PRE_ANNOUNCEMENT: "pre_announcement",
  ANNOUNCED: "announced", 
  REGISTRATION_OPEN: "registration_open",
  REGISTRATION_CLOSED: "registration_closed"
} as const;

export const PREPARATION_GUIDANCE = {
  GENERAL_CAMP_PREP: {
    title: "General Camp Preparation",
    description: "While we wait for official requirements, here's what you can prepare:",
    items: [
      {
        category: "Documents",
        items: [
          "Medical/health form (most camps require this)",
          "Emergency contact information", 
          "Insurance card copy",
          "Photo release waiver",
          "Pickup authorization forms"
        ]
      },
      {
        category: "Child Information",
        items: [
          "Full legal name (as on birth certificate)",
          "Date of birth",
          "Grade level for upcoming school year",
          "Allergies and medical conditions",
          "Dietary restrictions",
          "Medication information"
        ]
      },
      {
        category: "Parent Information", 
        items: [
          "Primary parent/guardian contact",
          "Secondary emergency contact",
          "Work phone numbers",
          "Email addresses (check spam folders regularly)"
        ]
      },
      {
        category: "Financial",
        items: [
          "Payment method ready (most camps require immediate payment)",
          "Budget confirmation (camps typically $200-$500/week)",
          "Sibling discount information if applicable"
        ]
      }
    ]
  }
} as const;

export const COMMUNICATION_TRIGGERS = {
  CAMP_INFO_AVAILABLE: "camp_info_available",
  REGISTRATION_OPENING_SOON: "registration_opening_soon", 
  REQUIREMENTS_UPDATED: "requirements_updated",
  PREPARATION_REMINDER: "preparation_reminder"
} as const;

export type CampStatus = typeof CAMP_STATUS[keyof typeof CAMP_STATUS];
export type CommunicationTrigger = typeof COMMUNICATION_TRIGGERS[keyof typeof COMMUNICATION_TRIGGERS];