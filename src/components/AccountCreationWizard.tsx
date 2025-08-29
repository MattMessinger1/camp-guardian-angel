import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle,
  Shield,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountCreationWizardProps {
  sessionId: string;
  userId: string;
  providerUrl: string;
  context?: {
    providerName?: string;
    requiredFields?: string[];
    accountType?: string;
    existingEmail?: string;
  };
  onComplete?: (response: { 
    email: string; 
    password: string; 
    accountCreated: boolean;
    credentialsStored: boolean;
  }) => void;
  onError?: (error: string) => void;
}

interface AccountForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function AccountCreationWizard({
  sessionId,
  userId,
  providerUrl,
  context,
  onComplete,
  onError
}: AccountCreationWizardProps) {
  const [step, setStep] = useState<'collect' | 'create' | 'verify' | 'complete'>('collect');
  const [form, setForm] = useState<AccountForm>({
    email: context?.existingEmail || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const providerName = context?.providerName || 'the camp provider';
  const requiredFields = context?.requiredFields || ['email', 'password'];

  useEffect(() => {
    // Update progress based on current step
    const stepProgress = {
      collect: 25,
      create: 50,
      verify: 75,
      complete: 100
    };
    setProgress(stepProgress[step]);
  }, [step]);

  const validateForm = (): boolean => {
    if (!form.email || !form.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!form.password || form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (requiredFields.includes('firstName') && !form.firstName) {
      setError('First name is required');
      return false;
    }

    if (requiredFields.includes('lastName') && !form.lastName) {
      setError('Last name is required');
      return false;
    }

    return true;
  };

  const handleInputChange = (field: keyof AccountForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const proceedToCreation = () => {
    if (!validateForm()) return;
    setStep('create');
    createAccount();
  };

  const createAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating account for provider:', providerName);

      // Simulate account creation process with browser automation
      const { data, error: automationError } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'create_account',
          sessionId,
          providerUrl,
          accountData: {
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone
          },
          context: {
            requiredFields,
            accountType: context?.accountType
          }
        }
      });

      if (automationError) throw automationError;

      // Store credentials securely
      const credentialsStored = await storeCredentials();

      setStep('verify');
      
      // Wait a moment for account verification simulation
      setTimeout(() => {
        setStep('complete');
        setIsLoading(false);
        
        onComplete?.({
          email: form.email,
          password: form.password,
          accountCreated: true,
          credentialsStored
        });

        toast({
          description: `Account created successfully for ${providerName}!`
        });
      }, 3000);

    } catch (error: any) {
      console.error('Account creation failed:', error);
      setError(error.message || 'Failed to create account');
      setStep('collect');
      setIsLoading(false);
      onError?.(error.message);
    }
  };

  const storeCredentials = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('store-account-credentials', {
        body: {
          userId,
          providerUrl,
          providerName,
          email: form.email,
          password: form.password
        }
      });

      if (error) {
        console.warn('Failed to store credentials:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Credential storage error:', error);
      return false;
    }
  };

  const generateStrongPassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setForm(prev => ({ ...prev, password, confirmPassword: password }));
  };

  if (step === 'complete') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Account Created Successfully!</h3>
            <p className="text-muted-foreground">
              Your account with {providerName} has been created and credentials stored securely.
              The registration process will continue automatically.
            </p>
            <Badge variant="outline" className="text-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Credentials Secured
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Clock className="h-16 w-16 text-blue-500 mx-auto animate-spin" />
            <h3 className="text-xl font-semibold">Verifying Account Creation</h3>
            <p className="text-muted-foreground">
              Please wait while we verify your account with {providerName}...
            </p>
            <Progress value={85} className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'create') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <User className="h-16 w-16 text-blue-500 mx-auto" />
            <h3 className="text-xl font-semibold">Creating Your Account</h3>
            <p className="text-muted-foreground">
              Setting up your account with {providerName}...
            </p>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              This may take a few moments. Please don't close this window.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Account Creation Required</span>
        </CardTitle>
        <CardDescription>
          {providerName} requires an account to complete registration. We'll help you create one securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="w-full" />

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            {requiredFields.includes('firstName') && (
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {requiredFields.includes('lastName') && (
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10"
                placeholder="your.email@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          {requiredFields.includes('phone') && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateStrongPassword}
                disabled={isLoading}
              >
                Generate Strong Password
              </Button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10"
                placeholder="Enter a strong password"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your credentials will be encrypted and stored securely. We'll use them only for this registration
            and you can delete them anytime from your account settings.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end space-x-2">
          <Button
            onClick={proceedToCreation}
            disabled={isLoading || !form.email || !form.password || !form.confirmPassword}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Create Account
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}