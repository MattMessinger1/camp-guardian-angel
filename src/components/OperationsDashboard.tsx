import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Activity,
  Users,
  TrendingUp,
  RefreshCw,
  Eye,
  Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ApprovalWorkflow {
  id: string;
  workflow_type: string;
  status: string;
  priority: string;
  title: string;
  description?: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  approved_at?: string;
  declined_at?: string;
  notification_sent_at?: string;
  notification_method?: string;
}

interface OperationsMetrics {
  total_workflows: number;
  pending_workflows: number;
  approved_workflows: number;
  declined_workflows: number;
  expired_workflows: number;
  avg_response_time_minutes?: number;
  approval_rate?: number;
  notification_success_rate?: number;
  form_completion_count: number;
  captcha_solving_count: number;
  payment_confirmation_count: number;
}

interface AuditTrailEntry {
  id: string;
  action_type: string;
  actor_type: string;
  created_at: string;
  action_data: any;
  previous_state?: string;
  new_state?: string;
  workflow: {
    title: string;
    workflow_type: string;
  };
}

export default function OperationsDashboard() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const workflowsSubscription = supabase
      .channel('approval-workflows-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'approval_workflows' },
        () => loadWorkflows()
      )
      .subscribe();

    const auditSubscription = supabase
      .channel('approval-audit-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'approval_audit_trail' },
        () => loadAuditTrail()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workflowsSubscription);
      supabase.removeChannel(auditSubscription);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadWorkflows(),
        loadMetrics(),
        loadAuditTrail()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    setWorkflows(data || []);
  };

  const loadMetrics = async () => {
    // Get today's metrics
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('approval_operations_metrics')
      .select('*')
      .eq('metric_date', today)
      .single();

    if (data) {
      setMetrics(data);
    } else {
      // Calculate metrics from current workflows if no daily metrics exist
      const { data: allWorkflows } = await supabase
        .from('approval_workflows')
        .select('*');

      if (allWorkflows) {
        const metrics: OperationsMetrics = {
          total_workflows: allWorkflows.length,
          pending_workflows: allWorkflows.filter(w => w.status === 'pending').length,
          approved_workflows: allWorkflows.filter(w => w.status === 'approved').length,
          declined_workflows: allWorkflows.filter(w => w.status === 'declined').length,
          expired_workflows: allWorkflows.filter(w => w.status === 'expired').length,
          form_completion_count: allWorkflows.filter(w => w.workflow_type === 'form_completion').length,
          captcha_solving_count: allWorkflows.filter(w => w.workflow_type === 'captcha_solving').length,
          payment_confirmation_count: allWorkflows.filter(w => w.workflow_type === 'payment_confirmation').length,
          approval_rate: allWorkflows.length > 0 ? 
            (allWorkflows.filter(w => w.status === 'approved').length / allWorkflows.length) * 100 : 0
        };
        setMetrics(metrics);
      }
    }
  };

  const loadAuditTrail = async () => {
    const { data, error } = await supabase
      .from('approval_audit_trail')
      .select(`
        *,
        workflow:approval_workflows(title, workflow_type)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    setAuditTrail(data || []);
  };

  const handleManualOverride = async (workflowId: string, action: 'approve' | 'decline', reason: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-approval', {
        body: {
          workflow_id: workflowId,
          action,
          manual_override: true,
          override_reason: reason
        }
      });

      if (error) throw error;

      toast({
        title: "Manual Override Applied",
        description: `Workflow ${action}d via manual override.`,
      });

      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Override Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => 
    selectedStatus === 'all' || workflow.status === selectedStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading operations dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600">Monitor approval workflows and automation decisions</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{metrics.total_workflows}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{metrics.pending_workflows}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-2xl font-bold">
                  {metrics.approval_rate ? `${metrics.approval_rate.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Activity className="w-4 h-4 text-purple-500 mr-2" />
                <span className="text-2xl font-bold">
                  {metrics.avg_response_time_minutes ? `${metrics.avg_response_time_minutes.toFixed(1)}m` : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'declined', 'expired'].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {/* Workflows List */}
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{workflow.title}</CardTitle>
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.status}
                      </Badge>
                      <Badge className={getPriorityColor(workflow.priority)}>
                        {workflow.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(workflow.created_at).toLocaleString()}
                    </div>
                  </div>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span>
                      <span className="ml-2">{workflow.workflow_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="font-medium">Expires:</span>
                      <span className="ml-2">{new Date(workflow.expires_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium">Notification:</span>
                      <span className="ml-2">
                        {workflow.notification_sent_at ? 
                          `Sent via ${workflow.notification_method}` : 
                          'Not sent'
                        }
                      </span>
                    </div>
                  </div>

                  {workflow.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleManualOverride(workflow.id, 'approve', 'Manual override by admin')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Override Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleManualOverride(workflow.id, 'decline', 'Manual override by admin')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Override Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredWorkflows.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No workflows found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Audit trail of all approval workflow actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditTrail.map((entry) => (
                  <div key={entry.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {entry.action_type === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {entry.action_type === 'declined' && <XCircle className="w-5 h-5 text-red-500" />}
                      {entry.action_type === 'created' && <Shield className="w-5 h-5 text-blue-500" />}
                      {entry.action_type === 'notification_sent' && <Users className="w-5 h-5 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {entry.action_type.replace(/_/g, ' ').toUpperCase()} - {entry.workflow?.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {entry.workflow?.workflow_type.replace(/_/g, ' ')} by {entry.actor_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}

                {auditTrail.length === 0 && (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No audit trail entries found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Types</CardTitle>
                  <CardDescription>Distribution of approval request types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Form Completion</span>
                      <Badge variant="outline">{metrics.form_completion_count}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CAPTCHA Solving</span>
                      <Badge variant="outline">{metrics.captcha_solving_count}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Payment Confirmation</span>
                      <Badge variant="outline">{metrics.payment_confirmation_count}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Current status of all workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Approved</span>
                      <Badge className="bg-green-100 text-green-800">
                        {metrics.approved_workflows}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Declined</span>
                      <Badge className="bg-red-100 text-red-800">
                        {metrics.declined_workflows}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pending</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {metrics.pending_workflows}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expired</span>
                      <Badge className="bg-gray-100 text-gray-800">
                        {metrics.expired_workflows}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}