import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useJackrabbitImport } from '@/hooks/useJackrabbitImport';
import { Download, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface JackrabbitImportDialogProps {
  children?: React.ReactNode;
  defaultUrl?: string;
  onImportComplete?: (result: any) => void;
}

export const JackrabbitImportDialog: React.FC<JackrabbitImportDialogProps> = ({
  children,
  defaultUrl = '',
  onImportComplete
}) => {
  const [open, setOpen] = useState(false);
  const [providerUrl, setProviderUrl] = useState(defaultUrl);
  const [organizationId, setOrganizationId] = useState('');
  const { isImporting, result, error, importJackrabbitClasses, reset } = useJackrabbitImport();

  // Auto-extract organization ID from URL
  React.useEffect(() => {
    if (providerUrl) {
      try {
        const url = new URL(providerUrl);
        const id = url.searchParams.get('id') || url.searchParams.get('OrgID');
        if (id && id !== organizationId) {
          setOrganizationId(id);
        }
      } catch {
        // Invalid URL, ignore
      }
    }
  }, [providerUrl]);

  const handleImport = async () => {
    if (!providerUrl || !organizationId) {
      return;
    }

    try {
      const importResult = await importJackrabbitClasses(providerUrl, organizationId);
      onImportComplete?.(importResult);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) reset();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Import Jackrabbit Classes
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Jackrabbit Classes</DialogTitle>
          <DialogDescription>
            Import class schedules from a Jackrabbit provider into our system for automated registration.
          </DialogDescription>
        </DialogHeader>

        {!result && !error && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider-url">Jackrabbit Provider URL</Label>
              <Input
                id="provider-url"
                placeholder="https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsDirect?orgID=123456"
                value={providerUrl}
                onChange={(e) => setProviderUrl(e.target.value)}
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                Paste the Jackrabbit class listing or registration URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-id">Organization ID</Label>
              <Input
                id="org-id"
                placeholder="123456"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                Auto-extracted from URL or enter manually
              </p>
            </div>

            {providerUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Provider URL</Badge>
                    <span className="text-sm truncate">{providerUrl}</span>
                  </div>
                  {organizationId && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Org ID</Badge>
                      <span className="text-sm">{organizationId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Import Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-success">
            <CardHeader>
              <CardTitle className="text-success flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Import Successful
              </CardTitle>
              <CardDescription>
                Imported {result.imported_count} classes from {result.provider_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {result.sessions.slice(0, 5).map((session, idx) => (
                  <div key={session.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{session.title}</p>
                      {session.start_at && (
                        <p className="text-xs text-muted-foreground">
                          Starts: {new Date(session.start_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {session.signup_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={session.signup_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
                {result.sessions.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {result.sessions.length - 5} more classes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          {!result && !error && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!providerUrl || !organizationId || isImporting}
              >
                {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import Classes
              </Button>
            </>
          )}
          
          {(result || error) && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};