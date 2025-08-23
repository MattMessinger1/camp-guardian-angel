export interface TestCampScenario {
  id: string;
  name: string;
  description: string;
  sessionData: {
    id: string;
    registration_open_at?: string;
    open_time_exact: boolean;
    platform: string;
    activities: {
      name: string;
      city: string;
      state: string;
    };
    signup_url?: string;
    price_min?: number;
    age_min?: number;
    age_max?: number;
  };
  requirements?: {
    deposit_amount_cents: number;
    required_parent_fields: string[];
    required_child_fields: string[];
    required_documents: string[];
  };
}

export const TEST_CAMP_SCENARIOS: Record<string, TestCampScenario> = {
  // Basic test - registration opens in 7 days
  'basic-camp': {
    id: 'basic-camp',
    name: 'Basic Summer Camp Test',
    description: 'Standard camp with future registration date',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555501',
      registration_open_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      open_time_exact: true,
      platform: 'ActiveNet',
      activities: {
        name: 'Summer Adventure Camp',
        city: 'San Francisco',
        state: 'CA'
      },
      price_min: 200,
      age_min: 6,
      age_max: 12
    }
  },

  // Urgent - registration opens in 2 hours
  'urgent-signup': {
    id: 'urgent-signup',
    name: 'Urgent Signup Test',
    description: 'Registration opens very soon',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555502',
      registration_open_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      open_time_exact: true,
      platform: 'CampMinder',
      activities: {
        name: 'Last Minute Soccer Camp',
        city: 'Austin',
        state: 'TX'
      },
      price_min: 150
    }
  },

  // No signup time set
  'missing-signup-time': {
    id: 'missing-signup-time',
    name: 'Missing Signup Time Test',
    description: 'Camp without confirmed registration time',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555503',
      // no registration_open_at
      open_time_exact: false,
      platform: 'RecTrac',
      activities: {
        name: 'Art & Crafts Camp',
        city: 'Portland',
        state: 'OR'
      },
      price_min: 180
    }
  },

  // HIPAA-sensitive camp
  'medical-camp': {
    id: 'medical-camp',
    name: 'Medical/Health Sensitive Camp',
    description: 'Camp that requires medical information (triggers HIPAA avoidance)',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555504',
      registration_open_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      open_time_exact: true,
      platform: 'HealthcareProvider',
      activities: {
        name: 'Special Needs Summer Program',
        city: 'Denver',
        state: 'CO'
      },
      signup_url: 'https://medical-camp.example.com/register'
    },
    requirements: {
      deposit_amount_cents: 30000, // $300
      required_parent_fields: ['email', 'phone', 'emergency_contact', 'insurance_info'],
      required_child_fields: ['name', 'dob'], // PHI fields avoided
      required_documents: ['waiver', 'emergency_form'] // medical forms avoided
    }
  },

  // High-end expensive camp
  'premium-camp': {
    id: 'premium-camp',
    name: 'Premium Camp Test',
    description: 'Expensive camp with extensive requirements',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555505',
      registration_open_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      open_time_exact: true,
      platform: 'PremiumCamps',
      activities: {
        name: 'Elite Tennis Academy',
        city: 'Miami',
        state: 'FL'
      },
      price_min: 1500,
      age_min: 8,
      age_max: 16
    },
    requirements: {
      deposit_amount_cents: 50000, // $500
      required_parent_fields: ['email', 'phone', 'emergency_contact', 'payment_info', 'references'],
      required_child_fields: ['name', 'dob', 'skill_level', 'previous_experience'],
      required_documents: ['waiver', 'skill_assessment', 'recommendation_letter']
    }
  },

  // Already open registration
  'open-now': {
    id: 'open-now',
    name: 'Registration Open Now',
    description: 'Registration is currently open',
    sessionData: {
      id: '11111111-2222-3333-4444-555555555506',
      registration_open_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      open_time_exact: true,
      platform: 'OpenRegistration',
      activities: {
        name: 'Basketball Skills Camp',
        city: 'Chicago',
        state: 'IL'
      },
      price_min: 120
    }
  }
};

// Helper function to get test scenario by session ID
export function getTestScenario(sessionId: string): TestCampScenario | null {
  return Object.values(TEST_CAMP_SCENARIOS).find(scenario => 
    scenario.sessionData.id === sessionId
  ) || null;
}

// Helper to get all test session IDs
export function getAllTestSessionIds(): string[] {
  return Object.values(TEST_CAMP_SCENARIOS).map(scenario => scenario.sessionData.id);
}