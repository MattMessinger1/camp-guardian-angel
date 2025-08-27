import { expect } from '@playwright/test';

/**
 * Mock screenshot data for testing vision analysis
 */
export const mockScreenshots = {
  simpleForm: `data:image/svg+xml;base64,${btoa(`
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f8f9fa"/>
      <text x="50" y="50" font-family="Arial" font-size="24">Registration Form</text>
      <rect x="50" y="100" width="300" height="40" fill="white" stroke="#ccc"/>
      <text x="60" y="125" font-family="Arial" font-size="14">First Name</text>
      <rect x="50" y="160" width="300" height="40" fill="white" stroke="#ccc"/>
      <text x="60" y="185" font-family="Arial" font-size="14">Last Name</text>
      <rect x="50" y="220" width="150" height="40" fill="#007bff" stroke="none"/>
      <text x="110" y="245" font-family="Arial" font-size="14" fill="white">Submit</text>
    </svg>
  `)}`,
  
  complexForm: `data:image/svg+xml;base64,${btoa(`
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="800" fill="#ffffff"/>
      <text x="50" y="30" font-family="Arial" font-size="20">Complex Registration Form</text>
      <!-- Multiple form fields -->
      <rect x="50" y="60" width="300" height="30" fill="white" stroke="#999"/>
      <rect x="50" y="100" width="300" height="30" fill="white" stroke="#999"/>
      <rect x="50" y="140" width="300" height="30" fill="white" stroke="#999"/>
      <rect x="50" y="180" width="300" height="30" fill="white" stroke="#999"/>
      <!-- CAPTCHA-like element -->
      <rect x="50" y="250" width="200" height="80" fill="#f0f0f0" stroke="#333"/>
      <text x="60" y="275" font-family="Arial" font-size="12">Please verify you are human</text>
      <text x="60" y="295" font-family="Arial" font-size="10">Enter code: ABC123</text>
      <rect x="50" y="300" width="100" height="25" fill="white" stroke="#333"/>
    </svg>
  `)}`
};

/**
 * Expected responses for mock screenshots
 */
export const expectedResponses = {
  simpleForm: {
    accessibilityComplexity: expect.any(Number),
    wcagComplianceScore: expect.any(Number),
    complianceAssessment: expect.any(String),
    interfaceStructure: expect.any(String)
  },
  
  complexForm: {
    accessibilityComplexity: expect.any(Number),
    wcagComplianceScore: expect.any(Number), 
    complianceAssessment: expect.any(String),
    interfaceStructure: expect.any(String)
  }
};

/**
 * Mock Supabase edge function responses
 */
export const mockEdgeFunctionResponse = (success: boolean = true, data?: any) => ({
  data: success ? (data || expectedResponses.simpleForm) : null,
  error: success ? null : new Error('Edge function failed')
});

/**
 * Utility to validate vision analysis response structure
 */
export const validateVisionResponse = (response: any) => {
  expect(response).toBeDefined();
  expect(response.accessibilityComplexity).toBeGreaterThanOrEqual(1);
  expect(response.accessibilityComplexity).toBeLessThanOrEqual(10);
  expect(response.wcagComplianceScore).toBeGreaterThanOrEqual(0);
  expect(response.wcagComplianceScore).toBeLessThanOrEqual(1);
  expect(response.complianceAssessment).toBeTruthy();
  expect(response.interfaceStructure).toBeTruthy();
};

/**
 * Create test session data
 */
export const createTestSession = (sessionId: string = 'test-session') => ({
  sessionId,
  timestamp: new Date().toISOString(),
  provider: 'test-provider',
  testMode: true
});