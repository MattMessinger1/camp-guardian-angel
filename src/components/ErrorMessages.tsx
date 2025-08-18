import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle, Users, CreditCard } from 'lucide-react';
import { UI_STRINGS } from '@/lib/constants/ui-strings';

interface ErrorMessageProps {
  type: 'two-child-cap' | 'duplicate-child' | 'no-payment-method' | 'general';
  message?: string;
  className?: string;
}

export function ErrorMessage({ type, message, className = '' }: ErrorMessageProps) {
  const getErrorConfig = () => {
    switch (type) {
      case 'two-child-cap':
        return {
          icon: Users,
          title: 'Registration Limit Reached',
          message: UI_STRINGS.ERROR_TWO_CHILD_CAP,
          variant: 'destructive' as const
        };
      case 'duplicate-child':
        return {
          icon: AlertTriangle,
          title: 'Duplicate Child Detected',
          message: UI_STRINGS.ERROR_DUPLICATE_CHILD,
          variant: 'destructive' as const
        };
      case 'no-payment-method':
        return {
          icon: CreditCard,
          title: 'Payment Method Required',
          message: UI_STRINGS.ERROR_NO_PAYMENT_METHOD,
          variant: 'destructive' as const
        };
      default:
        return {
          icon: XCircle,
          title: 'Error',
          message: message || 'An unexpected error occurred',
          variant: 'destructive' as const
        };
    }
  };

  const { icon: Icon, title, message: errorMessage, variant } = getErrorConfig();

  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm">{errorMessage}</div>
      </AlertDescription>
    </Alert>
  );
}

// Convenience components for specific error types
export const TwoChildCapError = (props: Omit<ErrorMessageProps, 'type'>) => (
  <ErrorMessage type="two-child-cap" {...props} />
);

export const DuplicateChildError = (props: Omit<ErrorMessageProps, 'type'>) => (
  <ErrorMessage type="duplicate-child" {...props} />
);

export const NoPaymentMethodError = (props: Omit<ErrorMessageProps, 'type'>) => (
  <ErrorMessage type="no-payment-method" {...props} />
);