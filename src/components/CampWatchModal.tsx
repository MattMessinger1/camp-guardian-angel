import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Bell, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { PREPARATION_GUIDANCE } from '@/lib/constants/camp-status';
import { UI_STRINGS } from '@/lib/constants/ui-strings';

interface CampWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CampWatchModal({ isOpen, onClose }: CampWatchModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'setup' | 'confirmation'>('search');
  
  const [formData, setFormData] = useState({
    camp_name: '',
    camp_website: '',
    expected_timeframe: '',
    user_notes: '',
    notifications: {
      email: true,
      sms: false,
      in_app: true
    }
  });

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: UI_STRINGS.ERROR_AUTHENTICATION_REQUIRED,
        variant: "destructive"
      });
      return;
    }

    if (!formData.camp_name.trim()) {
      toast({
        title: "Camp name required",
        description: "Please enter the name of the camp you want to track",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-camp-watch', {
        body: {
          camp_name: formData.camp_name,
          camp_website: formData.camp_website,
          expected_announcement_timeframe: formData.expected_timeframe,
          user_notes: formData.user_notes,
          notification_preferences: formData.notifications
        }
      });

      if (error) throw error;

      setStep('confirmation');
      toast({
        title: "Camp watch created!",
        description: "We'll notify you when registration information becomes available"
      });

    } catch (error: any) {
      console.error('Camp watch creation error:', error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to create camp watch",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {step === 'search' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Track Camp Information</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Can't find the camp you're looking for? We'll monitor for when registration information becomes available and help you prepare in advance.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="camp-name">Camp Name *</Label>
                <Input
                  id="camp-name"
                  placeholder="e.g., Sunshine Day Camp, YMCA Summer Program"
                  value={formData.camp_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, camp_name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="camp-website">Camp Website (if known)</Label>
                <Input
                  id="camp-website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.camp_website}
                  onChange={(e) => setFormData(prev => ({ ...prev, camp_website: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="expected-timeframe">When do you expect registration to open?</Label>
                <Input
                  id="expected-timeframe"
                  placeholder="e.g., Early March, End of February"
                  value={formData.expected_timeframe}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_timeframe: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about this camp or specific sessions you're interested in"
                  value={formData.user_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('setup')} disabled={!formData.camp_name.trim()}>
                Continue Setup
              </Button>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Notification Preferences</h2>
            </div>

            <p className="text-muted-foreground mb-6">
              Choose how you'd like to be notified when camp information becomes available.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get updates via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={formData.notifications.email}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get urgent updates via text</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={formData.notifications.sms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, sms: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="app-notifications">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">See updates when you visit the app</p>
                </div>
                <Switch
                  id="app-notifications"
                  checked={formData.notifications.in_app}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      notifications: { ...prev.notifications, in_app: checked }
                    }))
                  }
                />
              </div>
            </div>

            <Alert className="mt-6">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                While you wait, we'll provide general preparation guidance to help you get ready for when registration opens.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('search')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Watch Request"}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">All Set!</h2>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{formData.camp_name}</CardTitle>
                  <CardDescription>
                    We're now monitoring for registration information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Waiting for camp announcement
                    </Badge>
                    {formData.camp_website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <a href={formData.camp_website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {formData.camp_website}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertDescription>
                  <strong>What happens next?</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>We'll monitor for camp registration information</li>
                    <li>You'll get preparation guidance while you wait</li>
                    <li>You'll be notified when registration details are available</li>
                    <li>We'll help you research specific requirements when announced</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={onClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}