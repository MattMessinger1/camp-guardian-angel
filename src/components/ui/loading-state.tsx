import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  type?: 'card' | 'list' | 'search' | 'page' | 'table' | 'grid';
  items?: number;
  title?: string;
  description?: string;
}

export function LoadingState({ 
  type = 'card', 
  items = 3, 
  title = 'Loading...', 
  description 
}: LoadingStateProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="space-y-4">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="surface-card p-6 space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        );
      
      case 'search':
        return (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid gap-6">
              {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="border rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="border rounded-lg p-4 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="surface-card p-4 space-y-4">
                <Skeleton className="h-40 w-full rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="p-4 border-b last:border-b-0">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'page':
      default:
        return (
          <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="surface-card p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                  <div className="surface-card p-6 space-y-4">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="text-center py-4">
          {title && <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      {renderSkeleton()}
    </div>
  );
}