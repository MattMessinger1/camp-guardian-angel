import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ReadinessScoreGaugeProps {
  score: number;
  status: 'ready' | 'needs_preparation' | 'missing_critical_info';
  className?: string;
}

export function ReadinessScoreGauge({ score, status, className }: ReadinessScoreGaugeProps) {
  const getStatusConfig = (status: string, score: number) => {
    if (status === 'ready' || score >= 80) {
      return {
        color: 'from-green-500 to-emerald-600',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        icon: CheckCircle,
        label: 'Ready to Go',
        message: 'You\'re well prepared for signup!'
      };
    } else if (status === 'needs_preparation' || score >= 50) {
      return {
        color: 'from-yellow-500 to-orange-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        icon: TrendingUp,
        label: 'Almost Ready',
        message: 'A few more steps and you\'ll be set!'
      };
    } else {
      return {
        color: 'from-red-500 to-rose-600',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        icon: AlertTriangle,
        label: 'Needs Attention',
        message: 'Important items need your attention'
      };
    }
  };

  const config = getStatusConfig(status, score);
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.bgColor} border-2 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.textColor}`} />
            <h3 className="text-lg font-semibold">Readiness Score</h3>
          </div>
          <Badge 
            variant="outline" 
            className={`${config.textColor} border-current`}
          >
            {config.label}
          </Badge>
        </div>

        {/* Circular Progress */}
        <div className="relative mx-auto w-32 h-32 mb-4">
          {/* Background circle */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${(score / 100) * 314} 314`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`stop-color-${config.color.split(' ')[0].replace('from-', '')}`} />
                <stop offset="100%" className={`stop-color-${config.color.split(' ')[2].replace('to-', '')}`} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Score text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-3xl font-bold ${config.textColor}`}>{score}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
          </div>
        </div>

        {/* Progress bar as backup */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className={config.textColor}>{score}%</span>
          </div>
          <Progress 
            value={score} 
            className="h-3"
          />
        </div>

        {/* Status message */}
        <p className={`text-center text-sm mt-4 ${config.textColor}`}>
          {config.message}
        </p>

        {/* Score breakdown */}
        <div className="mt-4 pt-4 border-t border-white/50">
          <div className="grid grid-cols-3 gap-4 text-xs text-center">
            <div>
              <div className="font-semibold">Account</div>
              <div className={score >= 20 ? 'text-green-600' : 'text-gray-400'}>
                {score >= 20 ? '✓' : '○'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Info</div>
              <div className={score >= 50 ? 'text-green-600' : 'text-gray-400'}>
                {score >= 50 ? '✓' : '○'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Ready</div>
              <div className={score >= 80 ? 'text-green-600' : 'text-gray-400'}>
                {score >= 80 ? '✓' : '○'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}