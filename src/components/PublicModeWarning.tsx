import { useState } from 'react';
import { isPublicMode } from '@/lib/config/publicMode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Shield, Info } from 'lucide-react';

export function PublicModeWarning() {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show in development and when public mode is enabled
  if (!import.meta.env.DEV || !isPublicMode() || isDismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <Shield className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-orange-800 dark:text-orange-200">
            Public Data Mode ON
          </span>
          <span className="text-orange-700 dark:text-orange-300">
            Private provider APIs are disabled. Only public data sources will be used.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.group('%cPublic Data Mode Information', 'color: orange; font-weight: bold');
              console.info('Current mode: Public Data Only');
              console.info('Private APIs: Blocked');
              console.info('Rate limiting: Enabled');
              console.info('Robots.txt compliance: Enabled');
              console.info('To disable: Set PUBLIC_DATA_MODE=false in environment');
              console.groupEnd();
            }}
            className="text-orange-600 hover:text-orange-800"
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-orange-600 hover:text-orange-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}