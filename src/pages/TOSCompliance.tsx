import React from 'react';
import { StandardPage } from '@/components/StandardPage';
import { TOSComplianceChecker } from '@/components/TOSComplianceChecker';
import { PartnershipManager } from '@/components/PartnershipManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Eye, 
  Building2, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Info
} from 'lucide-react';

export default function TOSCompliancePage() {
  return (
    <StandardPage 
      title="TOS Compliance System" 
      description="Intelligent Terms of Service compliance monitoring for camp provider automation"
      pageName="TOS Compliance"
      currentRoute="/tos-compliance"
    >
      <div className="space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Three-Tier Classification
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-700">Green:</span>
                  <span>Proceed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700">Yellow:</span>
                  <span>Review</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700">Red:</span>
                  <span>Block</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI-Powered Analysis
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">GPT-5</div>
                <p className="text-xs text-muted-foreground">
                  Context-aware TOS analysis with confidence scoring and risk assessment
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Partnership Tracking
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">
                  Initial camp providers with relationship management
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Overview */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Ethical Automation Framework:</strong> This system helps ensure that camp registration automation respects Terms of Service and builds positive relationships with camp providers. It combines robots.txt compliance, AI-powered TOS analysis, and partnership management to maintain ethical automation practices.
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs defaultValue="checker" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checker" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              TOS Checker
            </TabsTrigger>
            <TabsTrigger value="partnerships" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partnerships
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checker" className="space-y-6">
            <TOSComplianceChecker />
            
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Our intelligent TOS compliance system uses multiple analysis layers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Analysis Components</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Robots.txt Check:</strong> Verifies if automated access is allowed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Pattern Recognition:</strong> Identifies common automation restriction patterns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>AI Analysis:</strong> GPT-5 powered contextual understanding of TOS language</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Partnership Status:</strong> Considers existing relationships and approvals</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Decision Framework</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Green Status:</strong> Official partnerships or permissive TOS policies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Yellow Status:</strong> Unclear policies requiring human review</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Red Status:</strong> Clear restrictions or rejected partnerships</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Confidence Scoring:</strong> AI-generated confidence levels for all decisions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partnerships" className="space-y-6">
            <PartnershipManager />
            
            <Card>
              <CardHeader>
                <CardTitle>Partnership Benefits</CardTitle>
                <CardDescription>
                  Building relationships with camp providers for mutual benefit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">For Camp Providers</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Faster camp registrations and higher fill rates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Reduced burden on customer service teams</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Official API integrations and technical support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Transparency and ethical automation practices</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">For Our Service</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Reliable access and reduced blocking risks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Better success rates for parent registrations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Access to real-time availability data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Industry reputation and trust building</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>TOS Change Monitoring</CardTitle>
                <CardDescription>
                  Automated monitoring system tracks changes to camp provider Terms of Service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      The monitoring system automatically checks TOS changes on a scheduled basis and uses AI to analyze the impact on automation policies.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Scheduled Monitoring</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span>Active.com:</span>
                            <span className="font-medium">Monthly</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CampWise:</span>
                            <span className="font-medium">Weekly</span>
                          </div>
                          <div className="flex justify-between">
                            <span>YMCA:</span>
                            <span className="font-medium">Monthly</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Change Detection</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ul className="text-sm space-y-1">
                          <li>• Content hash comparison</li>
                          <li>• AI-powered impact analysis</li>
                          <li>• Significance classification</li>
                          <li>• Automated notifications</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Response Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ul className="text-sm space-y-1">
                          <li>• Continue automation</li>
                          <li>• Manual review required</li>
                          <li>• Pause operations</li>
                          <li>• Contact provider</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Confidence Scoring</CardTitle>
                <CardDescription>
                  AI-powered confidence metrics for automation decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Confidence Levels</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">90-100%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-green-200 rounded-full">
                              <div className="w-full h-2 bg-green-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-green-700">Extremely Clear</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">70-89%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-blue-200 rounded-full">
                              <div className="w-4/5 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-blue-700">Clear Indicators</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">50-69%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-yellow-200 rounded-full">
                              <div className="w-3/5 h-2 bg-yellow-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-yellow-700">Some Ambiguity</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">30-49%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-orange-200 rounded-full">
                              <div className="w-2/5 h-2 bg-orange-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-orange-700">Conflicting Signals</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">10-29%</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-red-200 rounded-full">
                              <div className="w-1/5 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-red-700">Minimal Evidence</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Scoring Factors</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                          <span><strong>AI Analysis Confidence:</strong> GPT-5 certainty in TOS interpretation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                          <span><strong>Pattern Match Strength:</strong> Clarity of automation policy language</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                          <span><strong>Partnership Verification:</strong> Relationship status and communication history</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                          <span><strong>Historical Consistency:</strong> Stability of policies over time</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StandardPage>
  );
}