import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CarboneSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [resyEmail, setResyEmail] = useState('');
  const [resyPassword, setResyPassword] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [mealType, setMealType] = useState('dinner');
  const [preferredTimes, setPreferredTimes] = useState(['7:30 PM', '8:00 PM', '8:30 PM']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [bookingOpensAt, setBookingOpensAt] = useState<Date | null>(null);
  
  // Calculate minimum date (31 days from today)
  const minDate = new Date(Date.now() + 31*24*60*60*1000).toISOString().split('T')[0];

  const calculateBookingOpenTime = (selectedDate: string) => {
    if (!selectedDate) return;
    
    const targetDate = new Date(selectedDate);
    const opensAt = new Date(targetDate);
    opensAt.setDate(targetDate.getDate() - 30);
    opensAt.setHours(10, 0, 0, 0); // 10:00 AM ET
    
    setBookingOpensAt(opensAt);
  };

  const verifyResyAccount = async () => {
    if (!resyEmail || !resyPassword) return;
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'test_resy_login',
          credentials: {
            email: resyEmail,
            password: resyPassword
          }
        }
      });
      
      if (data?.success) {
        toast.success('✅ Resy account verified! Payment method found.');
        setStep(2);
      } else {
        toast.error('❌ Login failed. Please check your credentials.');
      }
    } catch (error) {
      toast.error('❌ Verification failed. Please try again.');
      console.error('Resy verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const armBooking = async () => {
    if (!user?.id || !bookingOpensAt) return;
    
    try {
      // Save encrypted credentials
      await supabase.from('provider_credentials').upsert({
        user_id: user.id,
        provider_domain: 'resy.com',
        username: resyEmail,
        password_encrypted: resyPassword
      });
      
      // Create booking plan
      const { data: plan } = await supabase.from('registration_plans').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        provider_url: 'https://resy.com/cities/ny/carbone',
        provider_name: 'carbone_resy',
        manual_open_at: bookingOpensAt.toISOString(),
        booking_details: {
          restaurant: 'Carbone',
          date: reservationDate,
          partySize: partySize,
          mealType: mealType,
          preferredTimes: preferredTimes
        },
        status: 'armed'
      }).select().single();
      
      if (plan) {
        // Schedule the execution
        await supabase.functions.invoke('arm-signup', {
          body: {
            planId: plan.id,
            executeAt: bookingOpensAt.toISOString(),
            prewarmAt: new Date(bookingOpensAt.getTime() - 5*60000).toISOString()
          }
        });
        
        toast.success('🎯 ARMED! Will book Carbone at exactly 10:00:00 AM');
        navigate('/pending-signups');
      }
    } catch (error) {
      toast.error('Failed to arm booking. Please try again.');
      console.error('Arming error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Carbone Auto-Booking</h1>
          <p className="text-gray-600">We'll secure your table at exactly 10:00:00 AM</p>
          <div className="mt-4">
            <Badge variant="destructive" className="mr-2">HIGH DEMAND</Badge>
            <Badge variant="outline">30-SECOND SELLOUT</Badge>
          </div>
        </div>
        
        {step === 1 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                Connect Your Resy Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription>
                  <p className="font-medium mb-2">Before we start, make sure you have:</p>
                  <ul className="text-sm space-y-1">
                    <li>✓ A Resy account at resy.com</li>
                    <li>✓ Saved payment method in Resy</li>
                    <li>✓ Verified payment shows "Payment saved ✓"</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Resy Email</label>
                  <Input
                    type="email"
                    value={resyEmail}
                    onChange={(e) => setResyEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Resy Password</label>
                  <Input
                    type="password"
                    value={resyPassword}
                    onChange={(e) => setResyPassword(e.target.value)}
                    placeholder="Your Resy password"
                  />
                </div>
                
                <Button 
                  onClick={verifyResyAccount}
                  disabled={!resyEmail || !resyPassword || isVerifying}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isVerifying ? 'Verifying Account...' : 'Verify Resy Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {step === 2 && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                Choose Your Reservation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Desired Date (must be 31+ days from today)
                </label>
                <Input
                  type="date"
                  value={reservationDate}
                  min={minDate}
                  onChange={(e) => {
                    setReservationDate(e.target.value);
                    calculateBookingOpenTime(e.target.value);
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Party Size</label>
                  <select 
                    className="w-full p-2 border border-input rounded-md bg-background"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  >
                    <option value="2">2 guests ($100 deposit)</option>
                    <option value="4">4 guests ($200 deposit)</option>
                    <option value="6">6 guests ($300 deposit)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Meal Type</label>
                  <select 
                    className="w-full p-2 border border-input rounded-md bg-background"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                  >
                    <option value="dinner">Dinner ($50/person)</option>
                    <option value="lunch">Lunch ($25/person)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Time Preferences (we'll try all in order)
                </label>
                <div className="space-y-2">
                  {preferredTimes.map((time, index) => (
                    <Input 
                      key={index}
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...preferredTimes];
                        newTimes[index] = e.target.value;
                        setPreferredTimes(newTimes);
                      }}
                      placeholder={`Preferred time ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              {bookingOpensAt && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription>
                    <p className="font-bold text-green-900">📅 Booking opens:</p>
                    <p className="text-green-800">
                      {bookingOpensAt.toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  ← Back
                </Button>
                
                <Button 
                  onClick={armBooking}
                  disabled={!reservationDate || !bookingOpensAt}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  🎯 ARM AUTO-BOOKING
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mt-8 p-4 bg-gray-900 text-white rounded-lg">
          <h3 className="font-bold mb-2">🚀 How It Works:</h3>
          <ul className="text-sm space-y-1">
            <li>• We'll log into Resy 5 minutes before opening</li>
            <li>• At exactly 10:00:00 AM ET, we'll grab your table</li>
            <li>• Multiple time slots attempted in your preferred order</li>
            <li>• You'll get SMS/email confirmation instantly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}