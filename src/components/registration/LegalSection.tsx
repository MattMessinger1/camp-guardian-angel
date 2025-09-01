import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, ExternalLink } from 'lucide-react';

interface LegalSectionProps {
  sessionData: any;
  data: any;
  onChange: (data: any) => void;
}

export function LegalSection({ sessionData, data, onChange }: LegalSectionProps) {
  const updateField = (field: string, value: boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Main Waiver */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Required Agreements</CardTitle>
          </div>
          <CardDescription>
            Essential legal requirements for camp participation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="waiver"
              checked={data.waiver || false}
              onCheckedChange={(checked) => updateField('waiver', checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="waiver"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Liability Waiver and Medical Authorization *
              </Label>
              <p className="text-xs text-muted-foreground">
                I acknowledge the risks associated with camp activities and authorize emergency medical treatment.
                I release {sessionData.businessName} from liability for accidents or injuries.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="photoConsent"
              checked={data.photoConsent || false}
              onCheckedChange={(checked) => updateField('photoConsent', checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="photoConsent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Photo/Video Consent
              </Label>
              <p className="text-xs text-muted-foreground">
                I consent to my child being photographed or recorded during camp activities for promotional purposes.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={data.terms || false}
              onCheckedChange={(checked) => updateField('terms', checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Terms and Conditions *
              </Label>
              <p className="text-xs text-muted-foreground">
                I accept the camp policies regarding attendance, behavior, and refund policies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-base">Additional Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" className="justify-start">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Full Terms & Conditions
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <ExternalLink className="mr-2 h-4 w-4" />
            Download Liability Waiver PDF
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            By completing this registration, you electronically sign all required documents.
            Physical signatures may be required on the first day of camp.
          </p>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span>Liability Waiver</span>
            <span className={data.waiver ? 'text-primary font-medium' : 'text-muted-foreground'}>
              {data.waiver ? '✓ Signed' : 'Required'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Terms & Conditions</span>
            <span className={data.terms ? 'text-primary font-medium' : 'text-muted-foreground'}>
              {data.terms ? '✓ Accepted' : 'Required'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Photo Consent</span>
            <span className={data.photoConsent ? 'text-primary font-medium' : 'text-muted-foreground'}>
              {data.photoConsent ? '✓ Granted' : 'Optional'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}