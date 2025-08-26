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
          <h1 className="text-3xl font-bold mb-2">YMCA Real Registration Test</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test the complete signup automation system with real YMCA registration forms.
            This validates our Browserbase integration and form analysis capabilities.
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
            <li>• Creates real browser sessions using Browserbase API</li>
            <li>• Navigates to actual YMCA registration pages</li>
            <li>• Extracts real form data and page structure</li>
            <li>• Logs all activities to compliance_audit table</li>
            <li>• Respects TOS compliance and rate limiting</li>
            <li>• Uses Eastern Time for Florida YMCA business hours</li>
          </ul>
        </div>
      </div>
    </StandardPage>
  );
}