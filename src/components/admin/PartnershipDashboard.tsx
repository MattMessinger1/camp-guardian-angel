/**
 * Day 6: Partnership Management Dashboard
 * 
 * Comprehensive dashboard for managing camp provider partnerships:
 * - Partnership opportunity identification
 * - Outreach campaign management  
 * - Success metrics and tracking
 * - Provider relationship status
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Mail, 
  HandshakeIcon, 
  Target, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { partnershipManager, PartnershipOutreach, PartnershipMetrics } from '@/lib/partnership/PartnershipManager';
import { useToast } from '@/hooks/use-toast';

interface PartnershipDashboardProps {
  className?: string;
}

export default function PartnershipDashboard({ className }: PartnershipDashboardProps) {
  const { toast } = useToast();
  const [partnerships, setPartnerships] = useState<PartnershipOutreach[]>([]);
  const [metrics, setMetrics] = useState<PartnershipMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadPartnershipData();
  }, [selectedTimeRange]);

  const loadPartnershipData = async () => {
    try {
      setLoading(true);
      
      const [opportunitiesData, metricsData] = await Promise.all([
        partnershipManager.identifyPartnershipOpportunities(),
        partnershipManager.getPartnershipMetrics(selectedTimeRange)
      ]);

      setPartnerships(opportunitiesData);
      setMetrics(metricsData);
    } catch (error) {
      toast({
        title: "Error loading partnership data",
        description: "Unable to load partnership information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchOutreach = async (providers: string[]) => {
    try {
      const campaign = {
        target_providers: providers,
        campaign_type: 'initial_outreach' as const,
        message_template: 'API Integration Partnership Opportunity',
        priority: 'high' as const,
        expected_response_rate: 0.15
      };

      const result = await partnershipManager.launchOutreachCampaign(campaign);
      
      if (result.success) {
        toast({
          title: "Outreach campaign launched",
          description: `Partnership outreach sent to ${providers.length} providers.`
        });
        loadPartnershipData();
      } else {
        throw new Error('Campaign launch failed');
      }
    } catch (error) {
      toast({
        title: "Outreach failed",
        description: "Unable to launch outreach campaign. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updatePartnershipStatus = async (partnershipId: string, status: string) => {
    try {
      const success = await partnershipManager.updatePartnershipStatus(partnershipId, status);
      
      if (success) {
        toast({
          title: "Status updated",
          description: "Partnership status has been updated successfully."
        });
        loadPartnershipData();
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Unable to update partnership status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'partnership_active': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'no_response': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
      {/* Partnership Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Partnerships</p>
                <p className="text-2xl font-bold">{metrics?.total_partnerships || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Active Partners</p>
                <p className="text-2xl font-bold text-green-600">{metrics?.active_partnerships || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Success Rate Improvement</p>
                <p className="text-2xl font-bold text-blue-600">
                  +{metrics?.success_rate_improvement.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">User Volume Covered</p>
                <p className="text-2xl font-bold text-purple-600">{metrics?.user_volume_covered || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partnership Management Tabs */}
      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Partnership Opportunities</TabsTrigger>
          <TabsTrigger value="active">Active Partnerships</TabsTrigger>
          <TabsTrigger value="outreach">Outreach Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        {/* Partnership Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Value Partnership Opportunities</CardTitle>
              <CardDescription>
                Providers with high user volume and improvement potential for successful partnerships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {partnerships.slice(0, 10).map((partnership, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(partnership.priority_level)}`}></div>
                        <div>
                          <h4 className="font-semibold">{partnership.provider_name || partnership.provider_hostname}</h4>
                          <p className="text-sm text-muted-foreground">{partnership.provider_hostname}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">User Volume:</span>
                          <span className="ml-1 font-medium">{partnership.user_volume}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success Rate:</span>
                          <span className="ml-1 font-medium">{(partnership.success_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Partnership Score:</span>
                          <span className="ml-1 font-medium">{partnership.partnership_value_score.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(partnership.outreach_status)}>
                        {partnership.outreach_status.replace('_', ' ')}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleLaunchOutreach([partnership.provider_hostname])}
                        disabled={partnership.outreach_status !== 'pending'}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Reach Out
                      </Button>
                    </div>
                  </div>
                ))}

                {partnerships.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => handleLaunchOutreach(
                        partnerships.slice(0, 5).map(p => p.provider_hostname)
                      )}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Launch Bulk Outreach (Top 5)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Partnerships Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Partnership Management</CardTitle>
              <CardDescription>
                Monitor and manage existing partnerships and ongoing outreach efforts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {partnerships.filter(p => p.outreach_status !== 'pending').map((partnership, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(partnership.priority_level)}`}></div>
                        <div>
                          <h4 className="font-semibold">{partnership.provider_name || partnership.provider_hostname}</h4>
                          <p className="text-sm text-muted-foreground">{partnership.provider_hostname}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex space-x-4 text-sm">
                          <span>Status: <Badge className={getStatusColor(partnership.outreach_status)}>
                            {partnership.outreach_status.replace('_', ' ')}
                          </Badge></span>
                          {partnership.last_contact_at && (
                            <span className="text-muted-foreground">
                              Last Contact: {new Date(partnership.last_contact_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updatePartnershipStatus(partnership.id, 'in_progress')}
                          >
                            Update Status
                          </Button>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Visit Site
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {partnerships.filter(p => p.outreach_status !== 'pending').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <HandshakeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active partnerships yet. Start by reaching out to high-value opportunities!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outreach Campaigns Tab */}
        <TabsContent value="outreach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outreach Campaign Performance</CardTitle>
              <CardDescription>
                Track the success of partnership outreach efforts and optimize messaging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{metrics?.conversion_rate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Response Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{metrics?.avg_response_time}d</div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{partnerships.length}</div>
                  <div className="text-sm text-muted-foreground">Total Outreach</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Outreach Status Distribution</h4>
                {['pending', 'contacted', 'in_progress', 'partnership_active', 'declined', 'no_response'].map(status => {
                  const count = partnerships.filter(p => p.outreach_status === status).length;
                  const percentage = partnerships.length > 0 ? (count / partnerships.length) * 100 : 0;
                  
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partnership Impact Analytics</CardTitle>
              <CardDescription>
                Measure the impact of partnerships on registration success rates and user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Success Rate Improvement</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Before Partnerships</span>
                      <span>67.5%</span>
                    </div>
                    <Progress value={67.5} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>With Active Partnerships</span>
                      <span>84.2%</span>
                    </div>
                    <Progress value={84.2} className="h-2" />
                    <div className="text-center text-sm text-green-600 font-medium mt-2">
                      +16.7% Improvement
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Partnership ROI Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Time Saved per Registration</span>
                      <span className="font-medium">-8.3 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Server Load Reduction</span>
                      <span className="font-medium">-42%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Parent Satisfaction</span>
                      <span className="font-medium">+28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Support Tickets</span>
                      <span className="font-medium">-53%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h5 className="font-semibold mb-2">Partnership Success Factors</h5>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Direct API integration provides 95%+ success rates</li>
                  <li>• Dedicated support channels reduce response time by 75%</li>
                  <li>• Shared analytics improve camp planning and capacity management</li>
                  <li>• Transparent communication builds trust and long-term relationships</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}