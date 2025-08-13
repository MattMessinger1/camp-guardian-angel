import type {
  ProviderAdapter,
  ProviderContext,
  ProviderIntent,
  ProviderSessionCandidate,
  ReserveResult,
  FinalizeResult,
} from '../types';
import { matchWeek } from '../../matching/weekOf';
import { sortCandidates } from '../../matching/bundles';

interface JackrabbitLoginData {
  username: string;
  password: string;
}

interface ChildData {
  dob: string;
  grade?: string;
  emergency_contacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
}

interface ClassCard {
  id: string;
  title: string;
  age_range?: string;
  date_range?: string;
  time?: string;
  availability?: 'open' | 'waitlist' | 'full';
  enrollment_url?: string;
}

const adapter: ProviderAdapter = {
  async precheck(ctx: ProviderContext) {
    try {
      // Extract the ID from canonical URL (regv2.asp?id=...)
      const url = new URL(ctx.canonical_url);
      const orgId = url.searchParams.get('id');
      
      if (!orgId) {
        return { ok: false, reason: 'Invalid Jackrabbit URL - missing organization ID' };
      }

      // Check if login credentials are available in vault/context
      const hasCredentials = ctx.metadata?.vault?.jackrabbit_login;
      if (!hasCredentials) {
        return { ok: false, reason: 'Parent organization credentials not found in vault' };
      }

      // Verify child fields are available
      const childData = ctx.child_token as ChildData;
      if (!childData?.dob) {
        return { ok: false, reason: 'Child date of birth required for registration' };
      }

      if (!childData.emergency_contacts || childData.emergency_contacts.length === 0) {
        return { ok: false, reason: 'Emergency contact information required' };
      }

      // Test connectivity to the registration page
      const testUrl = `${url.origin}/regv2.asp?id=${orgId}`;
      
      // In a real implementation, you would make an HTTP request here
      // For now, we'll assume connectivity is good
      console.log(`Testing connectivity to: ${testUrl}`);

      return { ok: true };
    } catch (error) {
      console.error('Jackrabbit precheck failed:', error);
      return { ok: false, reason: 'Failed to validate Jackrabbit setup' };
    }
  },

  async findSessions(ctx: ProviderContext, intent?: ProviderIntent): Promise<ProviderSessionCandidate[]> {
    try {
      // Parse the registration URL to get organization details
      const url = new URL(ctx.canonical_url);
      const orgId = url.searchParams.get('id');
      
      if (!orgId) {
        throw new Error('Invalid Jackrabbit URL');
      }

      // In a real implementation, this would scrape or call API to get class cards
      // For now, we'll simulate parsing class cards from the page
      const classCards = await parseClassCards(ctx.canonical_url);
      
      const candidates: ProviderSessionCandidate[] = [];

      for (const card of classCards) {
        // Parse dates and times from the class card
        const { start_at, end_at } = parseClassTiming(card);
        
        // Build session candidate
        const candidate: ProviderSessionCandidate = {
          id: card.id,
          url: card.enrollment_url || ctx.canonical_url,
          title: card.title,
          start_at,
          end_at,
          capacity: card.availability === 'full' ? 0 : null,
          provider_id: orgId,
        };

        candidates.push(candidate);
      }

      // Filter by intent criteria if provided
      let filteredCandidates = candidates;

      if (intent?.titleContains) {
        const searchTerm = intent.titleContains.toLowerCase();
        filteredCandidates = filteredCandidates.filter(c => 
          c.title?.toLowerCase().includes(searchTerm)
        );
      }

      // Use fuzzy week-of matching if date preference provided
      if (intent?.date) {
        const priorityRankMap: Record<string, number> = {};
        
        filteredCandidates.forEach((candidate, index) => {
          if (candidate.start_at && matchWeek(intent.date!, candidate.start_at)) {
            priorityRankMap[candidate.id] = index;
          }
        });

        filteredCandidates = sortCandidates(filteredCandidates, {
          priorityRankMap,
          weekOfISO: intent.date,
        });
      }

      return filteredCandidates;
    } catch (error) {
      console.error('Jackrabbit findSessions failed:', error);
      return [];
    }
  },

  async reserve(ctx: ProviderContext, candidate: ProviderSessionCandidate): Promise<ReserveResult> {
    try {
      const loginData = ctx.metadata?.vault?.jackrabbit_login as JackrabbitLoginData;
      const childData = ctx.child_token as ChildData;

      if (!loginData || !childData) {
        return { 
          success: false, 
          candidate, 
          reason: 'Missing login credentials or child data' 
        };
      }

      // Step 1: Navigate to enrollment page
      const enrollmentUrl = candidate.url || ctx.canonical_url;
      
      // Step 2: Check if login is required and perform login
      const isLoggedIn = await performLogin(enrollmentUrl, loginData);
      if (!isLoggedIn) {
        return { 
          success: false, 
          candidate, 
          reason: 'Failed to login to Jackrabbit system' 
        };
      }

      // Step 3: Click Register/Enroll button
      const registrationResult = await initiateRegistration(candidate);
      
      if (registrationResult.needs_human_verification) {
        return { 
          success: false, 
          needs_captcha: true, 
          provider: 'jackrabbit_class', 
          candidate 
        };
      }

      // Step 4: Select child and fill forms
      const formResult = await fillRegistrationForm(candidate, childData);
      
      if (!formResult.success) {
        if (formResult.waitlist_only) {
          return { 
            success: false, 
            waitlisted: true, 
            candidate 
          };
        }
        
        return { 
          success: false, 
          candidate, 
          reason: formResult.error || 'Failed to complete registration form' 
        };
      }

      // Step 5: Submit registration
      const submissionResult = await submitRegistration(candidate);
      
      if (submissionResult.success) {
        return { 
          success: true, 
          candidate: {
            ...candidate,
            provider_id: submissionResult.confirmation_id
          }
        };
      }

      return { 
        success: false, 
        candidate, 
        reason: submissionResult.error || 'Registration submission failed' 
      };

    } catch (error) {
      console.error('Jackrabbit reservation failed:', error);
      return { 
        success: false, 
        candidate, 
        reason: `Registration error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  async finalizePayment(ctx: ProviderContext, candidate: ProviderSessionCandidate): Promise<FinalizeResult> {
    try {
      // Check if provider collects payment directly
      const providerCollectsPayment = await checkProviderPaymentMethod(candidate);
      
      if (providerCollectsPayment) {
        // Provider handles payment collection, we only charge our $20 service fee
        // (and $20 priority fee if applicable)
        console.log('Provider collects payment directly, skipping provider charge');
        
        // Return success with the confirmation ID from the reservation
        return { 
          success: true, 
          confirmation_id: candidate.provider_id || candidate.id 
        };
      } else {
        // Use existing capture-on-success payment flow
        const paymentResult = await processProviderPayment(ctx, candidate);
        
        if (paymentResult.success) {
          return { 
            success: true, 
            confirmation_id: paymentResult.confirmation_id 
          };
        } else {
          return { 
            success: false, 
            error: paymentResult.error || 'Payment processing failed' 
          };
        }
      }
    } catch (error) {
      console.error('Jackrabbit payment finalization failed:', error);
      return { 
        success: false, 
        error: `Payment error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },
};

// Helper functions for the adapter

async function parseClassCards(url: string): Promise<ClassCard[]> {
  // In a real implementation, this would scrape the Jackrabbit registration page
  // and parse the class cards to extract session information
  console.log(`Parsing class cards from: ${url}`);
  
  // Simulate parsed class cards
  return [
    {
      id: 'class_1',
      title: 'Youth Soccer Training',
      age_range: '6-12',
      date_range: 'Mon-Fri, Jan 15-19',
      time: '4:00 PM - 5:30 PM',
      availability: 'open',
      enrollment_url: `${url}&class=1`
    }
  ];
}

function parseClassTiming(card: ClassCard): { start_at: string | null; end_at: string | null } {
  // Parse the date_range and time to create proper ISO timestamps
  // This is a simplified implementation
  
  if (!card.date_range || !card.time) {
    return { start_at: null, end_at: null };
  }

  // In a real implementation, you would parse the actual date and time strings
  // For now, return placeholder dates
  const now = new Date();
  const start_at = now.toISOString();
  const end_at = new Date(now.getTime() + 90 * 60 * 1000).toISOString(); // 90 minutes later

  return { start_at, end_at };
}

async function performLogin(url: string, loginData: JackrabbitLoginData): Promise<boolean> {
  // In a real implementation, this would:
  // 1. Check if already logged in
  // 2. Navigate to login page if needed
  // 3. Fill username/password fields
  // 4. Submit login form
  // 5. Verify successful login
  
  console.log(`Performing login for: ${loginData.username}`);
  return true; // Simulate successful login
}

async function initiateRegistration(candidate: ProviderSessionCandidate): Promise<{
  success: boolean;
  needs_human_verification?: boolean;
  error?: string;
}> {
  // In a real implementation, this would click the Register/Enroll button
  // and handle any immediate challenges or redirects
  
  console.log(`Initiating registration for: ${candidate.title}`);
  return { success: true };
}

async function fillRegistrationForm(candidate: ProviderSessionCandidate, childData: ChildData): Promise<{
  success: boolean;
  waitlist_only?: boolean;
  error?: string;
}> {
  // In a real implementation, this would:
  // 1. Select the appropriate child from dropdown/list
  // 2. Fill required form fields (DOB, grade, emergency contacts, etc.)
  // 3. Handle any conditional fields or validations
  // 4. Check if only waitlist option is available
  
  console.log(`Filling registration form for: ${candidate.title}`, childData);
  return { success: true };
}

async function submitRegistration(candidate: ProviderSessionCandidate): Promise<{
  success: boolean;
  confirmation_id?: string;
  error?: string;
}> {
  // In a real implementation, this would submit the registration form
  // and capture the confirmation/enrollment ID from the response
  
  console.log(`Submitting registration for: ${candidate.title}`);
  return { 
    success: true, 
    confirmation_id: `JR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
  };
}

async function checkProviderPaymentMethod(candidate: ProviderSessionCandidate): Promise<boolean> {
  // In a real implementation, this would check if the provider
  // collects payment directly vs. expecting us to charge
  
  console.log(`Checking payment method for: ${candidate.title}`);
  return false; // Assume we handle payment by default
}

async function processProviderPayment(ctx: ProviderContext, candidate: ProviderSessionCandidate): Promise<{
  success: boolean;
  confirmation_id?: string;
  error?: string;
}> {
  // In a real implementation, this would integrate with the existing
  // capture-on-success payment flow for the provider's fees
  
  console.log(`Processing provider payment for: ${candidate.title}`);
  return { 
    success: true, 
    confirmation_id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
  };
}

export default adapter;
