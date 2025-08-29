/**
 * Barrier Analysis Display Component
 * 
 * Shows comprehensive obstacle mapping for camp registration flows
 * with detailed breakdown of expected interruptions and parent preparation.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  User, 
  CreditCard, 
  FileText, 
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BarrierData {
  type: 'account_creation' | 'login' | 'captcha' | 'document_upload' | 'payment' | 'verification';
  stage: string;
  captcha_likelihood: number;
  required_fields: string[];
  estimated_time_minutes: number;
  complexity_level: 'low' | 'medium' | 'high' | 'expert';
  human_intervention_required: boolean;
  description: string;
}

interface FlowStep {
  step_number: number;
  step_name: string;
  barriers_in_step: string[];
  automation_possible: boolean;
  parent_assistance_likely: boolean;
}

interface BarrierAnalysis {
  barriers: BarrierData[];
  estimated_interruptions: number;
  total_estimated_time: number;
  overall_complexity: string;
  registration_flow: FlowStep[];
  parent_preparation_needed?: string[];
  success_probability?: number;
}

interface BarrierAnalysisDisplayProps {
  analysis: BarrierAnalysis;
  providerName?: string;
  onProceed?: () => void;
  onCancel?: () => void;
}

export function BarrierAnalysisDisplay({ 
  analysis, 
  providerName = "Provider", 
  onProceed, 
  onCancel 
}: BarrierAnalysisDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStepExpansion = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  const getBarrierIcon = (type: string) => {
    switch (type) {
      case 'account_creation': return <User className="h-4 w-4" />;
      case 'login': return <Shield className="h-4 w-4" />;
      case 'captcha': return <Eye className="h-4 w-4" />;
      case 'document_upload': return <FileText className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'verification': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCaptchaRiskColor = (likelihood: number) => {
    if (likelihood >= 0.7) return 'bg-red-100 text-red-800';
    if (likelihood >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overview Card */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <span>Registration Barrier Analysis</span>
          </CardTitle>
          <CardDescription>
            Comprehensive obstacle detection for {providerName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analysis.barriers.length}</div>
              <div className="text-sm text-muted-foreground">Total Barriers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analysis.estimated_interruptions}</div>
              <div className="text-sm text-muted-foreground">Parent Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatTime(analysis.total_estimated_time)}</div>
              <div className="text-sm text-muted-foreground">Est. Total Time</div>
            </div>
            <div className="text-center">
              <Badge className={getComplexityColor(analysis.overall_complexity || 'medium')}>
                {analysis.overall_complexity || 'Medium'} Complexity
              </Badge>
            </div>
          </div>
          
          {analysis.success_probability && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Probability</span>
                <span className="font-medium">{Math.round(analysis.success_probability * 100)}%</span>
              </div>
              <Progress value={analysis.success_probability * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parent Preparation */}
      {analysis.parent_preparation_needed && analysis.parent_preparation_needed.length > 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Prepare Before Starting:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {analysis.parent_preparation_needed.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Registration Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Registration Flow</CardTitle>
          <CardDescription>
            Step-by-step breakdown with barrier details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.registration_flow.map((step) => (
            <Collapsible key={step.step_number}>
              <CollapsibleTrigger
                onClick={() => toggleStepExpansion(step.step_number)}
                className="flex items-center justify-between w-full p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {step.step_number}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{step.step_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {step.barriers_in_step.length} barriers • {step.parent_assistance_likely ? 'Parent help needed' : 'Automated'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {step.automation_possible ? (
                    <Badge variant="secondary">Automated</Badge>
                  ) : (
                    <Badge variant="destructive">Manual</Badge>
                  )}
                  {expandedSteps.has(step.step_number) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3 mt-3">
                  {step.barriers_in_step.map((barrier, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{barrier}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Barrier Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Barrier Analysis</CardTitle>
          <CardDescription>
            Individual obstacle assessment with time estimates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.barriers.map((barrier, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getBarrierIcon(barrier.type)}
                  <span className="font-medium capitalize">
                    {barrier.type.replace('_', ' ')} - {barrier.stage}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getComplexityColor(barrier.complexity_level)}>
                    {barrier.complexity_level}
                  </Badge>
                  {barrier.human_intervention_required && (
                    <Badge variant="destructive">Parent Required</Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{barrier.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="font-medium text-muted-foreground">CAPTCHA Risk</div>
                  <Badge className={getCaptchaRiskColor(barrier.captcha_likelihood)}>
                    {Math.round(barrier.captcha_likelihood * 100)}%
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Est. Time</div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {barrier.estimated_time_minutes}m
                  </div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Required Fields</div>
                  <div>{barrier.required_fields.length || 'None'}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Human Help</div>
                  <div>{barrier.human_intervention_required ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {barrier.required_fields.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-xs text-muted-foreground mb-1">Required Fields:</div>
                  <div className="flex flex-wrap gap-1">
                    {barrier.required_fields.map((field, fieldIndex) => (
                      <Badge key={fieldIndex} variant="outline" className="text-xs">
                        {field.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(onProceed || onCancel) && (
        <div className="flex space-x-3">
          {onProceed && (
            <button
              onClick={onProceed}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Proceed with Registration
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Choose Different Provider
            </button>
          )}
        </div>
      )}
    </div>
  );
}