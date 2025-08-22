import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, X } from "lucide-react";

interface UserProfile {
  phone_e164?: string;
  phone_verified?: boolean;
}

export default function PhoneVerificationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('phone_e164, phone_verified')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Check if banner should be shown
  const shouldShowBanner = user && !loading && (!profile?.phone_verified) && !dismissed;

  const handleAddPhone = () => {
    navigate('/settings#phone');
  };

  const handleEmailFallback = () => {
    // TODO: Set preference for email-only notifications
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Add a phone to receive instant SMS links when a site needs a quick human check.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Get notified immediately instead of waiting for email
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-3 ml-8">
          <Button
            onClick={handleAddPhone}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            Add Phone
          </Button>
          <Button
            onClick={handleEmailFallback}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send by Email Instead
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}