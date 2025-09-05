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
      
      // Skip test session IDs
      if (sessionId?.includes('test')) {
        console.log('⚠️ Skipping test session ID');
        if (locationState && !planCreationAttempted.current) {
          await createNewPlan();
        }
        return;
      }
      
      // Try to load existing plan from reservation_holds
      if (sessionId) {
        const { data: reservation, error } = await supabase
          .from('reservation_holds')
          .select(`
            *,
            sessions (
              *,
              activities (
                id,
                name,
                canonical_url,
                provider_id
              )
            )
          `)
          .eq('id', sessionId)
          .maybeSingle();
        
        if (!error && reservation) {
          console.log('✅ Found existing reservation:', reservation);
          
          // Transform to expected format
          const existingPlan = {
            id: reservation.id,
            session_id: reservation.id,
            provider_name: reservation.sessions?.activities?.name || locationState?.businessName,
            provider_url: reservation.sessions?.activities?.canonical_url || locationState?.businessUrl,
            provider_type: detectProviderType(reservation.sessions?.activities?.canonical_url || locationState?.businessUrl || ''),
            status: reservation.status,
            preferences: {},
            ...reservation
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
      
      console.log('🚀 Creating plan:', {
        businessName: locationState.businessName,
        url: locationState.businessUrl,
        type: providerType,
        sessionId: newSessionId
      });
      
      // Create activity first
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          name: locationState.businessName,
          canonical_url: locationState.businessUrl,
          provider_id: locationState.provider || 'unknown',
          kind: providerType.split('-')[0] // 'restaurant' or 'fitness'
        })
        .select()
        .single();
      
      if (activityError) {
        console.error('❌ Activity creation error:', activityError);
        throw activityError;
      }
      
      // Create session
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
      
      // Create registration plan for restaurant booking
      const { data: reservation, error: reservationError } = await supabase
        .from('registration_plans')
        .insert({
          id: newSessionId,
          created_from: 'manual_booking',
          name: locationState.businessName,
          url: locationState.businessUrl,
          rules: {
            provider_type: providerType,
            credentials: {},
            preferences: {},
            automation_config: {}
          }
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
        provider_name: locationState.businessName,
        provider_url: locationState.businessUrl,
        provider_type: providerType,
        status: 'active',
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