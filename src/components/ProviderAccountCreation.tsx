import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface ProviderAccountCreationProps {
  providerUrl: string;
  providerName: string;
  sessionId?: string;
  onAccountCreated?: (accountEmail: string) => void;
}

export function ProviderAccountCreation({ 
  providerUrl, 
  providerName, 
  sessionId,
  onAccountCreated 
}: ProviderAccountCreationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || '');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCreateAccount = async () => {
    if (!email || !user) {
      toast({
        title: "Error",
        description: "Please provide an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      console.log(`🔧 Creating account for ${providerName}...`);

      const { data, error } = await supabase.functions.invoke('create-account', {
        body: {
          provider_url: providerUrl,
          user_email: email,
          session_id: sessionId
        }
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast({
          title: "Account Created!",
          description: `Successfully created account for ${providerName}`,
        });
        
        if (onAccountCreated && data.account_email) {
          onAccountCreated(data.account_email);
        }
      } else {
        toast({
          title: "Account Creation Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Account creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (result?.success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Account Created Successfully!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              <strong>Provider:</strong> {providerName}
            </p>
            <p className="text-sm text-green-700">
              <strong>Email:</strong> {result.account_email}
            </p>
            {result.account_id && (
              <p className="text-sm text-green-700">
                <strong>Account ID:</strong> {result.account_id}
              </p>
            )}
          </div>

          {result.requires_verification && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Verification Required</span>
              </div>
              <p className="text-xs text-yellow-700 mb-2">
                Please check your email and verify your account before proceeding with registration.
              </p>
              {result.verification_url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(result.verification_url, '_blank')}
                  className="text-yellow-800 border-yellow-300"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open Verification
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Create {providerName} Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To register for this session, we'll create an account with {providerName} using your email address.
        </p>

        <div className="space-y-2">
          <Label htmlFor="accountEmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="accountEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email for the account"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            // Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
            // PHI Avoidance: Account creation excludes medical information
          </p>
        </div>

        <Button 
          onClick={handleCreateAccount}
          disabled={!email || isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Account...
            </>
          ) : (
            `Create Account with ${providerName}`
          )}
        </Button>

        {result && !result.success && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Creation Failed</span>
            </div>
            <p className="text-xs text-red-700">{result.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}