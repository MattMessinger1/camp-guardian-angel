import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function ConfirmSignup() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const { user } = useAuth();
  
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [amountCents, setAmountCents] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Fetch session details
  const { data: session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, name, price_min, price_max")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(sessionId)
  });

  // Check if already confirmed
  const { data: existingConfirmation } = useQuery({
    queryKey: ["signup-confirmation", sessionId, user?.id],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from("successful_signups")
        .select("id, confirmed_at, amount_cents")
        .eq("session_id", sessionId)
        .eq("user_id", user?.id || null)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    },
    enabled: Boolean(sessionId && user)
  });

  useEffect(() => {
    if (existingConfirmation) {
      setConfirmed(true);
    }
  }, [existingConfirmation]);

  const handleConfirmSuccess = async () => {
    if (!sessionId) return;

    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-signup-success', {
        body: {
          sessionId,
          userId: user?.id || null,
          amountCents: amountCents ? parseInt(amountCents) * 100 : null, // Convert dollars to cents
          notes: notes.trim() || null
        }
      });

      if (error) {
        console.error('Error confirming signup:', error);
        toast({
          title: "Error",
          description: "Failed to confirm signup. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setConfirmed(true);
      toast({
        title: "Success!",
        description: "Thank you for confirming your successful signup!"
      });

    } catch (err) {
      console.error('Error in confirmation:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirming(false);
    }
  };

  if (!sessionId) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div className="text-center">
                <div className="font-medium text-destructive">Invalid Link</div>
                <div className="text-sm text-muted-foreground mt-2">
                  This confirmation link is missing required information.
                </div>
              </div>
              <Link to="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (confirmed) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div className="text-center space-y-2">
                <div className="text-xl font-semibold">All Set!</div>
                <div className="text-sm text-muted-foreground">
                  {existingConfirmation
                    ? "You've already confirmed this signup."
                    : "Thank you for confirming your successful signup!"
                  }
                </div>
                {session && (
                  <div className="text-sm font-medium text-primary">
                    {session.title || session.name}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link to="/">
                  <Button variant="outline">Search More Camps</Button>
                </Link>
                <Link to="/dashboard">
                  <Button>View Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Was your signup successful?</CardTitle>
            {session && (
              <div className="text-center text-sm text-muted-foreground">
                {session.title || session.name}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Help us track our success rate by confirming whether you were able to successfully sign up for this camp.
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid (optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountCents}
                  onChange={(e) => setAmountCents(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {session?.price_min && session?.price_max
                  ? `Expected: $${session.price_min} - $${session.price_max}`
                  : session?.price_min
                  ? `Expected: $${session.price_min}+`
                  : "This helps us verify pricing accuracy"
                }
              </div>
            </div>

            {/* Notes input */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any issues with the signup process, wait times, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleConfirmSuccess}
                disabled={confirming}
                className="w-full"
                size="lg"
              >
                {confirming ? "Confirming..." : "✓ Yes, I signed up successfully!"}
              </Button>
              
              <div className="text-center">
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                  No, I wasn't able to sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Your confirmation helps us improve our service</div>
              <div>• All information is optional and private</div>
              <div>• You can only confirm once per session</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}