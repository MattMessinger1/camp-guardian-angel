import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UI_STRINGS } from "@/lib/constants/ui-strings";

interface PaymentMethodCardProps {
  hasPaymentMethod?: boolean;
  onPaymentMethodAdded?: () => void;
}

export function PaymentMethodCard({ hasPaymentMethod = false, onPaymentMethodAdded }: PaymentMethodCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
        // In a real implementation, you would redirect to Stripe Elements or use Stripe.js
        // For now, we'll simulate adding a payment method
        toast({
          title: "Payment method setup",
          description: UI_STRINGS.NOTIFICATION_SETUP_REDIRECTING,
        });
        
        // Simulate success after a delay
        setTimeout(() => {
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

  if (hasPaymentMethod) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            {UI_STRINGS.PAYMENT_METHOD_READY_TITLE}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            {UI_STRINGS.PAYMENT_METHOD_READY_DESC}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          {UI_STRINGS.PAYMENT_METHOD_REQUIRED_TITLE}
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {UI_STRINGS.PAYMENT_METHOD_REQUIRED_DESC}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100 dark:border-orange-700 dark:bg-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>{UI_STRINGS.PAYMENT_METHOD_SUCCESS_FEE_NOTE}</strong>
            <br />
            {UI_STRINGS.PAYMENT_METHOD_NO_FAILED_CHARGES}
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={handleAddPaymentMethod}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isLoading ? UI_STRINGS.ACTION_SETTING_UP : UI_STRINGS.ACTION_ADD_CARD}
        </Button>
      </CardContent>
    </Card>
  );
}