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
      <text x="60" y="125" font-family="Arial" font-size="14">Child Name</text>
      <rect x="50" y="160" width="300" height="40" fill="white" stroke="#ccc"/>
      <text x="60" y="185" font-family="Arial" font-size="14">Parent Email</text>
      <rect x="50" y="220" width="120" height="40" fill="#007bff" stroke="none"/>
      <text x="110" y="245" font-family="Arial" font-size="14" fill="white">Submit</text>
    </svg>
  `)}`,
  
  complexForm: `data:image/svg+xml;base64,${btoa(`
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="800" fill="#f8f9fa"/>
      <text x="50" y="30" font-family="Arial" font-size="20">Complex Camp Registration</text>
      <!-- Multiple form fields -->
      <rect x="50" y="60" width="300" height="30" fill="white" stroke="#ccc"/>
      <text x="60" y="80" font-size="12">Child First Name *</text>
      <rect x="400" y="60" width="300" height="30" fill="white" stroke="#ccc"/>
      <text x="410" y="80" font-size="12">Child Last Name *</text>
      <!-- CAPTCHA indication -->
      <rect x="50" y="400" width="200" height="100" fill="#f0f0f0" stroke="#999"/>
      <text x="150" y="450" font-size="14" text-anchor="middle">I'm not a robot</text>
      <circle cx="70" cy="450" r="10" fill="white" stroke="#999"/>
    </svg>
  `)}`
};

/**
 * Expected response structures for vision analysis
 */
export const expectedResponses = {
  typical: {
    accessibilityComplexity: expect.any(Number),
    wcagComplianceScore: expect.any(Number),
    complianceAssessment: expect.any(String),
    interfaceStructure: expect.any(String)
  }
};

/**
 * Mock Supabase edge function response
 */
export function mockEdgeFunctionResponse(success: boolean = true, data?: any) {
  return {
    data: success ? (data || {
      accessibilityComplexity: 5,
      wcagComplianceScore: 0.8,
      complianceAssessment: 'Good accessibility features detected',
      interfaceStructure: 'Standard form with clear labels'
    }) : null,
    error: success ? null : { message: 'Vision analysis failed' }
  };
}

/**
 * Validate vision analysis response structure
 */
export function validateVisionResponse(response: any) {
  expect(response).toHaveProperty('accessibilityComplexity');
  expect(response.accessibilityComplexity).toBeGreaterThanOrEqual(1);
  expect(response.accessibilityComplexity).toBeLessThanOrEqual(10);
  
  expect(response).toHaveProperty('wcagComplianceScore');
  expect(response.wcagComplianceScore).toBeGreaterThanOrEqual(0);
  expect(response.wcagComplianceScore).toBeLessThanOrEqual(1);
}

/**
 * Create test session data
 */
export function createTestSession(sessionId: string = 'test-session') {
  return {
    sessionId,
    timestamp: new Date().toISOString(),
    testType: 'vision-analysis'
  };
}