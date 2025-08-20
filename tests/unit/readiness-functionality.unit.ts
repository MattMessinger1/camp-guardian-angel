import { describe, it, expect } from 'vitest';
import { READINESS_STATUS, READINESS_LABELS, COMMUNICATION_CADENCE } from '@/lib/constants/readiness';

describe('Readiness Functionality Tests', () => {
  describe('Status Management', () => {
    it('should have correct status values', () => {
      expect(READINESS_STATUS.READY_FOR_SIGNUP).toBe('ready_for_signup');
      expect(READINESS_STATUS.NEEDS_SETUP).toBe('needs_setup');
      expect(READINESS_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(READINESS_STATUS.BLOCKED).toBe('blocked');
    });

    it('should have proper labels for all statuses', () => {
      expect(READINESS_LABELS[READINESS_STATUS.READY_FOR_SIGNUP]).toBe('Ready for Signup');
      expect(READINESS_LABELS[READINESS_STATUS.NEEDS_SETUP]).toBe('Setup Required');
      expect(READINESS_LABELS[READINESS_STATUS.IN_PROGRESS]).toBe('In Progress');
      expect(READINESS_LABELS[READINESS_STATUS.BLOCKED]).toBe('Action Required');
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for different readiness states', () => {
      // Mock readiness data scenarios
      const scenarios = [
        {
          name: 'needs setup',
          data: {
            requirements_researched: false,
            credentials_verified: false,
            payment_ready: false,
          },
          expected: { completed: 0, total: 3, percentage: 0 }
        },
        {
          name: 'research complete',
          data: {
            requirements_researched: true,
            credentials_verified: false,
            payment_ready: false,
          },
          expected: { completed: 1, total: 3, percentage: 33 }
        },
        {
          name: 'research and credentials complete',
          data: {
            requirements_researched: true,
            credentials_verified: true,
            payment_ready: false,
          },
          expected: { completed: 2, total: 3, percentage: 67 }
        },
        {
          name: 'all complete',
          data: {
            requirements_researched: true,
            credentials_verified: true,
            payment_ready: true,
          },
          expected: { completed: 3, total: 3, percentage: 100 }
        },
      ];

      scenarios.forEach(scenario => {
        const completed = Object.values(scenario.data).filter(Boolean).length;
        const total = Object.keys(scenario.data).length;
        const percentage = Math.round((completed / total) * 100);

        expect(completed).toBe(scenario.expected.completed);
        expect(percentage).toBe(scenario.expected.percentage);
      });
    });
  });

  describe('Urgency Detection', () => {
    it('should detect urgency levels based on days until signup', () => {
      const getUrgencyLevel = (daysUntil: number) => {
        if (daysUntil <= 1) return 'high';
        if (daysUntil <= 3) return 'medium';
        if (daysUntil <= 7) return 'low';
        return 'none';
      };

      expect(getUrgencyLevel(0)).toBe('high');
      expect(getUrgencyLevel(1)).toBe('high');
      expect(getUrgencyLevel(2)).toBe('medium');
      expect(getUrgencyLevel(3)).toBe('medium');
      expect(getUrgencyLevel(5)).toBe('low');
      expect(getUrgencyLevel(7)).toBe('low');
      expect(getUrgencyLevel(10)).toBe('none');
    });

    it('should suggest research for sessions opening within 14 days', () => {
      const shouldSuggestResearch = (daysUntil: number) => daysUntil <= 14;

      expect(shouldSuggestResearch(5)).toBe(true);
      expect(shouldSuggestResearch(14)).toBe(true);
      expect(shouldSuggestResearch(15)).toBe(false);
      expect(shouldSuggestResearch(30)).toBe(false);
    });
  });

  describe('Communication Cadence', () => {
    it('should have correct cadence values', () => {
      expect(COMMUNICATION_CADENCE.IMMEDIATE).toBe('immediate');
      expect(COMMUNICATION_CADENCE.DAILY).toBe('daily');
      expect(COMMUNICATION_CADENCE.BI_DAILY).toBe('bi_daily');
      expect(COMMUNICATION_CADENCE.WEEKLY).toBe('weekly');
      expect(COMMUNICATION_CADENCE.NONE).toBe('none');
    });

    it('should determine appropriate cadence based on urgency', () => {
      const getCadence = (daysUntil: number, status: string) => {
        if (status === READINESS_STATUS.BLOCKED) return COMMUNICATION_CADENCE.IMMEDIATE;
        if (daysUntil <= 1) return COMMUNICATION_CADENCE.DAILY;
        if (daysUntil <= 3) return COMMUNICATION_CADENCE.BI_DAILY;
        if (daysUntil <= 7) return COMMUNICATION_CADENCE.WEEKLY;
        return COMMUNICATION_CADENCE.NONE;
      };

      expect(getCadence(5, READINESS_STATUS.BLOCKED)).toBe('immediate');
      expect(getCadence(1, READINESS_STATUS.IN_PROGRESS)).toBe('daily');
      expect(getCadence(3, READINESS_STATUS.NEEDS_SETUP)).toBe('bi_daily');
      expect(getCadence(7, READINESS_STATUS.IN_PROGRESS)).toBe('weekly');
      expect(getCadence(14, READINESS_STATUS.READY_FOR_SIGNUP)).toBe('none');
    });
  });

  describe('Requirement Processing', () => {
    it('should format deposit amounts correctly', () => {
      const formatDeposit = (cents: number | null) => {
        if (!cents) return 'TBD';
        return `$${(cents / 100).toFixed(0)}`;
      };

      expect(formatDeposit(null)).toBe('TBD');
      expect(formatDeposit(0)).toBe('$0');
      expect(formatDeposit(15000)).toBe('$150');
      expect(formatDeposit(25050)).toBe('$251');
    });

    it('should validate confidence ratings', () => {
      const isValidConfidence = (rating: number) => {
        return rating >= 1 && rating <= 5 && Number.isInteger(rating);
      };

      expect(isValidConfidence(1)).toBe(true);
      expect(isValidConfidence(3)).toBe(true);
      expect(isValidConfidence(5)).toBe(true);
      expect(isValidConfidence(0)).toBe(false);
      expect(isValidConfidence(6)).toBe(false);
      expect(isValidConfidence(3.5)).toBe(false);
    });

    it('should determine auto-acceptance based on confidence', () => {
      const shouldAutoAccept = (confidence: number) => confidence >= 4;

      expect(shouldAutoAccept(1)).toBe(false);
      expect(shouldAutoAccept(2)).toBe(false);
      expect(shouldAutoAccept(3)).toBe(false);
      expect(shouldAutoAccept(4)).toBe(true);
      expect(shouldAutoAccept(5)).toBe(true);
    });
  });

  describe('Status Transitions', () => {
    it('should transition status correctly based on readiness data', () => {
      const getStatus = (data: any) => {
        if (!data) return READINESS_STATUS.NEEDS_SETUP;
        
        const { requirements_researched, credentials_verified, payment_ready } = data;
        
        if (requirements_researched && credentials_verified && payment_ready) {
          return READINESS_STATUS.READY_FOR_SIGNUP;
        }
        
        if (requirements_researched) {
          return READINESS_STATUS.IN_PROGRESS;
        }
        
        return READINESS_STATUS.NEEDS_SETUP;
      };

      expect(getStatus(null)).toBe(READINESS_STATUS.NEEDS_SETUP);
      expect(getStatus({ 
        requirements_researched: false,
        credentials_verified: false,
        payment_ready: false 
      })).toBe(READINESS_STATUS.NEEDS_SETUP);
      
      expect(getStatus({ 
        requirements_researched: true,
        credentials_verified: false,
        payment_ready: false 
      })).toBe(READINESS_STATUS.IN_PROGRESS);
      
      expect(getStatus({ 
        requirements_researched: true,
        credentials_verified: true,
        payment_ready: true 
      })).toBe(READINESS_STATUS.READY_FOR_SIGNUP);
    });
  });

  describe('Research Validation', () => {
    it('should validate required research fields', () => {
      const validateResearch = (research: any) => {
        const errors = [];
        
        if (!research.session_id) errors.push('Session ID required');
        if (research.confidence_rating === undefined || research.confidence_rating < 1 || research.confidence_rating > 5) {
          errors.push('Confidence rating must be 1-5');
        }
        if (research.deposit_amount_cents !== null && research.deposit_amount_cents < 0) {
          errors.push('Deposit amount cannot be negative');
        }
        
        return { valid: errors.length === 0, errors };
      };

      // Valid research
      const validResearch = {
        session_id: '123',
        confidence_rating: 4,
        deposit_amount_cents: 15000,
        child_fields: ['name', 'dob'],
        parent_fields: ['email'],
        documents: ['waiver']
      };
      expect(validateResearch(validResearch).valid).toBe(true);

      // Invalid research
      const invalidResearch = {
        confidence_rating: 6,
        deposit_amount_cents: -100
      };
      const result = validateResearch(invalidResearch);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Session ID required');
      expect(result.errors).toContain('Confidence rating must be 1-5');
      expect(result.errors).toContain('Deposit amount cannot be negative');
    });
  });
});