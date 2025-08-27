import { test, expect } from '@playwright/test';
import { mockScreenshots, expectedResponses, validateVisionResponse, createTestSession } from '../utils/visionTestUtils';

// Mock Supabase client to avoid actual API calls in unit tests
const mockSupabase = {
  functions: {
    invoke: async (functionName: string, options: any) => {
      if (functionName === 'test-vision-analysis') {
        return {
          data: {
            accessibilityComplexity: 5,
            wcagComplianceScore: 0.6,
            complianceAssessment: 'The interface has moderate accessibility features.',
            interfaceStructure: 'Standard form layout with clear labels.'
          },
          error: null
        };
      }
      return { data: null, error: new Error('Unknown function') };
    }
  }
};

test.describe('Vision Analysis Unit Tests', () => {
  test('validates mock screenshot data format', async () => {
    expect(mockScreenshots.simpleForm).toContain('data:image/svg+xml;base64');
    expect(mockScreenshots.complexForm).toContain('data:image/svg+xml;base64');
  });

  test('validates expected response structure', async () => {
    const response = {
      accessibilityComplexity: 5,
      wcagComplianceScore: 0.7,
      complianceAssessment: 'Good accessibility features present',
      interfaceStructure: 'Well-organized form layout'
    };

    validateVisionResponse(response);
  });

  test('creates test session data correctly', async () => {
    const session = createTestSession('test-123');
    
    expect(session.sessionId).toBe('test-123');
    expect(session.provider).toBe('test-provider');
    expect(session.testMode).toBe(true);
    expect(session.timestamp).toBeTruthy();
  });

  test('handles vision analysis response validation', async () => {
    const validResponse = {
      accessibilityComplexity: 3,
      wcagComplianceScore: 0.8,
      complianceAssessment: 'Excellent compliance',
      interfaceStructure: 'Clear structure'
    };

    expect(() => validateVisionResponse(validResponse)).not.toThrow();
  });

  test('rejects invalid vision analysis responses', async () => {
    const invalidResponse = {
      accessibilityComplexity: 15, // Invalid: > 10
      wcagComplianceScore: 1.5,    // Invalid: > 1
      complianceAssessment: '',     // Invalid: empty
      interfaceStructure: null      // Invalid: null
    };

    expect(() => validateVisionResponse(invalidResponse)).toThrow();
  });
});