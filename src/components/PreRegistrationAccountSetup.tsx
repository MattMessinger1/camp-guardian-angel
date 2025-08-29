import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Clock, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Brain,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AccountRequirement {
  provider_name: string;
  provider_url: string;
  requires_account: boolean;
  account_creation_url?: string;
  login_detection: {
    has_login_form: boolean;
    has_create_account_link: boolean;
    account_required_for_registration: boolean;
    confidence_score: number;
  };
  preparation_steps: string[];
  estimated_setup_time: number; // minutes
  ai_analysis: {
    complexity_score: number;
    recommended_prep_days: number;
    risk_factors: string[];
  };
}

interface PreRegistrationAccountSetupProps {
  sessionId?: string | null;
  onAccountSetupComplete: (accountData: any) => void;
  campUrl?: string;
}

export function PreRegistrationAccountSetup({ 
  sessionId, 
  onAccountSetupComplete,
  campUrl 
}: PreRegistrationAccountSetupProps) {
  const { toast } = useToast();
  
  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [accountRequirement, setAccountRequirement] = useState<AccountRequirement | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Account Setup State
  const [setupStep, setSetupStep] = useState<'analysis' | 'guidance' | 'credentials' | 'verification'>('analysis');
  const [accountUrl, setAccountUrl] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentToStore, setConsentToStore] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);

  // AI-powered analysis of camp registration page
  const analyzeAccountRequirements = async () => {
    if (!campUrl && !sessionId) return;
    
    setAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-account-requirements', {
        body: {
          camp_url: campUrl,
          session_id: sessionId
        }
      });
      
      if (error) throw error;
      
      if (data?.account_requirement) {
        setAccountRequirement(data.account_requirement);
        
        if (data.account_requirement.requires_account) {
          setSetupStep('guidance');
          setAccountUrl(data.account_requirement.account_creation_url || campUrl || '');
        } else {
          // No account needed, skip this step
          onAccountSetupComplete({ account_required: false });
        }
      }
    } catch (error) {
      console.error('Account analysis error:', error);
      setAnalysisError('Failed to analyze account requirements. You can still proceed manually.');
      setSetupStep('guidance');
    } finally {
      setAnalyzing(false);
    }
  };

  // Initialize analysis
  useEffect(() => {
    analyzeAccountRequirements();
  }, [campUrl, sessionId]);

  const handleAccountCreated = () => {
    setAccountCreated(true);
    setSetupStep('credentials');
  };

  const handleCredentialsSubmit = async () => {
    if (!accountEmail || !accountPassword) {
      toast({ title: "Error", description: "Please enter both email and password", variant: "destructive" });
      return;
    }
    
    if (!consentToStore) {
      toast({ title: "Error", description: "Please consent to secure credential storage", variant: "destructive" });
      return;
    }

    try {
      // Store credentials securely (encrypted)
      const { error } = await supabase.functions.invoke('store-camp-credentials', {
        body: {
          session_id: sessionId,
          provider_url: accountRequirement?.provider_url || campUrl,
          email: accountEmail,
          password: accountPassword, // Will be encrypted server-side
          provider_name: accountRequirement?.provider_name
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Account credentials stored securely" });
      setSetupStep('verification');
    } catch (error) {
      console.error('Credential storage error:', error);
      toast({ title: "Error", description: "Failed to store credentials securely", variant: "destructive" });
    }
  };

  const handleVerificationComplete = () => {
    onAccountSetupComplete({
      account_required: true,
      account_email: accountEmail,
      provider_name: accountRequirement?.provider_name,
      provider_url: accountRequirement?.provider_url || campUrl,
      credentials_stored: true,
      setup_completed_at: new Date().toISOString()
    });
  };

  if (analyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Account Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="font-medium">Analyzing camp registration requirements...</div>
              <div className="text-sm text-muted-foreground">
                Our AI is checking if this camp requires pre-registration account setup
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analysisError && !accountRequirement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Manual Account Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
          <div className="mt-4 space-y-3">
            <p className="text-sm">Please manually check if this camp requires account creation:</p>
            <Button 
              onClick={() => window.open(campUrl, '_blank')} 
              variant="outline" 
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Camp Website
            </Button>
            <Button 
              onClick={() => onAccountSetupComplete({ account_required: false, manual_check: true })}
              className="w-full"
            >
              Continue Without Account Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (setupStep === 'guidance' && accountRequirement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pre-Registration Account Setup Required
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={accountRequirement.requires_account ? "destructive" : "secondary"}>
              {accountRequirement.requires_account ? "Account Required" : "No Account Needed"}
            </Badge>
            <Badge variant="outline">
              {accountRequirement.login_detection.confidence_score}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              AI Analysis: {accountRequirement.provider_name} requires account creation before registration opens.
              Recommended setup: {accountRequirement.ai_analysis.recommended_prep_days} days early.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label className="font-semibold">Preparation Steps:</Label>
              <ul className="list-decimal list-inside space-y-1 text-sm mt-2">
                {accountRequirement.preparation_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>

            {accountRequirement.ai_analysis.risk_factors.length > 0 && (
              <div>
                <Label className="font-semibold text-amber-600">Potential Issues:</Label>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2 text-amber-700">
                  {accountRequirement.ai_analysis.risk_factors.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Estimated Setup Time</span>
              </div>
              <p className="text-sm text-blue-700">
                {accountRequirement.estimated_setup_time} minutes to complete account creation
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Button 
              onClick={() => window.open(accountRequirement.account_creation_url || campUrl, '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Create Account at {accountRequirement.provider_name}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAccountCreated}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              I've Created My Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (setupStep === 'credentials') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Secure Credential Storage
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Store your camp account credentials securely for automatic login during registration
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your credentials will be encrypted and only used to auto-fill login forms during registration.
              You can delete them anytime after successful registration.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label htmlFor="account-email">Camp Account Email</Label>
              <Input
                id="account-email"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="Enter the email for your camp account"
              />
            </div>

            <div>
              <Label htmlFor="account-password">Camp Account Password</Label>
              <div className="relative">
                <Input
                  id="account-password"
                  type={showPassword ? "text" : "password"}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Enter your camp account password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-storage"
                checked={consentToStore}
                onCheckedChange={(checked) => setConsentToStore(checked as boolean)}
              />
              <Label htmlFor="consent-storage" className="text-sm">
                I consent to secure storage of these credentials for automated login during registration.
                I understand they will be encrypted and can be deleted after use.
              </Label>
            </div>
          </div>

          <Button 
            onClick={handleCredentialsSubmit}
            disabled={!accountEmail || !accountPassword || !consentToStore}
            className="w-full"
          >
            <Shield className="h-4 w-4 mr-2" />
            Store Credentials Securely
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (setupStep === 'verification') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Account Setup Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your camp account is ready! We'll automatically log you in when registration opens.
            </AlertDescription>
          </Alert>

          <div className="bg-green-50 p-3 rounded-lg space-y-2">
            <div className="font-semibold text-green-900">Setup Summary:</div>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✓ Account created at {accountRequirement?.provider_name}</li>
              <li>✓ Credentials stored securely</li>
              <li>✓ Auto-login configured</li>
              <li>✓ Ready for registration day</li>
            </ul>
          </div>

          <Button onClick={handleVerificationComplete} className="w-full">
            Continue to Next Step
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}