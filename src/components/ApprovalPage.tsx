import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  Clock,
  User,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WorkflowInfo {
  workflow_type: string;
  title: string;
  description?: string;
  user_id: string;
  expires_at: string;
  context_data?: Record<string, any>;
  priority: string;
}

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowInfo | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [processing, setProcessing] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    if (token) {
      loadWorkflowInfo();
    }
  }, [token]);

  const loadWorkflowInfo = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Decode token to show user context (without verifying)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Get workflow details from database
      const { data: workflow, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('approval_token', token)
        .single();

      if (error || !workflow) {
        throw new Error('Workflow not found or invalid token');
      }

      if (workflow.status !== 'pending') {
        throw new Error(`This approval request has already been ${workflow.status}`);
      }

      if (new Date(workflow.expires_at) < new Date()) {
        throw new Error('This approval request has expired');
      }

      setWorkflowInfo({
        workflow_type: workflow.workflow_type,
        title: workflow.title,
        description: workflow.description,
        user_id: workflow.user_id,
        expires_at: workflow.expires_at,
        context_data: workflow.context_data as Record<string, any>,
        priority: workflow.priority
      });
    } catch (error: any) {
      console.error('Failed to load workflow info:', error);
      setError(error.message || 'Failed to load approval request');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'approve' | 'decline') => {
    if (!token || !workflowInfo) return;

    setProcessing(action);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('process-approval', {
        body: {
          token,
          action,
          decision_reason: decisionReason
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(true);
        toast({
          title: `Request ${action}d`,
          description: `The automation request has been ${action}d successfully.`,
          variant: action === 'approve' ? 'default' : 'destructive'
        });
      } else {
        throw new Error(data.error || `Failed to ${action} request`);
      }
    } catch (error: any) {
      console.error(`Approval ${action} error:`, error);
      setError(error.message || `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getWorkflowTypeLabel = (type: string) => {
    switch (type) {
      case 'form_completion': return 'Form Completion';
      case 'captcha_solving': return 'CAPTCHA Solving';
      case 'payment_confirmation': return 'Payment Confirmation';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2">Loading approval request...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !workflowInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Request</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Decision Recorded</CardTitle>
            <CardDescription>
              Your decision has been processed successfully. The automation will continue based on your approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You can safely close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Parent Approval Required</CardTitle>
          <CardDescription>
            An automated action requires your approval to proceed
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {workflowInfo && (
            <>
              {/* Workflow Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Action Type</span>
                  </div>
                  <p className="text-blue-700">{getWorkflowTypeLabel(workflowInfo.workflow_type)}</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="font-medium text-purple-900">Priority</span>
                  </div>
                  <p className={`font-medium ${getPriorityColor(workflowInfo.priority)}`}>
                    {workflowInfo.priority.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-900 mb-2">{workflowInfo.title}</h3>
                {workflowInfo.description && (
                  <p className="text-blue-700 mb-3">{workflowInfo.description}</p>
                )}
                
                {/* Context Data */}
                {workflowInfo.context_data && Object.keys(workflowInfo.context_data).length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Details:</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      {Object.entries(workflowInfo.context_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Expiration Warning */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  This approval request expires at {new Date(workflowInfo.expires_at).toLocaleString()}
                </AlertDescription>
              </Alert>

              {/* Decision Reason */}
              <div className="space-y-2">
                <Label htmlFor="decision-reason">Decision Reason (Optional)</Label>
                <Textarea
                  id="decision-reason"
                  placeholder="Add a note about your decision..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => handleDecision('approve')}
                  className="flex-1"
                  disabled={processing !== null}
                >
                  {processing === 'approve' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Continue
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => handleDecision('decline')}
                  variant="destructive"
                  className="flex-1"
                  disabled={processing !== null}
                >
                  {processing === 'decline' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Decline & Stop
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}