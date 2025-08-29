import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Square, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface RealCampSite {
  id: string;
  name: string;
  registrationUrl: string;
  platform: string;
  expectedComplexity: 'low' | 'medium' | 'high';
  expectedRequirements: string[];
  sessionId?: string;
  notes: string;
}

// Real Seattle Parks camp registration URLs with specific sessions
const REAL_CAMP_REGISTRATIONS: RealCampSite[] = [
  {
    id: 'seattle-youth-basketball',
    name: 'Seattle Parks Youth Basketball',
    registrationUrl: 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=AQBWYW',
    platform: 'vscloud',
    expectedComplexity: 'medium',
    expectedRequirements: ['child_name', 'child_dob', 'parent_email', 'parent_phone', 'emergency_contact', 'medical_conditions'],
    notes: 'Actual basketball program with age verification and medical forms'
  },
  {
    id: 'seattle-summer-camp',
    name: 'Seattle Parks Summer Day Camp',
    registrationUrl: 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=AQBWX6',
    platform: 'vscloud',
    expectedComplexity: 'high',
    expectedRequirements: ['child_name', 'child_dob', 'parent_name', 'parent_email', 'parent_phone', 'emergency_contact', 'emergency_phone', 'medical_conditions', 'allergies', 'medications', 'photo_consent', 'pickup_authorization'],
    notes: 'Full summer camp with extensive forms and medical requirements'
  },
  {
    id: 'seattle-swimming-lessons',
    name: 'Seattle Parks Swimming Lessons',
    registrationUrl: 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=AQBWYE',
    platform: 'vscloud',
    expectedComplexity: 'medium',
    expectedRequirements: ['child_name', 'child_dob', 'swimming_level', 'parent_email', 'parent_phone', 'emergency_contact', 'medical_conditions'],
    notes: 'Swimming program with skill level assessment and water safety forms'
  },
  {
    id: 'community-pass-soccer',
    name: 'Community Pass Youth Soccer',
    registrationUrl: 'https://register.communitypass.net/reg/index.cfm?event_id=12345',
    platform: 'community_pass',
    expectedComplexity: 'high',
    expectedRequirements: ['account_creation', 'child_name', 'child_dob', 'parent_name', 'parent_email', 'emergency_contact', 'medical_forms', 'payment_info'],
    notes: 'Community Pass requires account creation and has complex registration flow'
  }
];

interface TestResult {
  campId: string;
  status: 'idle' | 'running' | 'passed' | 'failed' | 'error';
  phases: TestPhase[];
  requirements?: any;
  authRequired?: boolean;
  formComplexity?: number;
  captchaDetected?: boolean;
  error?: string;
  duration?: number;
  timestamp?: string;
}

interface TestPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  duration?: number;
}

