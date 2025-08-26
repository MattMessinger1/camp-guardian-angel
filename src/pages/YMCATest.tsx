import React from 'react';
import { YMCATestRunner } from '@/components/YMCATestRunner';
import { SSLTestRunner } from '@/components/SSLTestRunner';
import { BrowserbaseConnectionTest } from '@/components/BrowserbaseConnectionTest';
import { StandardPage } from '@/components/StandardPage';

export default function YMCATest() {
  const handleTestComplete = (result: any) => {
    console.log('YMCA Test completed:', result);
  };

  return (
    <StandardPage pageName="YMCA Test" currentRoute="/ymca-test">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">YMCA Registration Test (Simulation)</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test the complete signup automation system with simulated YMCA registration forms.
            This validates our automation workflow and business logic without external dependencies.
          </p>
        </div>
        
        <div className="grid gap-8">
          <BrowserbaseConnectionTest />
          <SSLTestRunner />
          <YMCATestRunner onTestComplete={handleTestComplete} />
        </div>
        
        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Test Information</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Creates simulated browser sessions for testing</li>
            <li>• Navigates to YMCA registration pages (simulated)</li>
            <li>• Extracts mock form data and page structure</li>
            <li>• Demonstrates complete automation workflow</li>
            <li>• Validates business logic and compliance checking</li>
            <li>• Ready for real Browserbase integration</li>
          </ul>
        </div>
      </div>
    </StandardPage>
  );
}