import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Lock, DollarSign, CheckCircle } from 'lucide-react';

interface PaymentSectionProps {
  sessionData: any;
  data: any;
  onChange: (data: any) => void;
}

export function PaymentSection({ sessionData, data, onChange }: PaymentSectionProps) {
  const updateField = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </div>
            <Badge variant="secondary">Total Due</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {sessionData.businessName} - {sessionData.selectedTime}
              </span>
              <span className="font-semibold">${sessionData.signupCost}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold text-primary">${sessionData.signupCost}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Payment Method */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          <Label className="text-base font-medium">Secure Payment Method</Label>
          <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
        </div>

        {!data.paymentMethodId ? (
          <Button 
            onClick={() => onChange({ ...data, showStripeForm: true })} 
            className="w-full"
            variant="outline"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Payment method saved</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onChange({ ...data, paymentMethodId: null, showStripeForm: true })}
              >
                Change
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              •••• {data.last4 || '****'} expires {data.expMonth || 'XX'}/{data.expYear || 'XX'}
            </p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Your payment information is secured with 256-bit SSL encryption
          </span>
        </div>
      </div>
    </div>
  );
}