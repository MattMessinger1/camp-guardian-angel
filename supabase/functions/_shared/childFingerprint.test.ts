import { describe, it, expect } from 'vitest';
import { normalizeChildName, computeChildFingerprint } from '../_shared/childFingerprint';

describe('childFingerprint', () => {
  describe('normalizeChildName', () => {
    it('should normalize accented characters', () => {
      expect(normalizeChildName('José')).toBe('jose');
      expect(normalizeChildName('François')).toBe('francois');
      expect(normalizeChildName('Müller')).toBe('muller');
      expect(normalizeChildName('Björk')).toBe('bjork');
    });

    it('should handle mixed case', () => {
      expect(normalizeChildName('John DOE')).toBe('johndoe');
      expect(normalizeChildName('mary-jane')).toBe('maryjane');
    });

    it('should remove punctuation and special characters', () => {
      expect(normalizeChildName("O'Connor")).toBe('oconnor');
      expect(normalizeChildName('Smith-Jones')).toBe('smithjones');
      expect(normalizeChildName('van der Berg')).toBe('vandeberg');
      expect(normalizeChildName('Name123')).toBe('name123');
      expect(normalizeChildName('Name!@#$%')).toBe('name');
    });

    it('should handle empty and edge cases', () => {
      expect(normalizeChildName('')).toBe('');
      expect(normalizeChildName('   ')).toBe('');
      expect(normalizeChildName('123')).toBe('123');
      expect(normalizeChildName('ñoño')).toBe('nono');
    });

    it('should be stable across different input variations', () => {
      const variations = [
        'José Maria',
        'jose maria',
        'José-Maria',
        'jose_maria',
        'JOSÉ MARIA'
      ];
      
      const normalized = variations.map(normalizeChildName);
      const expected = 'josemaria';
      
      normalized.forEach(result => {
        expect(result).toBe(expected);
      });
    });
  });

  describe('computeChildFingerprint', () => {
    it('should generate stable SHA256 fingerprints', () => {
      const name = 'John Doe';
      const dob = new Date('2010-05-15');
      
      const fingerprint1 = computeChildFingerprint(name, dob);
      const fingerprint2 = computeChildFingerprint(name, dob);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 hex
    });

    it('should be case and accent insensitive for names', () => {
      const dob = new Date('2010-05-15');
      
      const fp1 = computeChildFingerprint('José Maria', dob);
      const fp2 = computeChildFingerprint('jose maria', dob);
      const fp3 = computeChildFingerprint('JOSÉ MARIA', dob);
      const fp4 = computeChildFingerprint('Jose-Maria', dob);
      
      expect(fp1).toBe(fp2);
      expect(fp2).toBe(fp3);
      expect(fp3).toBe(fp4);
    });

    it('should be sensitive to date differences', () => {
      const name = 'John Doe';
      const dob1 = new Date('2010-05-15');
      const dob2 = new Date('2010-05-16');
      
      const fp1 = computeChildFingerprint(name, dob1);
      const fp2 = computeChildFingerprint(name, dob2);
      
      expect(fp1).not.toBe(fp2);
    });

    it('should handle edge cases', () => {
      expect(() => computeChildFingerprint('', new Date())).not.toThrow();
      expect(() => computeChildFingerprint('Name', new Date('1900-01-01'))).not.toThrow();
      expect(() => computeChildFingerprint('Name', new Date('2100-12-31'))).not.toThrow();
    });

    it('should produce different fingerprints for different children', () => {
      const dob = new Date('2010-05-15');
      
      const fp1 = computeChildFingerprint('John Doe', dob);
      const fp2 = computeChildFingerprint('Jane Doe', dob);
      const fp3 = computeChildFingerprint('John Doe', new Date('2011-05-15'));
      
      expect(fp1).not.toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp2).not.toBe(fp3);
    });

    it('should handle international characters consistently', () => {
      const dob = new Date('2010-05-15');
      
      const names = [
        '张三', // Chinese
        'محمد', // Arabic  
        'Владимир', // Cyrillic
        'François', // French
        'José María' // Spanish
      ];
      
      names.forEach(name => {
        const fingerprint = computeChildFingerprint(name, dob);
        expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
        
        // Should be stable
        const fingerprint2 = computeChildFingerprint(name, dob);
        expect(fingerprint).toBe(fingerprint2);
      });
    });
  });
});