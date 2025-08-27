import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export const IntelligentModelTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [formComplexity, setFormComplexity] = useState('5');
  const [urgency, setUrgency] = useState('normal');
  const [costConstraint, setCostConstraint] = useState('medium');
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<string>('');
  const { toast } = useToast();

  const simulateRegistrationScenario = async () => {
    setIsRunning(true);
    setTestResults('');

    try {
      // Step 1: Get optimal model recommendation
      const { data: selection, error: selectionError } = await supabase.functions.invoke('intelligent-model-selector', {
        body: {
          action: 'select_model',
          context: {
            taskType: 'vision_analysis',
            formComplexity: parseInt(formComplexity),
            campProvider: 'test-ymca',
            urgency,
            costConstraint
          }
        }
      });

      if (selectionError) {
        throw new Error(`Model selection failed: ${selectionError.message}`);
      }

      setSelectedModel(selection.selectedModel);
      setTestResults(`🤖 Selected Model: ${selection.selectedModel.name}\n\n` +
        `📊 Selection Reasoning:\n` +
        `- Form Complexity: ${selection.reasoning.formComplexity}\n` +
        `- Needs Reasoning: ${selection.reasoning.needsReasoning}\n` +
        `- Urgency: ${selection.reasoning.urgency}\n` +
        `- Cost Constraint: ${selection.reasoning.costConstraint}\n\n` +
        `🏆 Alternative Models:\n` +
        selection.alternativeModels.map((alt: any) => 
          `- ${alt.model} (Score: ${alt.score.toFixed(2)})`
        ).join('\n') + '\n\n'
      );

      // Step 2: Simulate using the model for vision analysis
      const startTime = Date.now();
      const { data: visionData, error: visionError } = await supabase.functions.invoke('test-vision-analysis', {
        body: {
          screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          sessionId: `intelligent-test-${Date.now()}`,
          model: selection.selectedModel.id
        }
      });

      const responseTime = Date.now() - startTime;
      const success = !visionError;
      const signupSuccessful = success && Math.random() > 0.3; // Simulate 70% signup success rate

      setTestResults(prev => prev + 
        `🔍 Vision Analysis Results:\n` +
        `- Success: ${success ? '✅' : '❌'}\n` +
        `- Response Time: ${responseTime}ms\n` +
        `- Signup Successful: ${signupSuccessful ? '✅' : '❌'}\n\n`
      );

      // Step 3: Record the outcome for learning
      await supabase.functions.invoke('intelligent-model-selector', {
        body: {
          action: 'record_outcome',
          context: {
            modelId: selection.selectedModel.id,
            taskType: 'vision_analysis',
            success,
            responseTime,
            errorMessage: visionError?.message,
            signupSuccessful,
            metadata: {
              formComplexity: parseInt(formComplexity),
              urgency,
              costConstraint,
              testScenario: true
            }
          }
        }
      });

      setTestResults(prev => prev + 
        `📈 Learning Update:\n` +
        `- Model performance recorded\n` +
        `- System will improve future selections\n` +
        `- Success rate updated for ${selection.selectedModel.name}\n\n`
      );

      toast({
        title: "Intelligent Model Test Complete",
        description: `Used ${selection.selectedModel.name} with ${success ? 'success' : 'failure'}`,
      });

    } catch (error) {
      setTestResults(prev => prev + `❌ Error: ${error}\n`);
      toast({
        title: "Test Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('intelligent-model-selector', {
        body: {
          action: 'get_performance',
          context: {
            taskType: 'vision_analysis',
            timeRange: '7d'
          }
        }
      });

      if (error) {
        throw new Error(`Failed to load performance: ${error.message}`);
      }

      setPerformance(data.performance);
      toast({
        title: "Performance Data Loaded",
        description: `Found ${data.performance.length} model performance records`,
      });
    } catch (error) {
      toast({
        title: "Failed to Load Performance",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧠 Intelligent Model Selection System</CardTitle>
        <CardDescription>
          Dynamic AI model selection that learns from signup success rates and optimizes for conversion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Form Complexity (1-10)</label>
            <Select value={formComplexity} onValueChange={setFormComplexity} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num <= 3 ? '(Simple)' : num <= 7 ? '(Medium)' : '(Complex)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Task Urgency</label>
            <Select value={urgency} onValueChange={setUrgency} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Cost Constraint</label>
            <Select value={costConstraint} onValueChange={setCostConstraint} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Budget</SelectItem>
                <SelectItem value="medium">Medium Budget</SelectItem>
                <SelectItem value="high">High Budget</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={simulateRegistrationScenario} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running Intelligent Test...' : '🎯 Simulate Registration Scenario'}
          </Button>
          
          <Button 
            onClick={loadPerformanceData} 
            disabled={isRunning}
            variant="outline"
            className="w-full"
          >
            📊 Load Model Performance Data
          </Button>
        </div>

        {/* How It Works */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">🔬 How Intelligent Selection Works:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
            <li><strong>Context Analysis:</strong> Considers form complexity, urgency, cost constraints</li>
            <li><strong>Historical Performance:</strong> Uses past signup success rates per model</li>
            <li><strong>Dynamic Scoring:</strong> Combines capabilities + performance + context</li>
            <li><strong>Continuous Learning:</strong> Records outcomes to improve future selections</li>
            <li><strong>Signup Optimization:</strong> Prioritizes models that drive successful signups</li>
          </ul>
        </div>

        {/* Selected Model Display */}
        {selectedModel && (
          <div className="p-4 border rounded-lg bg-green-50">
            <h4 className="font-medium mb-2">🤖 Currently Selected Model:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Model:</strong> {selectedModel.name}</p>
                <p><strong>Provider:</strong> {selectedModel.provider}</p>
                <p><strong>Speed:</strong> {selectedModel.capabilities.speed}</p>
              </div>
              <div>
                <p><strong>Cost:</strong> {selectedModel.capabilities.cost}</p>
                <p><strong>Accuracy:</strong> {selectedModel.capabilities.accuracy}</p>
                <p><strong>Reasoning:</strong> {selectedModel.capabilities.reasoning ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div className="space-y-2">
            <h4 className="font-medium">📋 Test Results:</h4>
            <Textarea
              value={testResults}
              readOnly
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
        )}

        {/* Performance Data */}
        {performance.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">📈 Model Performance Metrics (Last 7 Days):</h4>
            <div className="grid gap-3">
              {performance.map((perf, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{perf.model_id}</h5>
                    <div className="flex gap-2">
                      <Badge variant={perf.signup_success_rate > 0.7 ? 'default' : 'secondary'}>
                        {(perf.signup_success_rate * 100).toFixed(1)}% Signup Success
                      </Badge>
                      <Badge variant="outline">
                        {perf.total_attempts} attempts
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div>Success Rate: {(perf.success_rate * 100).toFixed(1)}%</div>
                    <div>Avg Response: {perf.avg_response_time}ms</div>
                    <div>Error Rate: {(perf.error_rate * 100).toFixed(1)}%</div>
                    <div>Last Used: {new Date(perf.last_used_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production Benefits */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-900">🚀 Production Benefits:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <ul className="space-y-1 list-disc list-inside">
              <li>Automatically chooses best model for each signup scenario</li>
              <li>Learns from actual signup success/failure outcomes</li>
              <li>Optimizes for conversion rates, not just technical metrics</li>
            </ul>
            <ul className="space-y-1 list-disc list-inside">
              <li>Reduces costs by using simpler models when effective</li>
              <li>Improves speed by avoiding over-powered models</li>
              <li>Continuously adapts as new models become available</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};