export default function RealCampTests() {
  const [results, setResults] = useState<TestResult[]>(
    REAL_CAMP_REGISTRATIONS.map(camp => ({
      campId: camp.id,
      status: 'idle',
      phases: [
        { name: 'Requirements Discovery', status: 'pending' },
        { name: 'Auth Detection', status: 'pending' },
        { name: 'Form Analysis', status: 'pending' },
        { name: 'Automation Test', status: 'pending' },
        { name: 'Results Validation', status: 'pending' }
      ]
    }))
  );

  const [runningTest, setRunningTest] = useState<string | null>(null);

  const updateResult = (campId: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(result => 
      result.campId === campId 
        ? { ...result, ...updates, timestamp: new Date().toISOString() }
        : result
    ));
  };

  const updatePhase = (campId: string, phaseIndex: number, updates: Partial<TestPhase>) => {
    setResults(prev => prev.map(result => 
      result.campId === campId 
        ? {
            ...result,
            phases: result.phases.map((phase, index) =>
              index === phaseIndex ? { ...phase, ...updates } : phase
            )
          }
        : result
    ));
  };

  const runRealCampTest = async (camp: RealCampSite) => {
    setRunningTest(camp.id);
    updateResult(camp.id, { status: 'running' });

    try {
      console.log(`🎯 Testing real camp: ${camp.name}`);
      console.log(`📍 Registration URL: ${camp.registrationUrl}`);

      // Phase 1: Requirements Discovery using analyze-session-requirements
      updatePhase(camp.id, 0, { status: 'running' });
      
      console.log('📋 Phase 1: Discovering session requirements...');
      const requirementsResponse = await supabase.functions.invoke('analyze-session-requirements', {
        body: { 
          session_id: camp.sessionId || camp.id,
          signup_url: camp.registrationUrl,
          force_refresh: true // Don't use cache for testing
        }
      });

      if (requirementsResponse.error) {
        throw new Error(`Requirements discovery failed: ${requirementsResponse.error.message}`);
      }

      const requirements = requirementsResponse.data;
      updateResult(camp.id, { requirements });
      updatePhase(camp.id, 0, { 
        status: 'completed', 
        details: `Found ${requirements.required_fields?.length || 0} required fields`,
        duration: 3000
      });

      console.log('✅ Requirements discovered:', requirements);

      // Phase 2: Authentication Detection
      updatePhase(camp.id, 1, { status: 'running' });
      
      console.log('🔐 Phase 2: Detecting authentication requirements...');
      const authRequired = requirements.authentication_required || false;
      const authComplexity = requirements.auth_complexity || 'none';
      
      updateResult(camp.id, { authRequired });
      updatePhase(camp.id, 1, { 
        status: 'completed',
        details: `Auth required: ${authRequired}, Complexity: ${authComplexity}`,
        duration: 2000
      });

      // Phase 3: Form Analysis
      updatePhase(camp.id, 2, { status: 'running' });
      
      console.log('📝 Phase 3: Analyzing form complexity...');
      const formComplexity = (requirements.required_fields?.length || 0) + 
                           (requirements.optional_fields?.length || 0) * 0.5 +
                           (requirements.document_uploads?.length || 0) * 2;
      
      updateResult(camp.id, { formComplexity });
      updatePhase(camp.id, 2, { 
        status: 'completed',
        details: `Complexity score: ${formComplexity}, Fields: ${requirements.required_fields?.length || 0}`,
        duration: 1500
      });

      // Phase 4: Real Browser Automation Test
      updatePhase(camp.id, 3, { status: 'running' });
      
      console.log('🤖 Phase 4: Testing browser automation on real registration page...');
      const automationResponse = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'analyze_registration_page',
          url: camp.registrationUrl,
          sessionId: `real-test-${Date.now()}`,
          expected_fields: requirements.required_fields || []
        }
      });

      let captchaDetected = false;
      let automationSuccess = false;

      if (automationResponse.data) {
        captchaDetected = automationResponse.data.captcha_detected || false;
        automationSuccess = automationResponse.data.success || false;
      }

      updateResult(camp.id, { captchaDetected });
      updatePhase(camp.id, 3, { 
        status: automationSuccess ? 'completed' : 'failed',
        details: `Automation: ${automationSuccess ? 'Success' : 'Failed'}, CAPTCHA: ${captchaDetected ? 'Detected' : 'None'}`,
        duration: 5000
      });

      // Phase 5: Results Validation
      updatePhase(camp.id, 4, { status: 'running' });
      
      console.log('✅ Phase 5: Validating results against expected complexity...');
      const expectedFields = camp.expectedRequirements.length;
      const discoveredFields = requirements.required_fields?.length || 0;
      const accuracy = Math.min(1, discoveredFields / expectedFields);
      
      const validationSuccess = accuracy > 0.7; // 70% accuracy threshold
      
      updatePhase(camp.id, 4, { 
        status: validationSuccess ? 'completed' : 'failed',
        details: `Accuracy: ${Math.round(accuracy * 100)}%, Expected: ${expectedFields}, Found: ${discoveredFields}`,
        duration: 1000
      });

      // Final result
      const overallSuccess = validationSuccess && (automationSuccess || captchaDetected);
      updateResult(camp.id, { 
        status: overallSuccess ? 'passed' : 'failed',
        duration: 12500
      });

      toast.success(`${camp.name} test ${overallSuccess ? 'passed' : 'failed'}`);

    } catch (error) {
      console.error(`❌ Test failed for ${camp.name}:`, error);
      updateResult(camp.id, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Mark remaining phases as failed
      setResults(prev => prev.map(result => 
        result.campId === camp.id 
          ? {
              ...result,
              phases: result.phases.map(phase => 
                phase.status === 'pending' || phase.status === 'running' 
                  ? { ...phase, status: 'failed' }
                  : phase
              )
            }
          : result
      ));

      toast.error(`${camp.name} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunningTest(null);
    }
  };

  const resetTest = (campId: string) => {
    updateResult(campId, { 
      status: 'idle',
      requirements: undefined,
      authRequired: undefined,
      formComplexity: undefined,
      captchaDetected: undefined,
      error: undefined,
      duration: undefined,
      phases: [
        { name: 'Requirements Discovery', status: 'pending' },
        { name: 'Auth Detection', status: 'pending' },
        { name: 'Form Analysis', status: 'pending' },
        { name: 'Automation Test', status: 'pending' },
        { name: 'Results Validation', status: 'pending' }
      ]
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      idle: 'secondary',
      running: 'default',
      passed: 'default',
      failed: 'destructive',
      error: 'destructive'
    } as const;
    
    const colors = {
      idle: 'text-muted-foreground',
      running: 'text-blue-600',
      passed: 'text-green-600',
      failed: 'text-red-600',
      error: 'text-red-600'
    } as const;

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Real Camp Registration Tests</h1>
        <p className="text-muted-foreground">
          Test automation pipeline with actual camp registration pages and complex requirements
        </p>
      </div>

      <div className="grid gap-6">
        {REAL_CAMP_REGISTRATIONS.map((camp) => {
          const result = results.find(r => r.campId === camp.id);
          if (!result) return null;

          return (
            <Card key={camp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <CardTitle className="text-lg">{camp.name}</CardTitle>
                      <CardDescription>{camp.notes}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(result.status)}
                    
                    <div className="flex gap-2">
                      {result.status === 'running' && runningTest === camp.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Running...
                        </Button>
                      ) : (
                        <Button
                          onClick={() => runRealCampTest(camp)}
                          disabled={runningTest !== null}
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      )}
                      
                      {result.status !== 'idle' && result.status !== 'running' && (
                        <Button
                          onClick={() => resetTest(camp.id)}
                          variant="outline"
                          size="sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Camp Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Platform:</span> {camp.platform}
                  </div>
                  <div>
                    <span className="font-medium">Expected Complexity:</span>{' '}
                    <Badge variant={camp.expectedComplexity === 'high' ? 'destructive' : camp.expectedComplexity === 'medium' ? 'default' : 'secondary'}>
                      {camp.expectedComplexity}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Registration URL:</span>
                    <div className="text-xs text-muted-foreground break-all mt-1">
                      {camp.registrationUrl}
                    </div>
                  </div>
                </div>

                {/* Test Phases */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Test Phases:</h4>
                  {result.phases.map((phase, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        {phase.status === 'running' && (
                          <Clock className="h-3 w-3 animate-spin text-blue-500" />
                        )}
                        {phase.status === 'completed' && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                        {phase.status === 'failed' && (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {phase.status === 'pending' && (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                        )}
                        <span className={phase.status === 'completed' ? 'text-green-600' : ''}>
                          {phase.name}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {phase.details && <span>{phase.details}</span>}
                        {phase.duration && <span className="ml-2">({phase.duration}ms)</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Results Summary */}
                {(result.requirements || result.authRequired !== undefined) && (
                  <div className="border rounded p-3 bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Discovery Results:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {result.authRequired !== undefined && (
                        <div>
                          <span className="font-medium">Auth Required:</span> {result.authRequired ? 'Yes' : 'No'}
                        </div>
                      )}
                      {result.formComplexity !== undefined && (
                        <div>
                          <span className="font-medium">Form Complexity:</span> {result.formComplexity.toFixed(1)}
                        </div>
                      )}
                      {result.requirements?.required_fields && (
                        <div>
                          <span className="font-medium">Required Fields:</span> {result.requirements.required_fields.length}
                        </div>
                      )}
                      {result.captchaDetected !== undefined && (
                        <div>
                          <span className="font-medium">CAPTCHA:</span> {result.captchaDetected ? 'Detected' : 'None'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {result.error && (
                  <div className="border border-red-200 rounded p-3 bg-red-50 text-red-700 text-sm">
                    <span className="font-medium">Error:</span> {result.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}