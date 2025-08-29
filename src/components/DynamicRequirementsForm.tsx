import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Shield, 
  CreditCard, 
  FileText, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  Loader2
} from "lucide-react";

interface DynamicRequirement {
  field_name: string;
  field_type: string;
  required: boolean;
  label: string;
  help_text?: string;
  options?: string[];
}

interface DynamicRequirementsFormProps {
  requirements: {
    required_fields: DynamicRequirement[];
    authentication_required: boolean;
    payment_required: boolean;
    payment_amount_cents?: number;
    required_documents: string[];
    captcha_risk_level: 'low' | 'medium' | 'high';
    analysis_confidence: number;
  } | null;
  sessionInfo?: {
    title?: string;
    platform?: string;
    signup_url?: string;
  } | null;
  automationAvailable: boolean;
  cached: boolean;
  loading: boolean;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function DynamicRequirementsForm({
  requirements,
  sessionInfo,
  automationAvailable,
  cached,
  loading,
  values,
  onChange
}: DynamicRequirementsFormProps) {
  
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing session requirements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requirements) {
    return (
      <Alert data-testid="fallback-requirements-form">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription data-testid="requirements-error-notice">
          Unable to load session requirements. Using default form.
        </AlertDescription>
      </Alert>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'tel': return <Phone className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="dynamic-requirements-form">
      {/* Session Analysis Summary */}
      <Card data-testid="session-analysis-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Registration Analysis</span>
            {cached && <Badge variant="secondary">Cached</Badge>}
            {requirements.authentication_required && (
              <Badge variant="secondary" data-testid="auth-required-indicator">Auth Required</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionInfo && (
            <div>
              <h4 className="font-medium">{sessionInfo.title}</h4>
              <p className="text-sm text-muted-foreground">
                Platform: {sessionInfo.platform || 'Unknown'}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Auth Required: {requirements.authentication_required ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-green-500" />
              <span>
                Payment: {requirements.payment_required 
                  ? requirements.payment_amount_cents 
                    ? `$${(requirements.payment_amount_cents / 100).toFixed(2)}`
                    : 'Required'
                  : 'Not Required'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span>Documents: {requirements.required_documents.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <Badge className={getRiskColor(requirements.captcha_risk_level)}>
                CAPTCHA Risk: {requirements.captcha_risk_level.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Confidence: {Math.round(requirements.analysis_confidence * 100)}% 
            {automationAvailable && " • Automation Available"}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Required Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="required-fields-container">
          {requirements.required_fields.map((field, index) => (
            <div key={`${field.field_name}-${index}`} className="space-y-2">
              <Label 
                htmlFor={field.field_name}
                className="flex items-center space-x-2"
              >
                {getFieldIcon(field.field_type)}
                <span>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </span>
              </Label>
              
              <Input
                id={field.field_name}
                type={field.field_type === 'tel' ? 'tel' : field.field_type}
                placeholder={field.help_text || `Enter ${field.label.toLowerCase()}`}
                value={values[field.field_name] || ''}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.required}
              />
              
              {field.help_text && (
                <p className="text-xs text-muted-foreground">
                  {field.help_text}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Required Documents */}
      {requirements.required_documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Required Documents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The following documents will be required during registration:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {requirements.required_documents.map((doc) => (
                    <li key={doc} className="text-sm">
                      {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}