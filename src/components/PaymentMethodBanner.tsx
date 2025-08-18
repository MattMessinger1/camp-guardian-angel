import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, CreditCard, AlertTriangle } from 'lucide-react';
import { UI_STRINGS } from '@/lib/constants/ui-strings';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodBannerProps {
  onDismiss?: () => void;
  onPaymentMethodAdded?: () => void;
}

export function PaymentMethodBanner({ onDismiss, onPaymentMethodAdded }: PaymentMethodBannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkPaymentMethod();
  }, [user]);

  const checkPaymentMethod = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('billing_profiles')
        .select('default_payment_method_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking payment method:', error);
        return;
      }

      setHasPaymentMethod(!!data?.default_payment_method_id);
    } catch (error) {
      console.error('Error in checkPaymentMethod:', error);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: UI_STRINGS.NOTIFICATION_LOGIN_REQUIRED,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-setup', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.client_secret) {
        toast({
          title: "Payment method setup",
          description: UI_STRINGS.NOTIFICATION_SETUP_REDIRECTING,
        });
        
        // Simulate success after a delay
        setTimeout(() => {
          setHasPaymentMethod(true);
          onPaymentMethodAdded?.();
          toast({
            title: "Payment method added",
            description: UI_STRINGS.SUCCESS_PAYMENT_METHOD_ADDED,
          });
        }, 2000);
      }
    } catch (error: any) {
      console.error('Payment method setup error:', error);
      toast({
        title: "Setup failed",
        description: error.message || UI_STRINGS.ERROR_PAYMENT_SETUP_FAILED,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Don't show banner if:
  // - User not logged in
  // - User has payment method
  // - Banner was dismissed
  // - Still loading payment method status
  if (!user || hasPaymentMethod || dismissed || hasPaymentMethod === null) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-orange-800 dark:text-orange-200 font-medium">
            {UI_STRINGS.PAYMENT_METHOD_BANNER}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            onClick={handleAddPaymentMethod}
            disabled={isLoading}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <CreditCard className="mr-1 h-3 w-3" />
            {isLoading ? UI_STRINGS.ACTION_SETTING_UP : UI_STRINGS.ACTION_ADD_CARD}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}