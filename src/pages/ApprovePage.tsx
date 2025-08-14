import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ApprovePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    if (token) {
      // Decode token to show user context (without verifying)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo(payload);
      } catch (e) {
        setError('Invalid token format');
      }
    }
  }, [token]);

  const handleAction = async (selectedAction: 'approve' | 'decline') => {
    if (!token) return;

    setLoading(true);
    setError('');
    setAction(selectedAction);

    try {
      const { data, error } = await supabase.functions.invoke('approval-submit', {
        body: { token, action: selectedAction }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(true);
        toast({
          title: selectedAction === 'approve' ? "Registration Approved" : "Registration Declined",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (error: any) {
      console.error('Approval action error:', error);
      setError(error.message || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  if (error && !tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {action === 'approve' ? (
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            )}
            <CardTitle className={action === 'approve' ? "text-green-600" : "text-gray-600"}>
              {action === 'approve' ? "Registration Approved" : "Registration Declined"}
            </CardTitle>
            <CardDescription>
              {action === 'approve' 
                ? "The registration process will continue automatically."
                : "The registration has been cancelled as requested."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You can safely close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = tokenInfo && new Date(tokenInfo.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <DollarSign className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle>Approval Required</CardTitle>
          <CardDescription>
            The registration requires your approval due to policy violations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isExpired && (
            <Alert variant="destructive" className="mb-4">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This approval link has expired. Please contact support if you still need to take action.
              </AlertDescription>
            </Alert>
          )}

          {tokenInfo && !isExpired && (
            <>
              <div className="mb-6 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-900">Registration Details:</p>
                <p className="text-sm text-yellow-700 mb-2">
                  {tokenInfo.session_title || 'Camp Session'}
                </p>
                
                {tokenInfo.violations && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-800">Policy Violations:</p>
                    <ul className="text-sm text-red-700 mt-1 space-y-1">
                      {tokenInfo.violations.map((violation: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-500 mr-1">•</span>
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tokenInfo.price && tokenInfo.cap && (
                  <div className="mt-3 p-2 bg-white rounded border border-yellow-200">
                    <div className="flex justify-between text-sm">
                      <span>Session Price:</span>
                      <span className="font-medium">${tokenInfo.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Your Price Cap:</span>
                      <span className="font-medium">${tokenInfo.cap}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600 font-medium border-t pt-1 mt-1">
                      <span>Over Budget:</span>
                      <span>+${(tokenInfo.price - tokenInfo.cap).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={() => handleAction('approve')}
                  className="w-full bg-green-600 hover:bg-green-700" 
                  disabled={loading || isExpired}
                >
                  {loading && action === 'approve' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Registration
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => handleAction('decline')}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50" 
                  disabled={loading || isExpired}
                >
                  {loading && action === 'decline' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline Registration
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  This approval link expires in 10 minutes for security.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}