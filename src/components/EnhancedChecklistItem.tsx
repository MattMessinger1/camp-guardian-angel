import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';

interface ChecklistItem {
  category: string;
  item: string;
  status: 'complete' | 'incomplete' | 'needs_attention';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

interface EnhancedChecklistItemProps {
  item: ChecklistItem;
  onAction?: () => void;
  actionUrl?: string;
  estimatedMinutes?: number;
  className?: string;
}

export function EnhancedChecklistItem({ 
  item, 
  onAction, 
  actionUrl, 
  estimatedMinutes,
  className 
}: EnhancedChecklistItemProps) {
  
  const getStatusConfig = (status: string, priority: string) => {
    const configs = {
      complete: {
        icon: CheckCircle,
        iconColor: 'text-green-500',
        borderColor: 'border-green-200',
        bgColor: 'bg-green-50',
        badgeVariant: 'default'
      },
      needs_attention: {
        icon: priority === 'high' ? AlertTriangle : Clock,
        iconColor: priority === 'high' ? 'text-red-500' : 'text-yellow-500',
        borderColor: priority === 'high' ? 'border-red-200' : 'border-yellow-200',
        bgColor: priority === 'high' ? 'bg-red-50' : 'bg-yellow-50',
        badgeVariant: priority === 'high' ? 'destructive' : 'secondary'
      },
      incomplete: {
        icon: priority === 'high' ? Zap : Info,
        iconColor: priority === 'high' ? 'text-orange-500' : 'text-blue-500',
        borderColor: priority === 'high' ? 'border-orange-200' : 'border-blue-200',
        bgColor: priority === 'high' ? 'bg-orange-50' : 'bg-blue-50',
        badgeVariant: priority === 'high' ? 'destructive' : 'outline'
      }
    } as const;

    return configs[status as keyof typeof configs] || configs.incomplete;
  };

  const config = getStatusConfig(item.status, item.priority);
  const StatusIcon = config.icon;
  
  const isActionable = item.status !== 'complete' && (onAction || actionUrl);
  
  return (
    <Card className={`
      relative overflow-hidden transition-all duration-200 hover:shadow-md
      ${config.borderColor} ${config.bgColor} border-l-4
      ${isActionable ? 'hover:scale-[1.02] cursor-pointer' : ''}
      ${className}
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={`flex-shrink-0 p-2 rounded-full bg-white ${config.iconColor}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-lg leading-tight">{item.item}</h4>
              <div className="flex items-center gap-2">
                <Badge variant={config.badgeVariant} className="text-xs">
                  {item.priority} priority
                </Badge>
                {item.status === 'complete' && (
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                    ✓ Done
                  </Badge>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="text-xs font-medium text-muted-foreground bg-white/60 px-2 py-1 rounded inline-block">
              {item.category}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {item.description}
            </p>

            {/* Time Estimate */}
            {estimatedMinutes && item.status !== 'complete' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>~{estimatedMinutes} minutes to complete</span>
              </div>
            )}

            {/* Action Button */}
            {isActionable && (
              <div className="pt-2">
                {actionUrl ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs"
                    onClick={() => window.open(actionUrl, '_blank')}
                  >
                    Take Action
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs"
                    onClick={onAction}
                  >
                    Complete This
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator for partial completion */}
        {item.status === 'needs_attention' && (
          <div className="mt-3 pt-3 border-t border-white/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>Needs attention</span>
            </div>
            <Progress value={60} className="h-2" />
          </div>
        )}
      </div>

      {/* Urgency indicator */}
      {item.priority === 'high' && item.status !== 'complete' && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </Card>
  );
}