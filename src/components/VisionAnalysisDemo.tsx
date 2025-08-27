import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { analyzePageWithVision, testVisionAnalysis, analyzePageWithIntelligentModel } from '@/utils/visionAnalysis';

export const VisionAnalysisDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string>('');
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const runStep2_1Test = async () => {
    setIsRunning(true);
    setResults('');
    
    try {
      setResults('🧪 Testing Step 2.1:\n// Test vision analysis with mock screenshot\nconst testScreenshot = "base64encodedimage";\nconst analysis = await analyzePageWithVision(testScreenshot, "test-session");\nconsole.log(\'Vision analysis:\', analysis);\n\n');
      
      // Run the actual test
      const analysis = await testVisionAnalysis();
      
      setAnalysis(analysis);
      setResults(prev => prev + 
        `✅ Test Passed!\n\n` +
        `Accessibility Analysis Results:\n` +
        `- Accessibility Complexity: ${analysis.accessibilityComplexity || 'N/A'}/10\n` +
        `- WCAG Compliance Score: ${analysis.wcagComplianceScore || 'N/A'}\n` +
        `- Assessment: ${analysis.complianceAssessment ? analysis.complianceAssessment.substring(0, 100) + '...' : 'N/A'}\n` +
        `- Interface Structure: ${analysis.interfaceStructure ? JSON.stringify(analysis.interfaceStructure).substring(0, 100) + '...' : 'N/A'}\n`
      );

      toast({
        title: "Vision Analysis Test Passed!",
        description: "Step 2.1 test completed successfully",
      });

    } catch (error) {
      setResults(prev => prev + `❌ Test Failed: ${error}\n`);
      toast({
        title: "Test Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runIntelligentAnalysis = async () => {
    setIsRunning(true);
    setResults('');
    
    try {
      setResults('🤖 Testing Intelligent Model Selection:\n// Analyze with automatic model selection\nconst analysis = await analyzePageWithIntelligentModel(screenshot, sessionId, context);\n\n');
      
      // Create a clean accessibility test form screenshot
      const mockFormScreenshot = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect width="100%" height="100%" fill="#f8f9fa"/>
          <text x="50" y="50" font-family="Arial" font-size="24" fill="#333">Registration Form</text>
          <rect x="50" y="80" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="100" font-family="Arial" font-size="12" fill="#666">Child Name *</text>
          <rect x="50" y="120" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="140" font-family="Arial" font-size="12" fill="#666">Parent Email *</text>
          <rect x="50" y="160" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="180" font-family="Arial" font-size="12" fill="#666">Phone Number *</text>
          <rect x="50" y="200" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="220" font-family="Arial" font-size="12" fill="#666">Emergency Contact</text>
          <rect x="50" y="240" width="300" height="60" fill="white" stroke="#ddd"/>
          <text x="55" y="260" font-family="Arial" font-size="12" fill="#666">Medical Information</text>
          <rect x="50" y="320" width="150" height="30" fill="#28a745" stroke="#1e7e34"/>
          <text x="110" y="340" font-family="Arial" font-size="12" fill="white">Submit</text>
          <text x="50" y="380" font-family="Arial" font-size="10" fill="#dc3545">* Required fields</text>
        </svg>
      `);

      const analysis = await analyzePageWithIntelligentModel(
        mockFormScreenshot,
        `intelligent-test-${Date.now()}`,
        {
          formComplexity: 8, // Complex form
          urgency: 'high',
          costConstraint: 'medium'
        }
      );
      
      setAnalysis(analysis);
      setResults(prev => prev + 
        `✅ Accessibility Analysis Complete!\n\n` +
        `WCAG Compliance Results:\n` +
        `- Accessibility Complexity: ${analysis.accessibilityComplexity || 'N/A'}/10\n` +
        `- WCAG Compliance Score: ${analysis.wcagComplianceScore || 'N/A'}\n` +
        `- Compliance Assessment: ${analysis.complianceAssessment ? analysis.complianceAssessment.substring(0, 100) + '...' : 'N/A'}\n` +
        `- Interface Structure: ${analysis.interfaceStructure ? JSON.stringify(analysis.interfaceStructure).substring(0, 100) + '...' : 'N/A'}\n`
      );

      toast({
        title: "Intelligent Analysis Complete!",
        description: "Model automatically selected and analysis completed",
      });

    } catch (error) {
      setResults(prev => prev + `❌ Test Failed: ${error}\n`);
      toast({
        title: "Test Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>📸 Vision Analysis Demo</CardTitle>
        <CardDescription>
          Test the vision analysis functions that are expected by your test suite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={runStep2_1Test} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running...' : '🧪 Run Step 2.1 Test'}
          </Button>
          
          <Button 
            onClick={runIntelligentAnalysis} 
            disabled={isRunning}
            variant="outline"
            className="w-full"
          >
            {isRunning ? 'Running...' : '🤖 Test Intelligent Analysis'}
          </Button>
        </div>

        {/* What These Tests Do */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">🔬 Test Functions Available:</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><code>analyzePageWithVision(screenshot, sessionId, model?)</code> - Basic vision analysis</p>
            <p><code>testVisionAnalysis()</code> - Quick test with mock data</p>
            <p><code>analyzePageWithIntelligentModel(screenshot, sessionId, context?)</code> - AI-powered model selection</p>
          </div>
        </div>

        {/* Test Results */}
        {results && (
          <div className="space-y-2">
            <h4 className="font-medium">📋 Test Results:</h4>
            <Textarea
              value={results}
              readOnly
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
        )}

        {/* Analysis Details */}
        {analysis && (
          <div className="p-4 border rounded-lg bg-green-50">
            <h4 className="font-medium mb-2">🔍 Analysis Details:</h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}

        {/* Usage Example */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-900">💡 Usage in Your Code:</h4>
          <pre className="text-xs text-blue-800 bg-white p-3 rounded border">
{`// Import the function
import { analyzePageWithVision } from '@/utils/visionAnalysis';

// Testing Step 2.1:
const testScreenshot = "base64encodedimage";
const analysis = await analyzePageWithVision(testScreenshot, "test-session");
console.log('Vision analysis:', analysis);

// With intelligent model selection:
const smartAnalysis = await analyzePageWithIntelligentModel(
  screenshot, 
  sessionId, 
  { formComplexity: 8, urgency: 'high' }
);`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};