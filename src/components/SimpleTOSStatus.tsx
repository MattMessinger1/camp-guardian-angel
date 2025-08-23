/**
 * Simplified TOS Status Component
 * 
 * Shows simple compliance status without complex UI.
 * Optimized for fast loading and clear parent communication.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { SimpleTOSResult } from '@/lib/providers/SimpleTOSChecker';

interface SimpleTOSStatusProps {
  result: SimpleTOSResult;
  providerName: string;
  className?: string;
}

export function SimpleTOSStatus({ result, providerName, className = '' }: SimpleTOSStatusProps) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'green':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'yellow':
        return <AlertTriangle className="h-4 w-4" />;
      case 'red':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getStatusVariant = () => {
    switch (result.status) {
      case 'green':
        return 'default' as const;
      case 'yellow':
        return 'secondary' as const;
      case 'red':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  const getAlertVariant = () => {
    return result.status === 'red' ? 'destructive' : 'default';
  };

  const getParentMessage = () => {
    switch (result.status) {
      case 'green':
        return `${providerName} is a trusted camp provider. We'll help you register with your permission.`;
      case 'yellow':
        return `We can help you register at ${providerName}. You'll maintain full control throughout the process.`;
      case 'red':
        return `${providerName} has requested manual registration only. We'll guide you through the manual process.`;
      default:
        return 'Registration assistance available with your permission.';
    }
  };

  return (
    <div className={className}>
      <Alert variant={getAlertVariant()}>
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Registration Status</span>
              <Badge variant={getStatusVariant()}>
                {result.status.toUpperCase()}
              </Badge>
            </div>
            <AlertDescription>
              {getParentMessage()}
            </AlertDescription>
            {result.requiresConsent && (
              <div className="mt-2 text-xs text-muted-foreground">
                ✓ Requires explicit parent consent
              </div>
            )}
          </div>
        </div>
      </Alert>
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-muted-foreground">
          Check completed in {result.checkDurationMs}ms
        </div>
      )}
    </div>
  );
}