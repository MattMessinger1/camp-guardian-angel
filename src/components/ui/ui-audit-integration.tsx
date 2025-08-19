import React, { useState } from 'react';
import { UIAuditChecklist } from '@/components/UIAuditChecklist';
import { cn } from '@/lib/utils';

interface UIAuditToggleProps {
  pageName: string;
  currentRoute: string;
  className?: string;
}

export function UIAuditToggle({ pageName, currentRoute, className }: UIAuditToggleProps) {
  const [showUIAudit, setShowUIAudit] = useState(false);

  // Check URL params for auto-opening audit
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ui-audit') === 'true') {
      setShowUIAudit(true);
    }
  }, []);

  return (
    <>
      {/* Floating UI Audit Button */}
      <button
        onClick={() => setShowUIAudit(!showUIAudit)}
        className={cn(
          "fixed bottom-4 right-4 z-40 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
          "flex items-center gap-2 font-medium",
          showUIAudit && "bg-purple-700",
          className
        )}
        title="Open UI Audit Checklist"
      >
        <span className="text-xl">🎨</span>
        <span className="hidden sm:inline text-sm">UI Audit</span>
      </button>

      {/* UI Audit Modal */}
      {showUIAudit && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <div className="min-h-screen">
            {/* Close button */}
            <button
              onClick={() => setShowUIAudit(false)}
              className="fixed top-4 right-4 z-10 bg-background border border-border p-2 rounded-lg hover:bg-muted transition-colors"
              title="Close UI Audit"
            >
              <span className="text-xl">✕</span>
            </button>
            
            <UIAuditChecklist 
              pageName={pageName} 
              currentRoute={currentRoute} 
            />
          </div>
        </div>
      )}
    </>
  );
}

// HOC to wrap any page with UI Audit functionality
export function withUIAudit<P extends object>(
  Component: React.ComponentType<P>, 
  pageName: string, 
  route: string
) {
  const WrappedComponent = (props: P) => (
    <>
      <Component {...props} />
      <UIAuditToggle pageName={pageName} currentRoute={route} />
    </>
  );
  
  WrappedComponent.displayName = `withUIAudit(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for programmatic UI Audit control
export function useUIAudit(pageName: string, currentRoute: string) {
  const [showUIAudit, setShowUIAudit] = useState(false);

  const openAudit = () => setShowUIAudit(true);
  const closeAudit = () => setShowUIAudit(false);
  const toggleAudit = () => setShowUIAudit(!showUIAudit);

  // Auto-open from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ui-audit') === 'true') {
      setShowUIAudit(true);
    }
  }, []);

  const AuditModal = showUIAudit ? (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <button
        onClick={closeAudit}
        className="fixed top-4 right-4 z-10 bg-background border border-border p-2 rounded-lg hover:bg-muted transition-colors"
      >
        ✕
      </button>
      <UIAuditChecklist pageName={pageName} currentRoute={currentRoute} />
    </div>
  ) : null;

  return {
    showUIAudit,
    openAudit,
    closeAudit,
    toggleAudit,
    AuditModal
  };
}