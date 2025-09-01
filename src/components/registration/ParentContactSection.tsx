import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, User } from 'lucide-react';

interface ParentContactSectionProps {
  sessionData: any;
  data: any;
  onChange: (data: any) => void;
}

export function ParentContactSection({ data, onChange }: ParentContactSectionProps) {
  const updateField = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parentName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Parent/Guardian Name *
          </Label>
          <Input
            id="parentName"
            value={data.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Emergency Contact Phone *
        </Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="(555) 123-4567"
          required
        />
        <p className="text-xs text-muted-foreground">
          Required for emergency contact during camp activities
        </p>
      </div>
    </div>
  );
}