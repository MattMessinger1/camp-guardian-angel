import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Shield, 
  Smartphone, 
  User, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface SignupPreparationGuideProps {
  sessionData: any;
  assessment: any;
  providerRequirements?: {
    captcha_expected: boolean;
    login_type: string;
    name: string;
  } | null;
}

export function SignupPreparationGuide({ sessionData, assessment, providerRequirements }: SignupPreparationGuideProps) {
  const signupTime = sessionData?.registration_open_at ? new Date(sessionData.registration_open_at) : null;
  const needsCaptcha = providerRequirements?.captcha_expected || false;
  const needsAccount = providerRequirements?.login_type !== 'none';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Signup Preparation Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Signup Time Alert */}
        <Alert className={signupTime ? "border-green-500" : "border-red-500"}>
          <AlertTriangle className={`w-4 h-4 ${signupTime ? "text-green-500" : "text-red-500"}`} />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">
                {signupTime ? "✅ Signup Time Confirmed" : "⚠️ CRITICAL: Signup Time Missing"}
              </div>
              {signupTime ? (
                <div>
                  <div className="text-lg font-bold">
                    {signupTime.toLocaleDateString()} at {signupTime.toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sessionData.open_time_exact ? '✅ Exact time confirmed' : '⏱️ Estimated time (may change)'}
                  </div>
                </div>
              ) : (
                <div className="text-destructive">
                  Signup time MUST be confirmed before proceeding. Contact provider immediately!
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Preparation Scenarios */}
        <div className="space-y-3">
          <h3 className="font-semibold">Your Signup Scenario:</h3>
          
          {/* Scenario 1: No special requirements */}
          {!needsCaptcha && !needsAccount && (
            <Alert className="border-green-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription>
                <div className="font-semibold text-green-700">Standard Signup Process</div>
                <div className="text-sm">No special preparation needed. You can signup normally when registration opens.</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Scenario 2: CAPTCHA Required */}
          {needsCaptcha && (
            <Alert className="border-orange-500">
              <Smartphone className="w-4 h-4 text-orange-500" />
              <AlertDescription>
                <div className="font-semibold text-orange-700">CAPTCHA Assistance Required</div>
                <div className="space-y-2 text-sm">
                  <div>This provider uses CAPTCHAs that may be challenging to solve quickly.</div>
                  <div className="font-semibold">🚨 CRITICAL: You MUST be ready to receive text messages during signup!</div>
                  <div>We will send you SMS instructions if CAPTCHA assistance is needed.</div>
                  <div className="bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                    <div className="font-semibold">Preparation Checklist:</div>
                    <ul className="list-disc list-inside mt-1">
                      <li>Keep your phone with you during signup</li>
                      <li>Ensure SMS reception is working</li>
                      <li>Be ready to respond to texts immediately</li>
                      <li>Do NOT start signup unless you can receive texts</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Scenario 3: Account Required */}
          {needsAccount && (
            <Alert className="border-blue-500">
              <User className="w-4 h-4 text-blue-500" />
              <AlertDescription>
                <div className="font-semibold text-blue-700">Provider Account Required</div>
                <div className="space-y-2 text-sm">
                  <div>This provider requires an account on their platform.</div>
                  <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                    <div className="font-semibold">Account Preparation:</div>
                    <ul className="list-disc list-inside mt-1">
                      {providerRequirements?.login_type === 'account_required' ? (
                        <>
                          <li>Create account on {providerRequirements.name} before signup opens</li>
                          <li>Verify your email and complete account setup</li>
                          <li>Have login credentials readily available</li>
                        </>
                      ) : (
                        <>
                          <li>Have your {providerRequirements?.name} login credentials ready</li>
                          <li>Ensure you remember your password</li>
                          <li>Consider logging in beforehand to verify access</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Combined Scenario: Both CAPTCHA and Account */}
          {needsCaptcha && needsAccount && (
            <Alert className="border-red-500">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <AlertDescription>
                <div className="font-semibold text-red-700">High Complexity Signup</div>
                <div className="text-sm">
                  This signup requires BOTH account management AND CAPTCHA assistance. 
                  Follow ALL preparation steps above and be extra prepared at signup time.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Time Until Signup */}
        {signupTime && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4" />
              <span>
                {signupTime > new Date() ? (
                  <>Time until signup: {Math.ceil((signupTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</>
                ) : (
                  <>Registration is now open!</>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}