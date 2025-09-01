import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Zap } from 'lucide-react';

interface ChildInfoSectionProps {
  sessionData: any;
  data: any;
  onChange: (data: any) => void;
}

export function ChildInfoSection({ sessionData, data, onChange }: ChildInfoSectionProps) {
  const updateField = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Determine camp-specific questions based on business type
  const isCyclingCamp = sessionData.businessName?.toLowerCase().includes('peloton');

  return (
    <div className="space-y-6">
      {/* Basic Child Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="childName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Child's Full Name *
          </Label>
          <Input
            id="childName"
            value={data.childName || ''}
            onChange={(e) => updateField('childName', e.target.value)}
            placeholder="Child's full legal name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="childAge" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Child's Age *
          </Label>
          <Select onValueChange={(value) => updateField('childAge', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select age" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 13 }, (_, i) => i + 5).map((age) => (
                <SelectItem key={age} value={age.toString()}>
                  {age} years old
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Camp-Specific Questions */}
      {isCyclingCamp && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium">Cycling-Specific Information</span>
            <Badge variant="secondary" className="ml-auto">Required for Peloton</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Cycling Experience Level *</Label>
              <Select onValueChange={(value) => updateField('experienceLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (Never used a spin bike)</SelectItem>
                  <SelectItem value="some">Some Experience (Occasional cycling)</SelectItem>
                  <SelectItem value="regular">Regular Cyclist (Weekly rides)</SelectItem>
                  <SelectItem value="advanced">Advanced (Daily cyclist)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shoeSize">Cycling Shoe Size *</Label>
              <Select onValueChange={(value) => updateField('shoeSize', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shoe size" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      Size {size}
                    </SelectItem>
                  ))}
                  {Array.from({ length: 7 }, (_, i) => i + 11).map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      Size {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cycling shoes provided by Peloton
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Medical/Safety Info */}
      <div className="space-y-2">
        <Label htmlFor="medicalInfo">
          Medical Information or Allergies
        </Label>
        <Input
          id="medicalInfo"
          value={data.medicalInfo || ''}
          onChange={(e) => updateField('medicalInfo', e.target.value)}
          placeholder="Any allergies, medications, or conditions we should know about (optional)"
        />
        <p className="text-xs text-muted-foreground">
          Only include information relevant to camp activities and safety
        </p>
      </div>
    </div>
  );
}