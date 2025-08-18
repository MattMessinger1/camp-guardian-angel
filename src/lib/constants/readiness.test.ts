import { describe, it, expect } from 'vitest';
import { 
  READINESS_STATUS, 
  READINESS_LABELS, 
  COMMUNICATION_CADENCE,
  type ReadinessStatus,
  type CommunicationCadence 
} from './readiness';

describe('Readiness Constants', () => {
  describe('READINESS_STATUS', () => {
    it('has all expected status values', () => {
      expect(READINESS_STATUS.READY_FOR_SIGNUP).toBe('ready_for_signup');
      expect(READINESS_STATUS.NEEDS_SETUP).toBe('needs_setup');
      expect(READINESS_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(READINESS_STATUS.BLOCKED).toBe('blocked');
    });

    it('is immutable', () => {
      expect(() => {
        // @ts-expect-error - testing immutability
        READINESS_STATUS.READY_FOR_SIGNUP = 'modified';
      }).toThrow();
    });
  });

  describe('READINESS_LABELS', () => {
    it('has labels for all status values', () => {
      expect(READINESS_LABELS[READINESS_STATUS.READY_FOR_SIGNUP]).toBe('Ready for Signup');
      expect(READINESS_LABELS[READINESS_STATUS.NEEDS_SETUP]).toBe('Setup Required');
      expect(READINESS_LABELS[READINESS_STATUS.IN_PROGRESS]).toBe('In Progress');
      expect(READINESS_LABELS[READINESS_STATUS.BLOCKED]).toBe('Action Required');
    });

    it('covers all status values', () => {
      const statusKeys = Object.values(READINESS_STATUS);
      const labelKeys = Object.keys(READINESS_LABELS);
      
      statusKeys.forEach(status => {
        expect(labelKeys).toContain(status);
      });
    });
  });

  describe('COMMUNICATION_CADENCE', () => {
    it('has all expected cadence values', () => {
      expect(COMMUNICATION_CADENCE.IMMEDIATE).toBe('immediate');
      expect(COMMUNICATION_CADENCE.DAILY).toBe('daily');
      expect(COMMUNICATION_CADENCE.BI_DAILY).toBe('bi_daily');
      expect(COMMUNICATION_CADENCE.WEEKLY).toBe('weekly');
      expect(COMMUNICATION_CADENCE.NONE).toBe('none');
    });

    it('represents escalating urgency correctly', () => {
      const cadences = Object.values(COMMUNICATION_CADENCE);
      expect(cadences).toContain('immediate'); // Most urgent
      expect(cadences).toContain('daily');
      expect(cadences).toContain('bi_daily');
      expect(cadences).toContain('weekly');
      expect(cadences).toContain('none'); // No communication needed
    });
  });

  describe('Type exports', () => {
    it('ReadinessStatus type accepts valid values', () => {
      const validStatuses: ReadinessStatus[] = [
        'ready_for_signup',
        'needs_setup',
        'in_progress',
        'blocked'
      ];

      validStatuses.forEach(status => {
        expect(Object.values(READINESS_STATUS)).toContain(status);
      });
    });

    it('CommunicationCadence type accepts valid values', () => {
      const validCadences: CommunicationCadence[] = [
        'immediate',
        'daily',
        'bi_daily',
        'weekly',
        'none'
      ];

      validCadences.forEach(cadence => {
        expect(Object.values(COMMUNICATION_CADENCE)).toContain(cadence);
      });
    });
  });

  describe('Value consistency', () => {
    it('status constants match their string values', () => {
      expect(READINESS_STATUS.READY_FOR_SIGNUP).toBe('ready_for_signup');
      expect(READINESS_STATUS.NEEDS_SETUP).toBe('needs_setup');
      expect(READINESS_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(READINESS_STATUS.BLOCKED).toBe('blocked');
    });

    it('cadence constants match their string values', () => {
      expect(COMMUNICATION_CADENCE.IMMEDIATE).toBe('immediate');
      expect(COMMUNICATION_CADENCE.DAILY).toBe('daily');
      expect(COMMUNICATION_CADENCE.BI_DAILY).toBe('bi_daily');
      expect(COMMUNICATION_CADENCE.WEEKLY).toBe('weekly');
      expect(COMMUNICATION_CADENCE.NONE).toBe('none');
    });
  });
});