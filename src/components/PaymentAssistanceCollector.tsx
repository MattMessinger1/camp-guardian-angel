import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  DollarSign, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Clock,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentAssistanceCollectorProps {
  sessionId: string;
  userId: string;
  providerUrl: string;
  context?: {
    providerName?: string;
    totalAmount?: number;
    currency?: string;
    paymentMethods?: string[];
    requiredFields?: string[];
    dueDate?: string;
  };
  onComplete?: (response: { 
    paymentMethod: string;
    paymentCompleted: boolean;
    transactionId?: string;
    amount: number;
  }) => void;
  onError?: (error: string) => void;
}

interface PaymentForm {
  // Credit Card
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  
  // Billing Address
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  
  // Bank Account (ACH)
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  
  // Other
  paymentMethod: 'credit_card' | 'debit_card' | 'ach' | 'paypal';
}

export function PaymentAssistanceCollector({
  sessionId,
  userId,
  providerUrl,
  context,
  onComplete,
  onError
}: PaymentAssistanceCollectorProps) {
  const [step, setStep] = useState<'method' | 'details' | 'processing' | 'complete'>('method');
  const [form, setForm] = useState<PaymentForm>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking',
    paymentMethod: 'credit_card'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const providerName = context?.providerName || 'the camp provider';
  const totalAmount = context?.totalAmount || 0;
  const currency = context?.currency || 'USD';
  const availablePaymentMethods = context?.paymentMethods || ['credit_card', 'debit_card'];

  useEffect(() => {
    const stepProgress = {
      method: 25,
      details: 50,
      processing: 75,
      complete: 100
    };
    setProgress(stepProgress[step]);
  }, [step]);

  const handleInputChange = (field: keyof PaymentForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const validatePaymentForm = (): boolean => {
    if (form.paymentMethod === 'credit_card' || form.paymentMethod === 'debit_card') {
      if (!form.cardNumber || form.cardNumber.replace(/\s/g, '').length < 13) {
        setError('Please enter a valid card number');
        return false;
      }
      if (!form.expiryMonth || !form.expiryYear) {
        setError('Please enter card expiry date');
        return false;
      }
      if (!form.cvv || form.cvv.length < 3) {
        setError('Please enter a valid CVV');
        return false;
      }
      if (!form.cardholderName) {
        setError('Please enter cardholder name');
        return false;
      }
    }

    if (form.paymentMethod === 'ach') {
      if (!form.routingNumber || form.routingNumber.length !== 9) {
        setError('Please enter a valid 9-digit routing number');
        return false;
      }
      if (!form.accountNumber) {
        setError('Please enter account number');
        return false;
      }
    }

    return true;
  };

  const proceedToPayment = () => {
    if (!validatePaymentForm()) return;
    setStep('processing');
    processPayment();
  };

  const processPayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Processing payment for provider:', providerName);

      // Simulate payment processing with browser automation
      const { data, error: automationError } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'process_payment',
          sessionId,
          providerUrl,
          paymentData: {
            method: form.paymentMethod,
            amount: totalAmount,
            currency,
            // Only send necessary payment details (securely)
            last4: form.cardNumber.slice(-4),
            expiryMonth: form.expiryMonth,
            expiryYear: form.expiryYear,
            cardholderName: form.cardholderName
          },
          context: {
            totalAmount,
            currency,
            dueDate: context?.dueDate
          }
        }
      });

      if (automationError) throw automationError;

      // Log payment attempt for audit
      await supabase.from('compliance_audit').insert({
        user_id: userId,
        event_type: 'PAYMENT_ASSISTANCE_COMPLETED',
        event_data: {
          session_id: sessionId,
          provider_url: providerUrl,
          payment_method: form.paymentMethod,
          amount: totalAmount,
          currency,
          transaction_id: data.transactionId,
          timestamp: new Date().toISOString()
        },
        payload_summary: `Payment assistance completed: ${totalAmount} ${currency} via ${form.paymentMethod}`
      });

      setTimeout(() => {
        setStep('complete');
        setIsLoading(false);
        
        onComplete?.({
          paymentMethod: form.paymentMethod,
          paymentCompleted: true,
          transactionId: data.transactionId,
          amount: totalAmount
        });

        toast({
          description: `Payment processed successfully for ${providerName}!`
        });
      }, 3000);

    } catch (error: any) {
      console.error('Payment processing failed:', error);
      setError(error.message || 'Failed to process payment');
      setStep('details');
      setIsLoading(false);
      onError?.(error.message);
    }
  };

  if (step === 'complete') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Payment Completed Successfully!</h3>
            <p className="text-muted-foreground">
              Your payment of {totalAmount} {currency} has been processed for {providerName}.
              Your registration is now complete!
            </p>
            <Badge variant="outline" className="text-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Secure Transaction
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'processing') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Clock className="h-16 w-16 text-blue-500 mx-auto animate-spin" />
            <h3 className="text-xl font-semibold">Processing Payment</h3>
            <p className="text-muted-foreground">
              Securely processing your payment with {providerName}...
            </p>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Please don't close this window. This may take a few moments.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Information Required</span>
        </CardTitle>
        <CardDescription>
          {providerName} requires payment to secure your registration.
          Total amount: <strong>{totalAmount} {currency}</strong>
          {context?.dueDate && (
            <span className="ml-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Due: {new Date(context.dueDate).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'method' && (
          <div className="space-y-4">
            <h4 className="font-medium">Select Payment Method</h4>
            <div className="grid gap-3">
              {availablePaymentMethods.includes('credit_card') && (
                <Button
                  variant={form.paymentMethod === 'credit_card' ? 'default' : 'outline'}
                  className="justify-start h-auto p-4"
                  onClick={() => {
                    handleInputChange('paymentMethod', 'credit_card');
                    setStep('details');
                  }}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Credit Card</div>
                    <div className="text-sm text-muted-foreground">Visa, Mastercard, American Express</div>
                  </div>
                </Button>
              )}
              
              {availablePaymentMethods.includes('debit_card') && (
                <Button
                  variant={form.paymentMethod === 'debit_card' ? 'default' : 'outline'}
                  className="justify-start h-auto p-4"
                  onClick={() => {
                    handleInputChange('paymentMethod', 'debit_card');
                    setStep('details');
                  }}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Debit Card</div>
                    <div className="text-sm text-muted-foreground">Direct from your bank account</div>
                  </div>
                </Button>
              )}

              {availablePaymentMethods.includes('ach') && (
                <Button
                  variant={form.paymentMethod === 'ach' ? 'default' : 'outline'}
                  className="justify-start h-auto p-4"
                  onClick={() => {
                    handleInputChange('paymentMethod', 'ach');
                    setStep('details');
                  }}
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Bank Transfer (ACH)</div>
                    <div className="text-sm text-muted-foreground">Lower fees, takes 2-3 business days</div>
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <Tabs defaultValue={form.paymentMethod === 'ach' ? 'ach' : 'card'}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card">Card Details</TabsTrigger>
              <TabsTrigger value="ach">Bank Account</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={form.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryMonth">Month</Label>
                    <Input
                      id="expiryMonth"
                      value={form.expiryMonth}
                      onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                      placeholder="MM"
                      maxLength={2}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryYear">Year</Label>
                    <Input
                      id="expiryYear"
                      value={form.expiryYear}
                      onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                      placeholder="YY"
                      maxLength={2}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={form.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={form.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    placeholder="John Smith"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ach" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    value={form.routingNumber}
                    onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                    placeholder="123456789"
                    maxLength={9}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={form.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="Your account number"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <Lock className="h-3 w-3 inline mr-1" />
            Your payment information is encrypted and processed securely. We never store your full payment details.
          </AlertDescription>
        </Alert>

        {step === 'details' && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep('method')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={proceedToPayment}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {totalAmount} {currency}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
