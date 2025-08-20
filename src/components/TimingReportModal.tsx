import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Timer,
  Zap,
  Network
} from 'lucide-react';

interface TimingData {
  registrationId: string;
  campName: string;
  sessionTitle: string;
  requestedAt: string;
  completedAt?: string;
  status: string;
  resultMessage?: string;
  // Timing metrics
  t0OffsetMs?: number;  // How long after registration opened
  latencyMs?: number;   // Network response time
  queueWaitMs?: number; // Time spent in queue
  failureReason?: string;
  // CAPTCHA timing
  captchaDetectedAt?: string;
  captchaResolvedAt?: string;
  captchaStatus?: string;
}

interface TimingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timingData: TimingData | null;
}

export default function TimingReportModal({ isOpen, onClose, timingData }: TimingReportModalProps) {
  if (!timingData) return null;

  const registrationOpenedAt = timingData.t0OffsetMs 
    ? new Date(new Date(timingData.requestedAt).getTime() - timingData.t0OffsetMs).toISOString()
    : null;

  const totalProcessDuration = timingData.completedAt 
    ? new Date(timingData.completedAt).getTime() - new Date(timingData.requestedAt).getTime()
    : null;

  const captchaProcessingTime = timingData.captchaDetectedAt && timingData.captchaResolvedAt
    ? new Date(timingData.captchaResolvedAt).getTime() - new Date(timingData.captchaDetectedAt).getTime()
    : null;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSubmissionTimingStatus = (offsetMs?: number) => {
    if (!offsetMs) return { color: 'text-muted-foreground', label: 'Unknown', icon: AlertTriangle };
    if (offsetMs < 1000) return { color: 'text-green-600', label: 'Excellent', icon: Zap };
    if (offsetMs < 5000) return { color: 'text-blue-600', label: 'Good', icon: CheckCircle };
    if (offsetMs < 30000) return { color: 'text-yellow-600', label: 'Fair', icon: Clock };
    return { color: 'text-red-600', label: 'Slow', icon: XCircle };
  };

  const submissionStatus = getSubmissionTimingStatus(timingData.t0OffsetMs);
  const SubmissionIcon = submissionStatus.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Timing Report - {timingData.campName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Registration Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Session:</span>
                <span>{timingData.sessionTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={timingData.status === 'accepted' ? 'default' : 'destructive'}>
                  {timingData.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Requested:</span>
                <span>{new Date(timingData.requestedAt).toLocaleString()}</span>
              </div>
              {timingData.completedAt && (
                <div className="flex justify-between">
                  <span className="font-medium">Completed:</span>
                  <span>{new Date(timingData.completedAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Timing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <SubmissionIcon className={`w-5 h-5 ${submissionStatus.color}`} />
                Submission Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Response Speed:</span>
                <Badge variant="outline" className={submissionStatus.color}>
                  {submissionStatus.label}
                </Badge>
              </div>
              
              {timingData.t0OffsetMs ? (
                <>
                  <div className="flex justify-between">
                    <span>Time after registration opened:</span>
                    <span className="font-mono">{formatDuration(timingData.t0OffsetMs)}</span>
                  </div>
                  {registrationOpenedAt && (
                    <div className="text-sm text-muted-foreground">
                      Registration opened at: {new Date(registrationOpenedAt).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Submission timing data not available
                </div>
              )}
            </CardContent>
          </Card>

          {/* CAPTCHA Processing */}
          {timingData.captchaDetectedAt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  CAPTCHA Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={timingData.captchaStatus === 'completed' ? 'default' : 'secondary'}>
                    {timingData.captchaStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Detected at:</span>
                  <span>{new Date(timingData.captchaDetectedAt).toLocaleString()}</span>
                </div>
                {timingData.captchaResolvedAt && (
                  <>
                    <div className="flex justify-between">
                      <span>Resolved at:</span>
                      <span>{new Date(timingData.captchaResolvedAt).toLocaleString()}</span>
                    </div>
                    {captchaProcessingTime && (
                      <div className="flex justify-between">
                        <span className="font-medium">Processing time:</span>
                        <span className="font-mono">{formatDuration(captchaProcessingTime)}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Network Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-600" />
                Network Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {timingData.latencyMs && (
                <div className="flex justify-between">
                  <span>Response time:</span>
                  <span className="font-mono">{timingData.latencyMs}ms</span>
                </div>
              )}
              {timingData.queueWaitMs && (
                <div className="flex justify-between">
                  <span>Queue wait time:</span>
                  <span className="font-mono">{formatDuration(timingData.queueWaitMs)}</span>
                </div>
              )}
              {totalProcessDuration && (
                <div className="flex justify-between">
                  <span className="font-medium">Total duration:</span>
                  <span className="font-mono">{formatDuration(totalProcessDuration)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Failure Analysis */}
          {(timingData.status === 'failed' || timingData.failureReason) && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  Failure Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {timingData.failureReason && (
                  <div>
                    <span className="font-medium">Reason:</span>
                    <p className="text-sm mt-1 text-red-700">{timingData.failureReason}</p>
                  </div>
                )}
                {timingData.resultMessage && (
                  <div>
                    <span className="font-medium">Details:</span>
                    <p className="text-sm mt-1 text-red-700">{timingData.resultMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}