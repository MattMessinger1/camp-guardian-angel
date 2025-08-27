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
      return { data: null, error: { message: 'Unknown function' } };
    }
  }
};

test.describe('Vision Analysis Unit Tests', () => {
  test('validates mock screenshot data format', async () => {
    // Check that mock data contains expected base64 image format
    expect(mockScreenshots.simpleForm).toContain('data:image/svg+xml;base64,');
    expect(mockScreenshots.complexForm).toContain('data:image/svg+xml;base64,');
  });

  test('validates expected response structure', async () => {
    // Test the expected response validation
    const mockResponse = {
      accessibilityComplexity: 7,
      wcagComplianceScore: 0.8,
      complianceAssessment: 'Good accessibility implementation',
      interfaceStructure: 'Well-structured form with proper labeling'
    };

    validateVisionResponse(mockResponse);
    
    // Should not throw any errors
    expect(mockResponse.accessibilityComplexity).toBe(7);
    expect(mockResponse.wcagComplianceScore).toBe(0.8);
  });

  test('creates test session data correctly', async () => {
    const session = createTestSession('test-123');
    
    expect(session.sessionId).toBe('test-123');
    expect(session.testType).toBe('vision-analysis');
    expect(session.timestamp).toBeDefined();
    
    // Timestamp should be recent (within last minute)
    const sessionTime = new Date(session.timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - sessionTime.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });

  test('handles vision analysis response validation', async () => {
    const validResponse = {
      accessibilityComplexity: 5,
      wcagComplianceScore: 0.75
    };

    // Should not throw
    expect(() => validateVisionResponse(validResponse)).not.toThrow();
  });

  test('rejects invalid vision analysis responses', async () => {
    const invalidResponse1 = {
      accessibilityComplexity: 15, // Out of range (1-10)
      wcagComplianceScore: 0.5
    };

    const invalidResponse2 = {
      accessibilityComplexity: 5,
      wcagComplianceScore: 1.5 // Out of range (0-1)
    };

    expect(() => validateVisionResponse(invalidResponse1)).toThrow();
    expect(() => validateVisionResponse(invalidResponse2)).toThrow();
  });
});