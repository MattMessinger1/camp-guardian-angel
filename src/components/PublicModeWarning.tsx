import { useState } from 'react';
import { isPublicMode } from '@/lib/config/publicMode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info } from 'lucide-react';

export function PublicModeWarning() {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show in development and when public mode is enabled
  if (!import.meta.env.DEV || !isPublicMode() || isDismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-800 dark:text-blue-200">
            Public Data Mode
          </span>
          <span className="text-blue-700 dark:text-blue-300">
            Using public camp data sources. No private API connectors implemented.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.group('%cPublic Data Mode Information', 'color: blue; font-weight: bold');
              console.info('Current mode: Public Camp Data Sources');
              console.info('Private API connectors: Not implemented (by design)');
              console.info('Public scraping: Enabled with robots.txt compliance');
              console.info('Rate limiting: Enabled for respectful data fetching');
              console.info('All other APIs: Working normally (Supabase, Stripe, etc.)');
              console.groupEnd();
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}