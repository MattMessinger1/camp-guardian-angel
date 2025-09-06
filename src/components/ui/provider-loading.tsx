/**
 * Loading States for Provider Detection
 * Optimized skeleton components for speed perception
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ProviderLoadingBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ProviderLoadingBadge({ size = 'md' }: ProviderLoadingBadgeProps) {
  const sizeClasses = {
    sm: 'h-5 w-16',
    md: 'h-6 w-20', 
    lg: 'h-7 w-24'
  };

  return (
    <Skeleton className={`${sizeClasses[size]} rounded-full`} />
  );
}

interface ProviderDetectingBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ProviderDetectingBadge({ size = 'md' }: ProviderDetectingBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge variant="outline" className={`${sizeClasses[size]} animate-pulse`}>
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      Detecting...
    </Badge>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="p-6 border rounded-lg animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-7 w-48" />        {/* Title */}
            <ProviderLoadingBadge size="sm" />        {/* Provider badge */}
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4" />         {/* Map icon */}
            <Skeleton className="h-4 w-32" />        {/* Location */}
          </div>
        </div>
        
        <div className="ml-6">
          <Skeleton className="h-10 w-40" />          {/* Button */}
        </div>
      </div>
    </div>
  );
}

interface LoadingProgressProps {
  message: string;
  progress?: number;
}

export function LoadingProgress({ message, progress }: LoadingProgressProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {message}
        </p>
        {progress !== undefined && (
          <div className="mt-2 bg-blue-200 rounded-full h-2 dark:bg-blue-800">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}