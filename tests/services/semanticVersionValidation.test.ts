import { describe, it, expect } from 'vitest';
import { isValidSemanticVersion, getSemanticVersionError } from '../../src/services/schemaTypeSpecification';

describe('Semantic Version Validation', () => {
  describe('isValidSemanticVersion', () => {
    describe('Valid Versions', () => {
      it('should accept standard semantic versions', () => {
        const validVersions = [
          '0.0.0',
          '0.1.0',
          '1.0.0',
          '1.2.3',
          '10.20.30',
          '99.99.99',
          '100.200.300'
        ];
        
        validVersions.forEach(version => {
          expect(isValidSemanticVersion(version)).toBe(true);
        });
      });

      it('should accept versions with pre-release tags', () => {
        const validVersions = [
          '1.0.0-alpha',
          '1.0.0-beta',
          '1.0.0-rc.1',
          '2.0.0-alpha.1',
          '2.0.0-beta.2',
          '1.0.0-0.3.7',
          '1.0.0-x.7.z.92',
          '1.0.0-alpha+001',
          '1.0.0+20130313144700',
          '1.0.0-beta+exp.sha.5114f85'
        ];
        
        validVersions.forEach(version => {
          expect(isValidSemanticVersion(version)).toBe(true);
        });
      });

      it('should accept versions with build metadata', () => {
        const validVersions = [
          '1.0.0+build123',
          '1.0.0+20130313144700',
          '1.0.0+exp.sha.5114f85',
          '1.0.0-alpha+build456',
          '2.0.0-rc.1+build.123'
        ];
        
        validVersions.forEach(version => {
          expect(isValidSemanticVersion(version)).toBe(true);
        });
      });
    });

    describe('Invalid Versions', () => {
      it('should reject invalid formats', () => {
        const invalidVersions = [
          '1',
          '1.0',
          '1.0.0.0',
          'v1.0.0',
          '1.0.0-',
          '1.0.0+',
          '01.0.0',
          '1.01.0',
          '1.0.00',
          '1.0.0 ',
          ' 1.0.0',
          '1. 0.0',
          '1.0. 0',
          'a.b.c',
          '1.a.0',
          '1.0.a',
          '1.0.0.alpha',
          '1,0,0',
          '1-0-0'
        ];
        
        invalidVersions.forEach(version => {
          expect(isValidSemanticVersion(version)).toBe(false);
        });
      });

      it('should reject empty or null values', () => {
        expect(isValidSemanticVersion('')).toBe(false);
        expect(isValidSemanticVersion(null as any)).toBe(false);
        expect(isValidSemanticVersion(undefined as any)).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(isValidSemanticVersion(123 as any)).toBe(false);
        expect(isValidSemanticVersion({} as any)).toBe(false);
        expect(isValidSemanticVersion([] as any)).toBe(false);
      });

      it('should reject versions with leading zeros', () => {
        const invalidVersions = [
          '01.0.0',
          '1.01.0',
          '1.0.01',
          '001.0.0',
          '1.001.0',
          '1.0.001'
        ];
        
        invalidVersions.forEach(version => {
          expect(isValidSemanticVersion(version)).toBe(false);
        });
      });
    });
  });

  describe('getSemanticVersionError', () => {
    it('should return null for valid versions', () => {
      const validVersions = [
        '1.0.0',
        '2.1.3',
        '0.1.0',
        '1.0.0-alpha',
        '1.0.0+build123'
      ];
      
      validVersions.forEach(version => {
        expect(getSemanticVersionError(version)).toBeNull();
      });
    });

    it('should return error message for invalid versions', () => {
      const invalidVersions = [
        '1.0',
        '1.0.0.0',
        'v1.0.0',
        'abc',
        '1-0-0'
      ];
      
      invalidVersions.forEach(version => {
        const error = getSemanticVersionError(version);
        expect(error).toBe('Version must follow semantic versioning format (e.g., 1.0.0, 2.1.3)');
      });
    });

    it('should return error message for empty version', () => {
      expect(getSemanticVersionError('')).toBe('Semantic version is required');
      expect(getSemanticVersionError(null as any)).toBe('Semantic version is required');
      expect(getSemanticVersionError(undefined as any)).toBe('Semantic version is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large version numbers', () => {
      expect(isValidSemanticVersion('999999999.999999999.999999999')).toBe(true);
    });

    it('should handle complex pre-release identifiers', () => {
      expect(isValidSemanticVersion('1.0.0-alpha.beta.gamma.1')).toBe(true);
      expect(isValidSemanticVersion('1.0.0-rc.1.2.3')).toBe(true);
    });

    it('should handle complex build metadata', () => {
      expect(isValidSemanticVersion('1.0.0+sha.a1b2c3d.date.20240101')).toBe(true);
      expect(isValidSemanticVersion('1.0.0-beta.1+exp.sha.5114f85.date.20240101')).toBe(true);
    });

    it('should reject versions with special characters', () => {
      expect(isValidSemanticVersion('1.0.0-alpha!')).toBe(false);
      expect(isValidSemanticVersion('1.0.0+build#123')).toBe(false);
      expect(isValidSemanticVersion('1.0.0@latest')).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate common version patterns from npm packages', () => {
      const npmVersions = [
        '0.0.1',
        '1.0.0',
        '2.0.0-rc.1',
        '3.0.0-beta.1',
        '4.1.2',
        '5.0.0-alpha.1',
        '1.0.0-0'
      ];
      
      npmVersions.forEach(version => {
        expect(isValidSemanticVersion(version)).toBe(true);
      });
    });

    it('should reject common mistakes', () => {
      const mistakes = [
        'latest',
        'stable',
        '^1.0.0',
        '~1.0.0',
        '>=1.0.0',
        '1.x.x',
        '1.*.0',
        '1.0.*'
      ];
      
      mistakes.forEach(version => {
        expect(isValidSemanticVersion(version)).toBe(false);
      });
    });
  });
});