import { describe, it, expect } from 'vitest';
import { SemanticVersion } from '../../src/services/semanticVersion';

describe('SemanticVersion', () => {
  describe('parse', () => {
    it('should parse valid semantic versions', () => {
      expect(SemanticVersion.parse('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
      expect(SemanticVersion.parse('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
      expect(SemanticVersion.parse('0.0.1')).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it('should handle whitespace', () => {
      expect(SemanticVersion.parse('  1.2.3  ')).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should return null for invalid formats', () => {
      expect(SemanticVersion.parse('1.0')).toBeNull();
      expect(SemanticVersion.parse('1.0.0.0')).toBeNull();
      expect(SemanticVersion.parse('v1.0.0')).toBeNull();
      expect(SemanticVersion.parse('1.0.0-alpha')).toBeNull();
      expect(SemanticVersion.parse('1.0.0+build')).toBeNull();
      expect(SemanticVersion.parse('not.a.version')).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(SemanticVersion.parse('-1.0.0')).toBeNull();
      expect(SemanticVersion.parse('1.-1.0')).toBeNull();
      expect(SemanticVersion.parse('1.0.-1')).toBeNull();
    });
  });

  describe('format', () => {
    it('should format semantic versions correctly', () => {
      expect(SemanticVersion.format({ major: 1, minor: 0, patch: 0 })).toBe('1.0.0');
      expect(SemanticVersion.format({ major: 10, minor: 20, patch: 30 })).toBe('10.20.30');
    });
  });

  describe('compare', () => {
    it('should compare major versions', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 2, minor: 0, patch: 0 };
      
      expect(SemanticVersion.compare(v1, v2)).toBeLessThan(0);
      expect(SemanticVersion.compare(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare minor versions when major is equal', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 1, minor: 1, patch: 0 };
      
      expect(SemanticVersion.compare(v1, v2)).toBeLessThan(0);
      expect(SemanticVersion.compare(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare patch versions when major and minor are equal', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 1, minor: 0, patch: 1 };
      
      expect(SemanticVersion.compare(v1, v2)).toBeLessThan(0);
      expect(SemanticVersion.compare(v2, v1)).toBeGreaterThan(0);
    });

    it('should return 0 for equal versions', () => {
      const v1 = { major: 1, minor: 2, patch: 3 };
      const v2 = { major: 1, minor: 2, patch: 3 };
      
      expect(SemanticVersion.compare(v1, v2)).toBe(0);
    });
  });

  describe('comparison helpers', () => {
    const v1_0_0 = { major: 1, minor: 0, patch: 0 };
    const v1_1_0 = { major: 1, minor: 1, patch: 0 };
    const v2_0_0 = { major: 2, minor: 0, patch: 0 };

    it('should check isGreater correctly', () => {
      expect(SemanticVersion.isGreater(v1_1_0, v1_0_0)).toBe(true);
      expect(SemanticVersion.isGreater(v1_0_0, v1_1_0)).toBe(false);
      expect(SemanticVersion.isGreater(v1_0_0, v1_0_0)).toBe(false);
    });

    it('should check isLess correctly', () => {
      expect(SemanticVersion.isLess(v1_0_0, v1_1_0)).toBe(true);
      expect(SemanticVersion.isLess(v1_1_0, v1_0_0)).toBe(false);
      expect(SemanticVersion.isLess(v1_0_0, v1_0_0)).toBe(false);
    });

    it('should check isEqual correctly', () => {
      expect(SemanticVersion.isEqual(v1_0_0, v1_0_0)).toBe(true);
      expect(SemanticVersion.isEqual(v1_0_0, v1_1_0)).toBe(false);
    });

    it('should check areCompatible correctly', () => {
      expect(SemanticVersion.areCompatible(v1_0_0, v1_1_0)).toBe(true);
      expect(SemanticVersion.areCompatible(v1_0_0, v2_0_0)).toBe(false);
    });

    it('should check isGreaterOrEqual correctly', () => {
      expect(SemanticVersion.isGreaterOrEqual(v1_1_0, v1_0_0)).toBe(true);
      expect(SemanticVersion.isGreaterOrEqual(v1_0_0, v1_0_0)).toBe(true);
      expect(SemanticVersion.isGreaterOrEqual(v1_0_0, v1_1_0)).toBe(false);
    });

    it('should check isLessOrEqual correctly', () => {
      expect(SemanticVersion.isLessOrEqual(v1_0_0, v1_1_0)).toBe(true);
      expect(SemanticVersion.isLessOrEqual(v1_0_0, v1_0_0)).toBe(true);
      expect(SemanticVersion.isLessOrEqual(v1_1_0, v1_0_0)).toBe(false);
    });
  });

  describe('increment operations', () => {
    const v1_2_3 = { major: 1, minor: 2, patch: 3 };

    it('should increment major version and reset minor/patch', () => {
      expect(SemanticVersion.incrementMajor(v1_2_3)).toEqual({ major: 2, minor: 0, patch: 0 });
    });

    it('should increment minor version and reset patch', () => {
      expect(SemanticVersion.incrementMinor(v1_2_3)).toEqual({ major: 1, minor: 3, patch: 0 });
    });

    it('should increment patch version', () => {
      expect(SemanticVersion.incrementPatch(v1_2_3)).toEqual({ major: 1, minor: 2, patch: 4 });
    });
  });

  describe('getNextVersion', () => {
    const current = { major: 1, minor: 2, patch: 3 };

    it('should get next major version', () => {
      expect(SemanticVersion.getNextVersion(current, 'major')).toEqual({ major: 2, minor: 0, patch: 0 });
    });

    it('should get next minor version', () => {
      expect(SemanticVersion.getNextVersion(current, 'minor')).toEqual({ major: 1, minor: 3, patch: 0 });
    });

    it('should get next patch version', () => {
      expect(SemanticVersion.getNextVersion(current, 'patch')).toEqual({ major: 1, minor: 2, patch: 4 });
    });

    it('should throw for invalid change type', () => {
      expect(() => SemanticVersion.getNextVersion(current, 'invalid' as any)).toThrow();
    });
  });

  describe('suggestMinimumIncrement', () => {
    const current = { major: 1, minor: 0, patch: 0 };

    it('should suggest major for major version increase', () => {
      const proposed = { major: 2, minor: 0, patch: 0 };
      expect(SemanticVersion.suggestMinimumIncrement(current, proposed)).toBe('major');
    });

    it('should suggest minor for minor version increase', () => {
      const proposed = { major: 1, minor: 1, patch: 0 };
      expect(SemanticVersion.suggestMinimumIncrement(current, proposed)).toBe('minor');
    });

    it('should suggest patch for patch version increase', () => {
      const proposed = { major: 1, minor: 0, patch: 1 };
      expect(SemanticVersion.suggestMinimumIncrement(current, proposed)).toBe('patch');
    });

    it('should return null for invalid (non-increasing) versions', () => {
      const proposed = { major: 0, minor: 9, patch: 9 };
      expect(SemanticVersion.suggestMinimumIncrement(current, proposed)).toBeNull();
    });
  });

  describe('isValid', () => {
    it('should validate correct semantic version strings', () => {
      expect(SemanticVersion.isValid('1.0.0')).toBe(true);
      expect(SemanticVersion.isValid('10.20.30')).toBe(true);
    });

    it('should reject invalid semantic version strings', () => {
      expect(SemanticVersion.isValid('1.0')).toBe(false);
      expect(SemanticVersion.isValid('v1.0.0')).toBe(false);
      expect(SemanticVersion.isValid('not.a.version')).toBe(false);
    });
  });

  describe('sort', () => {
    interface VersionedItem {
      name: string;
      semanticVersion: string;
    }

    it('should sort objects by semantic version in ascending order', () => {
      const items: VersionedItem[] = [
        { name: 'third', semanticVersion: '2.0.0' },
        { name: 'first', semanticVersion: '1.0.0' },
        { name: 'second', semanticVersion: '1.1.0' },
        { name: 'fourth', semanticVersion: '10.0.0' }
      ];

      const sorted = SemanticVersion.sort(items);

      expect(sorted.map(item => item.name)).toEqual(['first', 'second', 'third', 'fourth']);
      expect(sorted.map(item => item.semanticVersion)).toEqual(['1.0.0', '1.1.0', '2.0.0', '10.0.0']);
    });

    it('should not mutate the original array', () => {
      const items: VersionedItem[] = [
        { name: 'b', semanticVersion: '2.0.0' },
        { name: 'a', semanticVersion: '1.0.0' }
      ];
      const original = [...items];

      const sorted = SemanticVersion.sort(items);

      expect(items).toEqual(original);
      expect(sorted).not.toBe(items);
    });

    it('should handle items with invalid semantic versions', () => {
      const items: VersionedItem[] = [
        { name: 'valid', semanticVersion: '1.0.0' },
        { name: 'invalid1', semanticVersion: 'not.a.version' },
        { name: 'invalid2', semanticVersion: 'also.invalid' },
        { name: 'valid2', semanticVersion: '2.0.0' }
      ];

      const sorted = SemanticVersion.sort(items);

      // Invalid versions should remain in their relative positions
      // but valid versions should be sorted correctly
      expect(sorted.length).toBe(4);
      expect(sorted.find(item => item.name === 'valid')?.semanticVersion).toBe('1.0.0');
      expect(sorted.find(item => item.name === 'valid2')?.semanticVersion).toBe('2.0.0');
    });

    it('should handle empty array', () => {
      const items: VersionedItem[] = [];
      const sorted = SemanticVersion.sort(items);
      
      expect(sorted).toEqual([]);
    });

    it('should handle single item', () => {
      const items: VersionedItem[] = [{ name: 'only', semanticVersion: '1.0.0' }];
      const sorted = SemanticVersion.sort(items);
      
      expect(sorted).toEqual([{ name: 'only', semanticVersion: '1.0.0' }]);
    });

    it('should handle complex version sorting', () => {
      const items: VersionedItem[] = [
        { name: 'v1.10.2', semanticVersion: '1.10.2' },
        { name: 'v1.2.10', semanticVersion: '1.2.10' },
        { name: 'v1.10.1', semanticVersion: '1.10.1' },
        { name: 'v1.2.2', semanticVersion: '1.2.2' }
      ];

      const sorted = SemanticVersion.sort(items);

      expect(sorted.map(item => item.semanticVersion)).toEqual([
        '1.2.2', '1.2.10', '1.10.1', '1.10.2'
      ]);
    });
  });
});