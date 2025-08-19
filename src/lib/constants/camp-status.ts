// Extended readiness constants for pre-public camps
export const CAMP_STATUS = {
  PRE_ANNOUNCEMENT: "pre_announcement",
  ANNOUNCED: "announced", 
  REGISTRATION_OPEN: "registration_open",
  REGISTRATION_CLOSED: "registration_closed"
} as const;

export const PREPARATION_GUIDANCE = {
  GENERAL_CAMP_PREP: {
    title: "General Camp Preparation Checklist",
    description: "Get ahead by preparing these essential items before camp-specific requirements are announced.",
    items: [
      {
        category: "Child Information",
        items: [
          "Gather basic child information (name, age, grade)",
          "Compile emergency contact details", 
          "Note any allergies or dietary restrictions",
          "Document any special needs or accommodations",
          "Prepare backup emergency contacts"
        ]
      },
      {
        category: "Financial Setup",
        items: [
          "Add payment method for $20 success fee authorization",
          "Research camp fee structure and payment deadlines",
          "Set up dedicated camp savings account",
          "Plan for additional expenses (supplies, field trips)",
          "Understand camp's refund and payment policies"
        ]
      },
      {
        category: "Account Setup",
        items: [
          "Create camp registration account early",
          "Verify account login credentials work",
          "Complete basic profile information",
          "Set up notification preferences",
          "Test account access on registration device"
        ]
      },
      {
        category: "Registration Strategy",
        items: [
          "Plan registration day schedule and backup plan",
          "Set up alerts for registration opening",
          "Prepare registration device and internet backup",
          "Research camp's specific registration process",
          "Know exact registration opening time and timezone"
        ]
      },
      {
        category: "Information Gathering",
        items: [
          "Research camp's typical requirements",
          "Connect with other families who've registered before",
          "Follow camp social media for updates",
          "Sign up for camp newsletter or notifications",
          "Bookmark important camp pages and forms"
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