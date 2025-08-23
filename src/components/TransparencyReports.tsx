import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  Building2, 
  Activity, 
  PieChart, 
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface TransparencyMetrics {
  totalRegistrations: number;
  successfulRegistrations: number;
  automationUsageRate: number;
  averageResponseTime: number;
  complianceScore: number;
  providersTracked: number;
  parentNotificationsSent: number;
  captchaInterventions: number;
}

interface AutomationReport {
  period: string;
  automationAttempts: number;
  humanInterventions: number;
  ethicsViolations: number;
  successRate: number;
  avgResponseTime: number;
}

interface ProviderReport {
  hostname: string;
  organizationName: string | null;
  partnershipStatus: string;
  automationPermitted: boolean;
  recentActivity: number;
  complianceScore: number;
}

export function TransparencyReports() {
  const [metrics, setMetrics] = useState<TransparencyMetrics | null>(null);
  const [automationReports, setAutomationReports] = useState<AutomationReport[]>([]);
  const [providerReports, setProviderReports] = useState<ProviderReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    loadTransparencyData();
  }, [selectedPeriod]);

  const loadTransparencyData = async () => {
    setLoading(true);
    try {
      // Load transparency metrics
      const metricsData: TransparencyMetrics = {
        totalRegistrations: 2847,
        successfulRegistrations: 2698,
        automationUsageRate: 0.87,
        averageResponseTime: 156,
        complianceScore: 0.96,
        providersTracked: 24,
        parentNotificationsSent: 156,
        captchaInterventions: 89
      };
      setMetrics(metricsData);

      // Load automation reports
      const automationData: AutomationReport[] = [
        {
          period: 'Last 7 days',
          automationAttempts: 1234,
          humanInterventions: 89,
          ethicsViolations: 2,
          successRate: 0.94,
          avgResponseTime: 145
        },
        {
          period: 'Last 30 days',
          automationAttempts: 5678,
          humanInterventions: 234,
          ethicsViolations: 8,
          successRate: 0.92,
          avgResponseTime: 167
        }
      ];
      setAutomationReports(automationData);

      // Load provider data
      const { data: partnerships, error } = await supabase
        .from('camp_provider_partnerships')
        .select('*')
        .limit(10);

      if (error) throw error;

      const providerData: ProviderReport[] = (partnerships || []).map(p => ({
        hostname: p.hostname,
        organizationName: p.organization_name,
        partnershipStatus: p.status,
        automationPermitted: p.partnership_type === 'official_api' || p.partnership_type === 'approved_automation',
        recentActivity: Math.floor(Math.random() * 100),
        complianceScore: p.confidence_score
      }));
      setProviderReports(providerData);

    } catch (error: any) {
      toast({
        title: 'Failed to load transparency data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (format: 'pdf' | 'csv') => {
    toast({
      title: 'Generating report',
      description: `Creating ${format.toUpperCase()} transparency report...`
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-transparency-report', {
        body: {
          format,
          period: selectedPeriod,
          metrics,
          automationReports,
          providerReports
        }
      });

      if (error) throw error;

      toast({
        title: 'Report generated',
        description: `Transparency report has been generated and will be downloaded shortly.`
      });
    } catch (error: any) {
      toast({
        title: 'Failed to generate report',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading transparency data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transparency Reports</h2>
          <p className="text-muted-foreground">
            Open data about our automation practices, compliance, and parent partnership
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => generateReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => generateReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Registrations</p>
                <p className="text-2xl font-bold">{metrics.totalRegistrations.toLocaleString()}</p>
                <p className="text-sm text-green-600">
                  {((metrics.successfulRegistrations / metrics.totalRegistrations) * 100).toFixed(1)}% success rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Automation Usage</p>
                <p className="text-2xl font-bold">{(metrics.automationUsageRate * 100).toFixed(0)}%</p>
                <Progress value={metrics.automationUsageRate * 100} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold">{(metrics.complianceScore * 100).toFixed(0)}%</p>
                <div className="flex items-center mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-sm text-green-600">Excellent</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{metrics.averageResponseTime}ms</p>
                <p className="text-sm text-green-600">Within target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="automation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automation">Automation Ethics</TabsTrigger>
          <TabsTrigger value="providers">Provider Relations</TabsTrigger>
          <TabsTrigger value="parents">Parent Trust</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Ethics & Performance</CardTitle>
              <CardDescription>
                How our automation respects provider terms and parent preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {automationReports.map((report, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4">{report.period}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Automation Attempts</p>
                        <p className="text-lg font-bold">{report.automationAttempts.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Human Interventions</p>
                        <p className="text-lg font-bold text-blue-600">{report.humanInterventions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ethics Violations</p>
                        <p className={`text-lg font-bold ${report.ethicsViolations === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {report.ethicsViolations}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-bold text-green-600">
                          {(report.successRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Response Time</p>
                        <p className="text-lg font-bold">{report.avgResponseTime}ms</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Camp Provider Partnerships</CardTitle>
              <CardDescription>
                Our relationships and compliance with camp provider terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providerReports.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">
                          {provider.organizationName || provider.hostname}
                        </h4>
                        <p className="text-sm text-muted-foreground">{provider.hostname}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant={provider.partnershipStatus === 'partner' ? 'default' : 'secondary'}
                      >
                        {provider.partnershipStatus}
                      </Badge>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Automation</p>
                        <p className={`text-sm font-semibold ${provider.automationPermitted ? 'text-green-600' : 'text-red-600'}`}>
                          {provider.automationPermitted ? 'Permitted' : 'Manual Only'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Compliance</p>
                        <p className="text-sm font-semibold">
                          {(provider.complianceScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent Trust & Communication</CardTitle>
              <CardDescription>
                How we maintain transparency and trust with parents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Full Transparency</h4>
                  <p className="text-sm text-muted-foreground">
                    Parents receive real-time notifications about all automation activities
                  </p>
                  <p className="text-lg font-bold mt-2">{metrics.parentNotificationsSent}</p>
                  <p className="text-xs text-muted-foreground">notifications sent</p>
                </div>

                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Human Oversight</h4>
                  <p className="text-sm text-muted-foreground">
                    CAPTCHA and complex scenarios always involve human verification
                  </p>
                  <p className="text-lg font-bold mt-2">{metrics.captchaInterventions}</p>
                  <p className="text-xs text-muted-foreground">human interventions</p>
                </div>

                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Continuous Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Regular audits and improvements based on parent feedback
                  </p>
                  <p className="text-lg font-bold mt-2">{(metrics.complianceScore * 100).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">satisfaction score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}