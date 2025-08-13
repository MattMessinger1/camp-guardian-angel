import React from 'react';
import { Check, Clock, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStage {
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'upcoming' | 'pending';
}

interface VisualTimelineProps {
  currentStage: string;
  planData?: {
    research_start?: string;
    preflight_date?: string;
    monitor_start?: string;
    scheduled_time?: string;
    timezone?: string;
  };
  className?: string;
}

export function VisualTimeline({ currentStage, planData, className }: VisualTimelineProps) {
  const formatDate = (dateString?: string, timezone?: string) => {
    if (!dateString) return 'TBD';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(timezone && {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit'
        })
      });
    } catch {
      return 'TBD';
    }
  };

  const stages: TimelineStage[] = [
    {
      id: 'research',
      title: 'Research',
      subtitle: 'Find camps & sessions',
      date: formatDate(planData?.research_start),
      icon: <AlertCircle className="h-4 w-4" />,
      status: currentStage === 'research' ? 'active' : 
              ['preflight', 'monitor', 'activate', 'registration'].includes(currentStage) ? 'completed' : 'upcoming'
    },
    {
      id: 'preflight',
      title: 'Preflight',
      subtitle: 'Test credentials & setup',
      date: formatDate(planData?.preflight_date),
      icon: <Check className="h-4 w-4" />,
      status: currentStage === 'preflight' ? 'active' :
              ['monitor', 'activate', 'registration'].includes(currentStage) ? 'completed' :
              currentStage === 'research' ? 'upcoming' : 'pending'
    },
    {
      id: 'monitor',
      title: 'Monitor',
      subtitle: 'Watch for registration opens',
      date: formatDate(planData?.monitor_start),
      icon: <Clock className="h-4 w-4" />,
      status: currentStage === 'monitor' ? 'active' :
              ['activate', 'registration'].includes(currentStage) ? 'completed' :
              ['research', 'preflight'].includes(currentStage) ? 'upcoming' : 'pending'
    },
    {
      id: 'activate',
      title: 'Guardian Angel',
      subtitle: 'Auto-registration activates',
      date: formatDate(planData?.scheduled_time, planData?.timezone),
      icon: <Zap className="h-4 w-4" />,
      status: currentStage === 'activate' ? 'active' :
              currentStage === 'registration' ? 'completed' :
              ['research', 'preflight', 'monitor'].includes(currentStage) ? 'upcoming' : 'pending'
    },
    {
      id: 'registration',
      title: 'Registration',
      subtitle: 'Spot secured!',
      date: 'Complete',
      icon: <Check className="h-5 w-5" />,
      status: currentStage === 'registration' ? 'completed' : 'upcoming'
    }
  ];

  const getStageStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: 'bg-green-500 text-white',
          connector: 'bg-green-500'
        };
      case 'active':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-300',
          icon: 'bg-blue-500 text-white animate-pulse',
          connector: 'bg-gradient-to-r from-green-500 to-blue-500'
        };
      case 'upcoming':
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-600',
          icon: 'bg-gray-300 text-gray-600',
          connector: 'bg-gray-300'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-400',
          icon: 'bg-gray-200 text-gray-400',
          connector: 'bg-gray-200'
        };
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Timeline - Horizontal */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Main timeline line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200" />
          
          <div className="flex justify-between items-start relative">
            {stages.map((stage, index) => {
              const styles = getStageStyles(stage.status);
              const isLast = index === stages.length - 1;
              
              return (
                <div key={stage.id} className="flex flex-col items-center relative flex-1">
                  {/* Stage container */}
                  <div className={cn(
                    "relative z-10 p-3 rounded-lg border-2 text-center min-w-[140px] mb-4",
                    styles.container
                  )}>
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2",
                      styles.icon
                    )}>
                      {stage.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{stage.title}</div>
                      <div className="text-xs opacity-75">{stage.subtitle}</div>
                      <div className="text-xs font-mono bg-white/50 px-2 py-1 rounded">
                        {stage.date}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector line */}
                  {!isLast && (
                    <div 
                      className={cn(
                        "absolute top-8 left-1/2 h-0.5 z-0",
                        "w-full",
                        styles.connector
                      )} 
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Timeline - Vertical */}
      <div className="block lg:hidden space-y-4">
        {stages.map((stage, index) => {
          const styles = getStageStyles(stage.status);
          const isLast = index === stages.length - 1;
          
          return (
            <div key={stage.id} className="relative">
              <div className="flex items-start space-x-4">
                {/* Icon column */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    styles.icon
                  )}>
                    {stage.icon}
                  </div>
                  
                  {/* Vertical connector */}
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-12 mt-2",
                      styles.connector
                    )} />
                  )}
                </div>
                
                {/* Content column */}
                <div className={cn(
                  "flex-1 p-4 rounded-lg border-2",
                  styles.container
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{stage.title}</div>
                      <div className="text-sm opacity-75">{stage.subtitle}</div>
                    </div>
                    <div className="text-sm font-mono bg-white/50 px-2 py-1 rounded ml-4">
                      {stage.date}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VisualTimeline;