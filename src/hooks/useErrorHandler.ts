import { useToast } from '@/hooks/use-toast';
import { UI_STRINGS } from '@/lib/constants/ui-strings';

export function useErrorHandler() {
  const { toast } = useToast();

  const handleTwoChildCapError = () => {
    toast({
      title: "Registration Limit Reached",
      description: UI_STRINGS.ERROR_TWO_CHILD_CAP,
      variant: "destructive"
    });
  };

  const handleDuplicateChildError = () => {
    toast({
      title: "Duplicate Child Detected", 
      description: UI_STRINGS.ERROR_DUPLICATE_CHILD,
      variant: "destructive"
    });
  };

  const handleNoPaymentMethodError = () => {
    toast({
      title: "Payment Method Required",
      description: UI_STRINGS.ERROR_NO_PAYMENT_METHOD,
      variant: "destructive"
    });
  };

  const handleAuthError = () => {
    toast({
      title: "Authentication Required",
      description: UI_STRINGS.ERROR_AUTHENTICATION_REQUIRED,
      variant: "destructive"
    });
  };

  const handlePaymentSetupError = (message?: string) => {
    toast({
      title: "Setup Failed",
      description: message || UI_STRINGS.ERROR_PAYMENT_SETUP_FAILED,
      variant: "destructive"
    });
  };

  const handleGenericError = (title: string, message: string) => {
    toast({
      title,
      description: message,
      variant: "destructive"
    });
  };

  return {
    handleTwoChildCapError,
    handleDuplicateChildError,
    handleNoPaymentMethodError,
    handleAuthError,
    handlePaymentSetupError,
    handleGenericError
  };
}