// src/pages/ReadyToSignup.tsx - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RestaurantBookingUI } from '@/components/RestaurantBookingUI';

interface LocationState {
  businessName: string;
  businessUrl: string;  
  provider?: string;
  searchResult?: any;
  classData?: {
    id: string;
    name: string;
    description?: string;
    schedule: Array<{
      day: string;
      time: string;
      duration?: string;
    }>;
    ageRange?: {
      min: number;
      max: number;
    };
    capacity?: number;
    currentEnrollment?: number;
    tuition?: {
      amount: number;
      period: string;
    };
    registrationOpensAt?: string;
    location?: string;
    instructor?: string;
  };
  providerInfo?: {
    name: string;
    website?: string;
    location?: string;
  };
}

// Global state manager for persistence
class StateManager {
  private static KEY = 'carbone_booking_state';
  
  static save(state: LocationState): void {
    if (state?.businessUrl) {
      console.log('💾 Saving state to storage:', state);
      localStorage.setItem(this.KEY, JSON.stringify(state));
    }
  }
  
  static load(): LocationState | null {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📂 Loaded state from storage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return null;
  }
  
  static clear(): void {
    console.log('🗑️ Clearing stored state');
    localStorage.removeItem(this.KEY);
  }
}

export default function ReadyToSignup() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [registrationPlan, setRegistrationPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  
  // Track if we've already tried to create a plan
  const planCreationAttempted = useRef(false);
  
  // Get location state - ALWAYS check both sources
  const getLocationState = (): LocationState | null => {
    // Priority 1: Fresh navigation state
    if (location.state?.businessUrl) {
      const state = location.state as LocationState;
      StateManager.save(state); // Always save when we have it
      return state;
    }
    
    // Priority 2: Stored state
    const stored = StateManager.load();
    if (stored?.businessUrl) {
      return stored;
    }
    
    return null;
  };
  
  const locationState = getLocationState();
  
  useEffect(() => {
    console.log('📍 ReadyToSignup initialization:', {
      sessionId,
      hasLocationState: !!locationState,
      locationState,
      pathname: location.pathname,
      isRealPlanId: sessionId && !sessionId.includes('test')
    });
    
    // Don't clear state on unmount - we need it for navigation!
    initializeRegistration();
  }, [sessionId]);
  
  const initializeRegistration = async () => {
    try {
      setIsLoading(true);
      
      // Skip test session IDs and 'pending'
      if (sessionId?.includes('test') || sessionId === 'pending') {
        console.log('⚠️ Skipping test/pending session ID');
        if (locationState && !planCreationAttempted.current) {
          await createNewPlan();
        }
        return;
      }
      
      // Try to load existing plan from registration_plans
      if (sessionId) {
        const { data: plan, error } = await supabase
          .from('registration_plans')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();
        
        if (!error && plan) {
          console.log('✅ Found existing plan:', plan);
          
          // Transform to expected format
          const rules = plan.rules as any || {};
          const existingPlan = {
            id: plan.id,
            session_id: plan.session_id,
            provider_name: rules.business_name || locationState?.businessName,
            provider_url: rules.business_url || locationState?.businessUrl,
            provider_type: rules.provider_type || detectProviderType(rules.business_url || locationState?.businessUrl || ''),
            status: plan.status,
            rules: rules,
            preferences: rules.preferences || {},
            ...plan
          };
          
          setRegistrationPlan(existingPlan);
          setIsLoading(false);
          return;
        }
      }
      
      // No plan found - create one if we have the data
      if (locationState?.businessUrl && !planCreationAttempted.current && !isCreatingPlan) {
        console.log('📝 No plan found, creating new one');
        await createNewPlan();
      } else if (!locationState) {
        console.error('❌ No location state available');
        toast.error('Booking information lost. Please search again.');
        StateManager.clear();
        navigate('/');
      }
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      toast.error('Failed to initialize booking');
    } finally {
      setIsLoading(false);
    }
  };
  
  const createNewPlan = async () => {
    if (!locationState?.businessUrl || planCreationAttempted.current) {
      console.log('⚠️ Skipping plan creation:', { 
        hasUrl: !!locationState?.businessUrl, 
        attempted: planCreationAttempted.current 
      });
      return;
    }
    
    planCreationAttempted.current = true;
    setIsCreatingPlan(true);
    
    try {
      const newSessionId = crypto.randomUUID();
      const providerType = detectProviderType(locationState.businessUrl);
      
      // Extract organization ID from JackRabbit URLs
      const providerOrgId = extractOrgIdFromUrl(locationState.businessUrl);
      
      // Handle Jackrabbit class data from state
      const classData = locationState.classData;
      const isJackrabbitClass = classData && locationState.provider === 'jackrabbit_class';
      
      console.log('🚀 Creating plan:', {
        businessName: locationState.businessName,
        url: locationState.businessUrl,
        type: providerType,
        sessionId: newSessionId,
        orgId: providerOrgId,
        isJackrabbitClass,
        classData
      });
      
      // Create activity first
      const activityData: any = {
        name: isJackrabbitClass ? classData.name : locationState.businessName,
        canonical_url: locationState.businessUrl,
        provider_id: locationState.provider || 'unknown',
        kind: isJackrabbitClass ? 'class' : providerType.split('-')[0] // 'class', 'restaurant' or 'fitness'
      };
      
      if (isJackrabbitClass && classData.description) {
        activityData.description = classData.description;
      }
      
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert(activityData)
        .select()
        .single();
      
      if (activityError) {
        console.error('❌ Activity creation error:', activityError);
        throw activityError;
      }
      
      // Create session with enhanced Jackrabbit data
      const sessionData: any = {
        id: newSessionId,
        activity_id: activity.id,
        title: isJackrabbitClass ? `${classData.name} Class` : `${locationState.businessName} Registration`,
        provider_org_id: providerOrgId,
        platform: locationState.provider || detectProviderType(locationState.businessUrl)
      };
      
      // Add Jackrabbit-specific session details
      if (isJackrabbitClass) {
        if (classData.schedule?.[0]) {
          // Use first schedule entry for session timing
          const schedule = classData.schedule[0];
          sessionData.provider_session_key = `jackrabbit-${providerOrgId}-${classData.id}`;
          sessionData.registration_open_at = classData.registrationOpensAt ? 
            new Date(classData.registrationOpensAt) : null;
        }
        
        if (classData.tuition) {
          sessionData.upfront_fee_cents = Math.round(classData.tuition.amount * 100);
        }
        
        if (classData.capacity) {
          sessionData.capacity = classData.capacity;
        }
      }
      
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          activity_id: activity.id,
          title: `${locationState.businessName} Booking`
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        throw sessionError;
      }
      
      // Create registration plan
      const planRules = isJackrabbitClass ? {
        business_name: locationState.businessName,
        business_url: locationState.businessUrl,
        provider_type: 'jackrabbit_class',
        provider: 'jackrabbit_class',
        classData: classData,
        providerInfo: locationState.providerInfo,
        credentials: {},
        preferences: {},
        automation_config: {
          platform: 'jackrabbit_class',
          org_id: providerOrgId
        }
      } : {
        business_name: locationState.businessName,
        business_url: locationState.businessUrl,
        provider_type: providerType,
        provider: locationState.provider || 'unknown',
        credentials: {},
        preferences: {},
        automation_config: {}
      };
      
      const { data: reservation, error: reservationError } = await supabase
        .from('registration_plans')
        .insert({
          id: newSessionId,
          session_id: session.id,
          status: 'pending',
          provider_org_id: providerOrgId,
          rules: planRules
        })
        .select()
        .single();
      
      if (reservationError) {
        console.error('❌ Reservation creation error:', reservationError);
        throw reservationError;
      }
      
      console.log('✅ Plan created successfully:', reservation);
      
      // Transform to expected format
      const newPlan = {
        id: reservation.id,
        session_id: reservation.id,
        provider_name: isJackrabbitClass ? classData.name : locationState.businessName,
        provider_url: locationState.businessUrl,
        provider_type: isJackrabbitClass ? 'jackrabbit_class' : providerType,
        status: 'active',
        classData: isJackrabbitClass ? classData : undefined,
        providerInfo: locationState.providerInfo,
        preferences: {
          party_size: 2,
          preferred_date: '',
          preferred_time: ''
        }
      };
      
      setRegistrationPlan(newPlan);
      
      // Navigate to the new URL with state
      if (newSessionId !== sessionId) {
        navigate(`/ready-to-signup/${newSessionId}`, {
          state: locationState,
          replace: true
        });
      }
      
    } catch (error) {
      console.error('❌ Error creating plan:', error);
      toast.error('Failed to create booking plan');
      planCreationAttempted.current = false; // Reset on error
    } finally {
      setIsCreatingPlan(false);
    }
  };
  
  const detectProviderType = (url: string): string => {
    if (!url) return 'general';
    const urlLower = url.toLowerCase();
    
    // Jackrabbit providers
    if (urlLower.includes('jackrabbitclass.com') || urlLower.includes('jackrabbit')) return 'jackrabbit_class';
    
    // Restaurant providers - CHECK THESE FIRST
    if (urlLower.includes('resy.com')) return 'restaurant-resy';
    if (urlLower.includes('opentable.com')) return 'restaurant-opentable';
    if (urlLower.includes('tock.com')) return 'restaurant-tock';
    if (urlLower.includes('yelp.com')) return 'restaurant-yelp';
    
    // Fitness providers  
    if (urlLower.includes('peloton')) return 'fitness-peloton';
    if (urlLower.includes('equinox')) return 'fitness-equinox';
    if (urlLower.includes('soulcycle')) return 'fitness-soulcycle';
    
    return 'general';
  };

  // Extract organization ID from JackRabbit URLs
  const extractOrgIdFromUrl = (url: string): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      
      // Check for JackRabbit patterns
      if (urlObj.hostname.includes('jackrabbit') || url.includes('regv2.asp')) {
        // Look for id parameter (JackRabbit org ID)
        const id = urlObj.searchParams.get('id');
        if (id) return id;
        
        // Look for OrgID parameter (alternative format)
        const orgId = urlObj.searchParams.get('OrgID');
        if (orgId) return orgId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract org ID from URL:', error);
      return null;
    }
  };
  
  const renderProviderUI = () => {
    if (!registrationPlan) return null;
    
    // Determine provider type from plan OR URL
    const providerType = registrationPlan.provider_type || 
                        detectProviderType(registrationPlan.provider_url || locationState?.businessUrl || '');
    
    console.log('🎨 Rendering UI:', {
      provider: registrationPlan.provider_name,
      type: providerType,
      url: registrationPlan.provider_url
    });
    
    // ALWAYS show restaurant UI for restaurant types
    if (providerType.startsWith('restaurant-')) {
      return <RestaurantBookingUI plan={registrationPlan} providerType={providerType} />;
    }
    
    if (providerType.startsWith('fitness-')) {
      return <FitnessBookingUI plan={registrationPlan} providerType={providerType} />;
    }
    
    return <GeneralProviderUI plan={registrationPlan} />;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading booking session...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {registrationPlan ? (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">
                {registrationPlan.provider_name || locationState?.businessName || 'Booking Setup'}
              </h1>
              <p className="text-gray-600">
                {registrationPlan.provider_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
            {renderProviderUI()}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No booking information found</p>
            <button
              onClick={() => {
                StateManager.clear();
                navigate('/');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Fitness UI (simplified)
function FitnessBookingUI({ plan, providerType }: { plan: any; providerType: string }) {
  return (
    <div className="bg-green-50 p-6 rounded-lg">
      <h2>Fitness Class Booking</h2>
      <p>{plan.provider_name}</p>
    </div>
  );
}

// General UI (simplified)  
function GeneralProviderUI({ plan }: { plan: any }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h2>General Provider</h2>
      <p>{plan.provider_name}</p>
    </div>
  );
}