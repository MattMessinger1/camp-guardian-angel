import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, CheckCircle, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function EmailForwardingSetup() {
  const [emailCopied, setEmailCopied] = useState(false);
  const successEmail = "success@camprush.app"; // Replace with your actual domain

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(successEmail);
      setEmailCopied(true);
      toast({
        title: "Email copied!",
        description: "You can now paste this email address in your forwarding setup."
      });
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the email address.",
        variant: "destructive"
      });
    }
  };

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Email Success Tracking Setup</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Automatically track successful camp signups by forwarding confirmation emails to our system.
            This optional feature helps us measure our success rate without manual confirmation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                How Email Tracking Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    1
                  </div>
                  <div className="text-sm">
                    <strong>You sign up</strong> for a camp through our tracking links
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    2
                  </div>
                  <div className="text-sm">
                    <strong>Camp sends confirmation</strong> email to your inbox
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    3
                  </div>
                  <div className="text-sm">
                    <strong>You forward the email</strong> to our success tracking address
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    4
                  </div>
                  <div className="text-sm">
                    <strong>We automatically detect</strong> the successful signup
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email forwarding setup */}
          <Card>
            <CardHeader>
              <CardTitle>Success Tracking Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Forward camp confirmation emails to this address:
                </p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <code className="flex-1 text-sm font-mono">{successEmail}</code>
                  <Button
                    onClick={copyEmail}
                    size="sm"
                    variant="outline"
                  >
                    {emailCopied ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Privacy:</strong> We only extract basic confirmation data 
                  (session name, date, amount) and create privacy-friendly hashes. 
                  Personal information is automatically redacted.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Use Email Tracking?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-medium">Automatic Success Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  No need to manually confirm successful signups - we detect them automatically.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-medium">Better Service</h3>
                <p className="text-sm text-muted-foreground">
                  Helps us understand which camps work well and improve our recommendations.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-medium">Optional & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Completely optional feature with privacy-first design and data minimization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions for common email providers */}
        <Card>
          <CardHeader>
            <CardTitle>Email Forwarding Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-medium">Gmail</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Open the camp confirmation email</li>
                  <li>Click the three-dot menu (More)</li>
                  <li>Select "Forward"</li>
                  <li>Add {successEmail} as recipient</li>
                  <li>Send</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Outlook/Hotmail</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Open the camp confirmation email</li>
                  <li>Click "Forward" in the toolbar</li>
                  <li>Add {successEmail} as recipient</li>
                  <li>Send</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Apple Mail</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Open the camp confirmation email</li>
                  <li>Click the Forward button</li>
                  <li>Add {successEmail} as recipient</li>
                  <li>Send</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Yahoo Mail</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Open the camp confirmation email</li>
                  <li>Click "Forward"</li>
                  <li>Add {successEmail} as recipient</li>
                  <li>Send</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">What emails should I forward?</h3>
              <p className="text-sm text-muted-foreground">
                Forward any confirmation emails you receive after successfully signing up for a camp. 
                These typically have subjects like "Registration Confirmation", "Enrollment Complete", 
                or "Payment Received".
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Is my personal information safe?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. We automatically redact personal information and only extract basic confirmation 
                data (camp name, dates, amount). Everything is processed with privacy-friendly hashes.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Do I have to use this feature?</h3>
              <p className="text-sm text-muted-foreground">
                No, this is completely optional. You can still use our manual confirmation system 
                or simply not confirm at all. This just makes tracking more convenient.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}