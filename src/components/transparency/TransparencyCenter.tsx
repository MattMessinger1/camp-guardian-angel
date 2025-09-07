/**
 * Day 6: Transparency Center Component
 * 
 * Central hub for transparency features:
 * - Parent activity reports
 * - System performance insights  
 * - Privacy and compliance information
 * - Public bot information access
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  FileText, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  BarChart3,
  Users,
  Lock,
  Globe,
  Info
} from 'lucide-react';
import { transparencyReportManager, TransparencyReport } from '@/lib/transparency/TransparencyReportManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TransparencyCenterProps {
  userId?: string;
  className?: string;
}

export default function TransparencyCenter({ userId, className }: TransparencyCenterProps) {
  const { toast } = useToast();
  const [reports, setReports] = useState<TransparencyReport[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadTransparencyData();
  }, [userId]);

  const loadTransparencyData = async () => {
    try {
      setLoading(true);
      
      const [reportsData, summaryData] = await Promise.all([
        userId ? transparencyReportManager.getUserReports(userId) : [],
        transparencyReportManager.getTransparencySummary(userId)
      ]);

      setReports(reportsData);
      setSummary(summaryData);
    } catch (error) {
      toast({
        title: "Error loading transparency data",
        description: "Unable to load transparency information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string, periodDays: number = 30) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate transparency reports.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGenerating(true);
      
      const options = {
        report_type: reportType,
        period_days: periodDays,
        privacy_level: 'standard' as const
      };

      let report: TransparencyReport | null = null;

      switch (reportType) {
        case 'parent_activity':
          report = await transparencyReportManager.generateParentReport(userId, options);
          break;
        case 'system_performance':
          report = await transparencyReportManager.generatePublicReport(options);
          break;
        default:
          throw new Error('Unknown report type');
      }

      if (report) {
        toast({
          title: "Report generated successfully",
          description: "Your transparency report is ready for download."
        });
        loadTransparencyData();
      } else {
        throw new Error('Report generation failed');
      }
    } catch (error) {
      toast({
        title: "Report generation failed",
        description: "Unable to generate the requested report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string, accessToken?: string) => {
    try {
      const result = await transparencyReportManager.downloadReport(reportId, accessToken);
      
      if (result.success && result.report) {
        // Create downloadable JSON file
        const dataStr = JSON.stringify(result.report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `transparency-report-${result.report.report_type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Report downloaded",
          description: "Transparency report has been downloaded successfully."
        });
        
        loadTransparencyData();
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download the report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'parent_activity': return <Users className="h-4 w-4" />;
      case 'provider_interactions': return <Globe className="h-4 w-4" />;
      case 'system_performance': return <BarChart3 className="h-4 w-4" />;
      case 'compliance_summary': return <Shield className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'parent_activity': return 'Parent Activity Report';
      case 'provider_interactions': return 'Provider Interactions';
      case 'system_performance': return 'System Performance';
      case 'compliance_summary': return 'Compliance Summary';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Transparency Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Reports Generated</p>
                <p className="text-2xl font-bold">{summary.total_reports_generated || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Downloads</p>
                <p className="text-2xl font-bold text-blue-600">{summary.total_downloads || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Privacy Protections</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.privacy_protections_active?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Compliance Frameworks</p>
                <p className="text-2xl font-bold text-purple-600">
                  {summary.compliance_frameworks?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transparency Tabs */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="generate">Generate New Report</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Compliance</TabsTrigger>
          <TabsTrigger value="public">Public Information</TabsTrigger>
        </TabsList>

        {/* My Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Transparency Reports</CardTitle>
              <CardDescription>
                Access and download your personal transparency reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getReportTypeIcon(report.report_type)}
                      <div>
                        <h4 className="font-semibold">{getReportTypeName(report.report_type)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.report_period_start).toLocaleDateString()} - {new Date(report.report_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        <Eye className="h-3 w-3 mr-1" />
                        {report.download_count} downloads
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => downloadReport(report.id, report.access_token)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transparency reports generated yet.</p>
                    <p className="text-sm">Generate your first report to see your activity summary.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate New Report Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Transparency Report</CardTitle>
              <CardDescription>
                Create detailed reports about your registration activity and our system performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold">Personal Activity Report</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Detailed summary of your registration attempts, success rates, and privacy protections applied.
                      </p>
                      <div className="space-y-2">
                        <Select defaultValue="30">
                          <SelectTrigger>
                            <SelectValue placeholder="Select time period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full" 
                          onClick={() => generateReport('parent_activity', 30)}
                          disabled={generating || !userId}
                        >
                          {generating ? 'Generating...' : 'Generate Personal Report'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">System Performance Report</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Public performance metrics, ethical guidelines, and system transparency information.
                      </p>
                      <div className="space-y-2">
                        <Select defaultValue="30">
                          <SelectTrigger>
                            <SelectValue placeholder="Select time period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => generateReport('system_performance', 30)}
                          disabled={generating}
                        >
                          {generating ? 'Generating...' : 'Generate System Report'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Compliance Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Protections & Compliance</CardTitle>
              <CardDescription>
                Information about how we protect your privacy and maintain compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Active Privacy Protections
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.privacy_protections_active?.map((protection: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{protection}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance Frameworks
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.compliance_frameworks?.map((framework: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{framework}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2">Your Data Rights</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Right to access your personal data through transparency reports</li>
                  <li>• Right to rectification of inaccurate data</li>
                  <li>• Right to erasure (right to be forgotten)</li>
                  <li>• Right to data portability in machine-readable format</li>
                  <li>• Right to object to automated processing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Information Tab */}
        <TabsContent value="public" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public Bot Information</CardTitle>
              <CardDescription>
                Transparent information about our automated registration system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">How Our System Works</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Automated form filling with parent-provided information</li>
                    <li>• Real-time monitoring of registration openings</li>
                    <li>• CAPTCHA detection with human assistance requests</li>
                    <li>• Respectful rate limiting to avoid server overload</li>
                    <li>• Compliance checking before every action</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Ethical Guidelines</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Always respect website terms of service</li>
                    <li>• Require explicit parent consent for all actions</li>
                    <li>• Maintain transparency about automation activities</li>
                    <li>• Provide human oversight for complex scenarios</li>
                    <li>• Actively seek partnerships with camp providers</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h5 className="font-semibold text-green-900 mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Contact Information
                </h5>
                <p className="text-sm text-green-800 mb-2">
                  For camp providers interested in partnerships or parents with questions about our automation:
                </p>
                <div className="text-sm text-green-800">
                  <p>Email: partnerships@campregistration.com</p>
                  <p>Support: help@campregistration.com</p>
                  <p>Compliance: compliance@campregistration.com</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}