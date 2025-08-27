import { expect } from '@playwright/test';

/**
 * Mock screenshot data for testing vision analysis
 */
export const mockScreenshots = {
  simpleForm: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+CiAgICA8dGV4dCB4PSI1MCIgeT0iNTAiPkZvcm08L3RleHQ+Cjwvc3ZnPg==",
  
  complexForm: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iODAwIiBmaWxsPSIjZjhmOWZhIi8+CiAgICA8dGV4dCB4PSI1MCIgeT0iMzAiPkNvbXBsZXggRm9ybTwvdGV4dD4KPC9zdmc+"
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