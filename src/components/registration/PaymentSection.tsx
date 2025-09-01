import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Lock, DollarSign } from 'lucide-react';

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

      {/* Payment Method */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          <Label className="text-base font-medium">Payment Information</Label>
          <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number *</Label>
          <Input
            id="cardNumber"
            value={data.cardNumber || ''}
            onChange={(e) => updateField('cardNumber', e.target.value)}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expiry Date *
            </Label>
            <Input
              id="expiryDate"
              value={data.expiryDate || ''}
              onChange={(e) => updateField('expiryDate', e.target.value)}
              placeholder="MM/YY"
              maxLength={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              value={data.cvv || ''}
              onChange={(e) => updateField('cvv', e.target.value)}
              placeholder="123"
              maxLength={4}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardholderName">Cardholder Name *</Label>
          <Input
            id="cardholderName"
            value={data.cardholderName || ''}
            onChange={(e) => updateField('cardholderName', e.target.value)}
            placeholder="Name as it appears on card"
            required
          />
        </div>
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