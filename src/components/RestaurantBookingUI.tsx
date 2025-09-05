// src/components/RestaurantBookingUI.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Clock, Calendar, Users, Lock } from 'lucide-react';

interface RestaurantBookingProps {
  plan: any;
  providerType: string;
}

export function RestaurantBookingUI({ plan, providerType }: RestaurantBookingProps) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  
  const [preferences, setPreferences] = useState({
    party_size: 2,
    preferred_date: '',
    preferred_time: '',
    flexible_dates: true
  });
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bookingWindow, setBookingWindow] = useState<any>(null);
  const [nextOpeningTime, setNextOpeningTime] = useState<Date | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [timeUntilOpening, setTimeUntilOpening] = useState<string>('');
  
  const providerName = providerType.split('-')[1];
  
  useEffect(() => {
    // Set default booking window for Carbone
    if (plan.provider_name?.toLowerCase().includes('carbone')) {
      const window = {
        days_in_advance: 30,
        open_time: '10:00 AM',
        timezone: 'America/New_York',
        pattern: 'Opens exactly 30 days in advance at 10:00 AM ET',
        high_demand: true,
        typical_sellout_time: '< 60 seconds'
      };
      setBookingWindow(window);
      calculateNextOpening(window);
    }
    
    // Try to analyze the actual booking window
    analyzeBookingWindow();
  }, []);
  
  useEffect(() => {
    // Update countdown timer every second
    const timer = setInterval(() => {
      updateTimeUntilOpening();
    }, 1000);
    
    return () => clearInterval(timer);
  }, [nextOpeningTime]);
  
  const analyzeBookingWindow = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-session-requirements', {
        body: {
          url: plan.provider_url,
          provider_type: plan.provider_type,
          plan_id: plan.id,
          analyze_booking_window: true
        }
      });
      
      if (!error && data?.analysis?.booking_window) {
        setBookingWindow(data.analysis.booking_window);
        calculateNextOpening(data.analysis.booking_window);
      }
    } catch (error) {
      console.error('Error analyzing booking window:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const calculateNextOpening = (window: any) => {
    if (!window) return;
    
    const now = new Date();
    const { open_time } = window;
    
    // Parse time (e.g., "10:00 AM")
    const [time, period] = open_time.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    // Get next opening (tomorrow at 10 AM ET)
    const nextOpening = new Date();
    nextOpening.setDate(nextOpening.getDate() + 1);
    nextOpening.setHours(hour24, minutes, 0, 0);
    
    // Adjust for timezone if needed (this is simplified)
    setNextOpeningTime(nextOpening);
    updateTimeUntilOpening();
  };
  
  const updateTimeUntilOpening = () => {
    if (!nextOpeningTime) return;
    
    const now = new Date();
    const diff = nextOpeningTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeUntilOpening('Opening now!');
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeUntilOpening(`${hours}h ${minutes}m ${seconds}s`);
  };
  
  const verifyCredentials = async () => {
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-provider-credentials', {
        body: {
          provider: providerType,
          email: credentials.email,
          password: btoa(credentials.password),
          provider_url: plan.provider_url
        }
      });
      
      if (error) {
        toast.error('Failed to verify credentials');
        return;
      }
      
      if (data?.verified) {
        setCredentialsVerified(true);
        toast.success('Credentials verified successfully!');
        
        // Save encrypted credentials to reservation hold
        await supabase
          .from('reservation_holds')
          .update({
            credentials_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', plan.id);
      } else {
        toast.error('Invalid credentials. Please check and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Unable to verify credentials at this time');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const calculateBookingOpenDate = (targetDate: string): Date => {
    const target = new Date(targetDate);
    const daysInAdvance = bookingWindow?.days_in_advance || 30;
    const bookingOpen = new Date(target);
    bookingOpen.setDate(bookingOpen.getDate() - daysInAdvance);
    
    // Set to 10 AM
    bookingOpen.setHours(10, 0, 0, 0);
    
    return bookingOpen;
  };
  
  const handleStartBooking = async () => {
    if (!credentialsVerified) {
      toast.error('Please verify your credentials first');
      return;
    }
    
    if (!preferences.preferred_date) {
      toast.error('Please select a target date for your reservation');
      return;
    }
    
    setIsStarting(true);
    
    try {
      const bookingOpenDate = calculateBookingOpenDate(preferences.preferred_date);
      
      // Save the automation configuration to reservation hold
      const { error: updateError } = await supabase
        .from('reservation_holds')
        .update({
          automation_scheduled: true,
          target_date: preferences.preferred_date,
          party_size: preferences.party_size,
          preferred_time: preferences.preferred_time,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);
      
      if (updateError) throw updateError;
      
      toast.success('Automation scheduled! We\'ll book your table the moment reservations open.');
      
      // Navigate to monitoring dashboard
      setTimeout(() => {
        navigate(`/dashboard`);
      }, 2000);
      
    } catch (error) {
      console.error('Error starting automation:', error);
      toast.error('Failed to schedule automation');
    } finally {
      setIsStarting(false);
    }
  };
  
  // Calculate minimum date (30 days from today for Carbone)
  const getMinDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + (bookingWindow?.days_in_advance || 30));
    return minDate.toISOString().split('T')[0];
  };
  
  return (
    <div className="space-y-6">
      {/* Remove the "View on resy" link - we don't want to send users away */}
      
      {/* High-Demand Alert for Carbone */}
      {bookingWindow?.high_demand && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">High-Demand Restaurant</h3>
              <p className="text-red-800 text-sm mt-1">
                {plan.provider_name} reservations typically sell out in {bookingWindow.typical_sellout_time}.
                We'll attempt to book immediately when reservations open.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Next Booking Window Opens */}
      {bookingWindow && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Next Booking Window</h2>
              <p className="text-blue-100">
                {bookingWindow.pattern}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100 mb-1">Opens in</div>
              <div className="text-3xl font-bold font-mono">
                {timeUntilOpening || <Clock className="w-8 h-8 animate-spin" />}
              </div>
            </div>
          </div>
          {nextOpeningTime && (
            <div className="mt-4 pt-4 border-t border-blue-400">
              <p className="text-sm text-blue-100">
                Tomorrow at 10:00 AM ET - Be ready!
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Account Credentials with Verification */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {providerName.charAt(0).toUpperCase() + providerName.slice(1)} Account
          </h3>
          {credentialsVerified && (
            <span className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-1" />
              Verified
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                credentialsVerified ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
              }`}
              placeholder="Your resy account email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              disabled={credentialsVerified}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                credentialsVerified ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
              }`}
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              disabled={credentialsVerified}
            />
          </div>
          
          {!credentialsVerified && (
            <button
              onClick={verifyCredentials}
              disabled={!credentials.email || !credentials.password || isVerifying}
              className="w-full py-2 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Verify Credentials
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Reservation Details */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Reservation Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Party Size
            </label>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={preferences.party_size}
              onChange={(e) => setPreferences({...preferences, party_size: parseInt(e.target.value)})}
            >
              {[1,2,3,4,5,6,7,8].map(n => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Person' : 'People'}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Target Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={preferences.preferred_date}
              onChange={(e) => setPreferences({...preferences, preferred_date: e.target.value})}
              min={getMinDate()}
            />
            {preferences.preferred_date && bookingWindow && (
              <p className="text-xs text-gray-500 mt-1">
                Books: {calculateBookingOpenDate(preferences.preferred_date).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Preferred Time
            </label>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={preferences.preferred_time}
              onChange={(e) => setPreferences({...preferences, preferred_time: e.target.value})}
            >
              <option value="">Any available time</option>
              <option value="17:00-19:00">5:00 - 7:00 PM (Early)</option>
              <option value="19:00-20:30">7:00 - 8:30 PM (Prime)</option>
              <option value="20:30-22:00">8:30 - 10:00 PM (Late)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Start Automated Booking Button */}
      <button
        onClick={handleStartBooking}
        disabled={!credentialsVerified || !preferences.preferred_date || isStarting}
        className={`w-full py-4 px-6 font-medium rounded-lg transition-all duration-200 flex items-center justify-center text-lg ${
          credentialsVerified 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        } disabled:opacity-50`}
      >
        {isStarting ? (
          <>
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></span>
            Scheduling Automation...
          </>
        ) : (
          credentialsVerified ? 'Start Automated Booking' : 'Verify Credentials First'
        )}
      </button>
      
      {/* How it works */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900 mb-2">How it works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Verify your {providerName} credentials work</li>
          <li>Select your target reservation date (30+ days out)</li>
          <li>We'll execute the booking at exactly 10:00 AM ET on the opening day</li>
          <li>You'll receive instant notification of success</li>
        </ol>
      </div>
    </div>
  );
}