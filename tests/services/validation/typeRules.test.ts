import { describe, it, expect } from 'vitest';
import { TYPE_VALIDATION_RULES, validateWithRules, TypeRule } from '../../../src/services/validation/typeRules';

describe('Type Validation Rules', () => {
  describe('TYPE_VALIDATION_RULES configuration', () => {
    it('should have all expected primitive types defined', () => {
      const expectedTypes = ['boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'string'];
      expectedTypes.forEach(type => {
        expect(TYPE_VALIDATION_RULES).toHaveProperty(type);
        expect(TYPE_VALIDATION_RULES[type]).toHaveProperty('acceptedTypes');
        expect(TYPE_VALIDATION_RULES[type]).toHaveProperty('description');
      });
    });

    it('should have valid TypeRule structure for each rule', () => {
      Object.entries(TYPE_VALIDATION_RULES).forEach(([type, rule]) => {
        expect(Array.isArray(rule.acceptedTypes)).toBe(true);
        expect(rule.acceptedTypes.length).toBeGreaterThan(0);
        expect(typeof rule.description).toBe('string');
        expect(rule.description.length).toBeGreaterThan(0);

        if (rule.validateValue) {
          expect(typeof rule.validateValue).toBe('function');
        }
      });
    });
  });

  describe('boolean type validation', () => {
    const rule = TYPE_VALIDATION_RULES.boolean;

    it('should accept boolean type', () => {
      expect(rule.acceptedTypes).toContain('boolean');
    });

    it('should have no custom validation', () => {
      expect(rule.validateValue).toBeUndefined();
    });

    it('should have correct description', () => {
      expect(rule.description).toBe('boolean field requires boolean literal (true or false)');
    });
  });

  describe('byte type validation', () => {
    const rule = TYPE_VALIDATION_RULES.byte;

    it('should accept byte and int types', () => {
      expect(rule.acceptedTypes).toContain('byte');
      expect(rule.acceptedTypes).toContain('int');
    });

    it('should validate values within byte range (0-255)', () => {
      expect(rule.validateValue!(0, 'testField')).toBeNull();
      expect(rule.validateValue!(255, 'testField')).toBeNull();
      expect(rule.validateValue!(128, 'testField')).toBeNull();
    });

    it('should reject values below 0', () => {
      const result = rule.validateValue!(-1, 'testField');
      expect(result).toBe("Field 'testField': byte value -1 is out of range (0-255)");
    });

    it('should reject values above 255', () => {
      const result = rule.validateValue!(256, 'testField');
      expect(result).toBe("Field 'testField': byte value 256 is out of range (0-255)");
    });

    it('should handle edge cases', () => {
      expect(rule.validateValue!(1000, 'test')).toContain('out of range');
      expect(rule.validateValue!(-100, 'test')).toContain('out of range');
    });
  });

  describe('char type validation', () => {
    const rule = TYPE_VALIDATION_RULES.char;

    it('should accept char type only', () => {
      expect(rule.acceptedTypes).toEqual(['char']);
    });

    it('should validate single character strings', () => {
      expect(rule.validateValue!('a', 'testField')).toBeNull();
      expect(rule.validateValue!('Z', 'testField')).toBeNull();
      expect(rule.validateValue!('9', 'testField')).toBeNull();
      expect(rule.validateValue!(' ', 'testField')).toBeNull();
      expect(rule.validateValue!('!', 'testField')).toBeNull();
    });

    it('should reject empty strings', () => {
      const result = rule.validateValue!('', 'testField');
      expect(result).toBe("Field 'testField': char literal must be exactly one character");
    });

    it('should reject multi-character strings', () => {
      const result = rule.validateValue!('ab', 'testField');
      expect(result).toBe("Field 'testField': char literal must be exactly one character");

      const result2 = rule.validateValue!('hello', 'testField');
      expect(result2).toBe("Field 'testField': char literal must be exactly one character");
    });
  });

  describe('short type validation', () => {
    const rule = TYPE_VALIDATION_RULES.short;

    it('should accept short and int types', () => {
      expect(rule.acceptedTypes).toContain('short');
      expect(rule.acceptedTypes).toContain('int');
    });

    it('should validate values within short range (-32768 to 32767)', () => {
      expect(rule.validateValue!(-32768, 'testField')).toBeNull();
      expect(rule.validateValue!(32767, 'testField')).toBeNull();
      expect(rule.validateValue!(0, 'testField')).toBeNull();
      expect(rule.validateValue!(1000, 'testField')).toBeNull();
    });

    it('should reject values below -32768', () => {
      const result = rule.validateValue!(-32769, 'testField');
      expect(result).toBe("Field 'testField': short value -32769 is out of range (-32,768 to 32,767)");
    });

    it('should reject values above 32767', () => {
      const result = rule.validateValue!(32768, 'testField');
      expect(result).toBe("Field 'testField': short value 32768 is out of range (-32,768 to 32,767)");
    });
  });

  describe('int type validation', () => {
    const rule = TYPE_VALIDATION_RULES.int;

    it('should accept int type only', () => {
      expect(rule.acceptedTypes).toEqual(['int']);
    });

    it('should validate values within int range', () => {
      expect(rule.validateValue!(-2147483648, 'testField')).toBeNull();
      expect(rule.validateValue!(2147483647, 'testField')).toBeNull();
      expect(rule.validateValue!(0, 'testField')).toBeNull();
    });

    it('should reject values below int min', () => {
      const result = rule.validateValue!(-2147483649, 'testField');
      expect(result).toBe("Field 'testField': int value -2147483649 is out of range (-2,147,483,648 to 2,147,483,647)");
    });

    it('should reject values above int max', () => {
      const result = rule.validateValue!(2147483648, 'testField');
      expect(result).toBe("Field 'testField': int value 2147483648 is out of range (-2,147,483,648 to 2,147,483,647)");
    });
  });

  describe('long type validation', () => {
    const rule = TYPE_VALIDATION_RULES.long;

    it('should accept long and int types', () => {
      expect(rule.acceptedTypes).toContain('long');
      expect(rule.acceptedTypes).toContain('int');
    });

    it('should validate values within long range', () => {
      expect(rule.validateValue!(0, 'testField')).toBeNull();
      expect(rule.validateValue!(1234567890, 'testField')).toBeNull();
      expect(rule.validateValue!(-1234567890, 'testField')).toBeNull();
    });

    it('should reject values outside long range', () => {
      // Use values that definitely exceed the range due to JavaScript number limitations
      const veryLargeValue = 1e20; // Well beyond long range
      const verySmallValue = -1e20; // Well beyond long range

      const result1 = rule.validateValue!(veryLargeValue, 'testField');
      expect(result1).not.toBeNull();
      expect(result1!).toContain('out of range');

      const result2 = rule.validateValue!(verySmallValue, 'testField');
      expect(result2).not.toBeNull();
      expect(result2!).toContain('out of range');
    });
  });

  describe('float type validation', () => {
    const rule = TYPE_VALIDATION_RULES.float;

    it('should accept float, double, and int types', () => {
      expect(rule.acceptedTypes).toContain('float');
      expect(rule.acceptedTypes).toContain('double');
      expect(rule.acceptedTypes).toContain('int');
    });

    it('should validate values within float range', () => {
      expect(rule.validateValue!(0.0, 'testField')).toBeNull();
      expect(rule.validateValue!(3.14, 'testField')).toBeNull();
      expect(rule.validateValue!(-3.14, 'testField')).toBeNull();
      expect(rule.validateValue!(1e10, 'testField')).toBeNull();
    });

    it('should reject values outside float range', () => {
      const result = rule.validateValue!(3.5e38, 'testField');
      expect(result).toContain('out of range');
    });
  });

  describe('double type validation', () => {
    const rule = TYPE_VALIDATION_RULES.double;

    it('should accept double, float, and int types', () => {
      expect(rule.acceptedTypes).toContain('double');
      expect(rule.acceptedTypes).toContain('float');
      expect(rule.acceptedTypes).toContain('int');
    });

    it('should validate values within double range', () => {
      expect(rule.validateValue!(0.0, 'testField')).toBeNull();
      expect(rule.validateValue!(1.7e100, 'testField')).toBeNull();
      expect(rule.validateValue!(-1.7e100, 'testField')).toBeNull();
    });

    it('should reject values outside double range', () => {
      const result = rule.validateValue!(1.8e308, 'testField');
      expect(result).toContain('out of range');
    });
  });

  describe('string type validation', () => {
    const rule = TYPE_VALIDATION_RULES.string;

    it('should accept string type only', () => {
      expect(rule.acceptedTypes).toEqual(['string']);
    });

    it('should validate strings within length range (1-64)', () => {
      expect(rule.validateValue!('a', 'testField')).toBeNull();
      expect(rule.validateValue!('hello', 'testField')).toBeNull();
      expect(rule.validateValue!('a'.repeat(64), 'testField')).toBeNull();
    });

    it('should reject empty strings', () => {
      const result = rule.validateValue!('', 'testField');
      expect(result).toBe("Field 'testField': string must be 1-64 characters, got 0");
    });

    it('should reject strings longer than 64 characters', () => {
      const longString = 'a'.repeat(65);
      const result = rule.validateValue!(longString, 'testField');
      expect(result).toBe("Field 'testField': string must be 1-64 characters, got 65");
    });

    it('should handle various string lengths correctly', () => {
      expect(rule.validateValue!('x'.repeat(1), 'test')).toBeNull();
      expect(rule.validateValue!('x'.repeat(32), 'test')).toBeNull();
      expect(rule.validateValue!('x'.repeat(64), 'test')).toBeNull();
      expect(rule.validateValue!('x'.repeat(100), 'test')).toContain('string must be 1-64 characters');
    });
  });

  describe('validateWithRules function', () => {
    it('should return null for valid boolean literal', () => {
      const literal = { type: 'boolean', value: true };
      const result = validateWithRules('boolean', literal, 'isActive');
      expect(result).toBeNull();
    });

    it('should return error for invalid literal type', () => {
      const literal = { type: 'string', value: 'true' };
      const result = validateWithRules('boolean', literal, 'isActive');
      expect(result).toBe("Field 'isActive': boolean field requires boolean literal (true or false), got string");
    });

    it('should return error for unknown primitive type', () => {
      const literal = { type: 'string', value: 'test' };
      const result = validateWithRules('unknown', literal, 'field');
      expect(result).toBe("Field 'field': Unknown primitive type 'unknown'");
    });

    it('should validate byte values and return custom validation errors', () => {
      const literal = { type: 'int', value: 300 };
      const result = validateWithRules('byte', literal, 'byteField');
      expect(result).toBe("Field 'byteField': byte value 300 is out of range (0-255)");
    });

    it('should validate char values and return custom validation errors', () => {
      const literal = { type: 'char', value: 'hello' };
      const result = validateWithRules('char', literal, 'charField');
      expect(result).toBe("Field 'charField': char literal must be exactly one character");
    });

    it('should validate string values and return custom validation errors', () => {
      const literal = { type: 'string', value: '' };
      const result = validateWithRules('string', literal, 'stringField');
      expect(result).toBe("Field 'stringField': string must be 1-64 characters, got 0");
    });

    it('should handle types without custom validation (boolean)', () => {
      const literal = { type: 'boolean', value: false };
      const result = validateWithRules('boolean', literal, 'flag');
      expect(result).toBeNull();
    });

    it('should validate all numeric types correctly', () => {
      // Test valid values
      expect(validateWithRules('int', { type: 'int', value: 42 }, 'num')).toBeNull();
      expect(validateWithRules('float', { type: 'float', value: 3.14 }, 'num')).toBeNull();
      expect(validateWithRules('double', { type: 'double', value: 2.718 }, 'num')).toBeNull();
      expect(validateWithRules('short', { type: 'short', value: 1000 }, 'num')).toBeNull();
      expect(validateWithRules('long', { type: 'long', value: 123456789 }, 'num')).toBeNull();
    });

    it('should validate type compatibility correctly', () => {
      // Test that int is accepted for numeric types that allow it
      expect(validateWithRules('byte', { type: 'int', value: 100 }, 'field')).toBeNull();
      expect(validateWithRules('short', { type: 'int', value: 1000 }, 'field')).toBeNull();
      expect(validateWithRules('long', { type: 'int', value: 12345 }, 'field')).toBeNull();
      expect(validateWithRules('float', { type: 'int', value: 42 }, 'field')).toBeNull();
      expect(validateWithRules('double', { type: 'int', value: 42 }, 'field')).toBeNull();
    });

    it('should handle edge cases with null and undefined values', () => {
      // These tests check that validation throws errors for null/undefined values
      const nullLiteral = { type: 'string', value: null };
      const undefinedLiteral = { type: 'string', value: undefined };

      // Should throw errors when trying to validate null/undefined values
      expect(() => validateWithRules('string', nullLiteral, 'field')).toThrow();
      expect(() => validateWithRules('string', undefinedLiteral, 'field')).toThrow();
    });

    it('should handle special characters in field references', () => {
      const literal = { type: 'string', value: 'test' };
      const result = validateWithRules('string', literal, 'field.with.dots');
      expect(result).toBeNull();

      const errorResult = validateWithRules('unknown', literal, 'field[0].name');
      expect(errorResult).toContain('field[0].name');
    });
  });

  describe('comprehensive validation scenarios', () => {
    it('should handle all primitive types with valid inputs', () => {
      const validCases = [
        { type: 'boolean', literal: { type: 'boolean', value: true } },
        { type: 'byte', literal: { type: 'byte', value: 128 } },
        { type: 'char', literal: { type: 'char', value: 'A' } },
        { type: 'short', literal: { type: 'short', value: 1000 } },
        { type: 'int', literal: { type: 'int', value: 42 } },
        { type: 'long', literal: { type: 'long', value: 123456789 } },
        { type: 'float', literal: { type: 'float', value: 3.14 } },
        { type: 'double', literal: { type: 'double', value: 2.718281828 } },
        { type: 'string', literal: { type: 'string', value: 'hello world' } }
      ];

      validCases.forEach(({ type, literal }) => {
        const result = validateWithRules(type, literal, `${type}Field`);
        expect(result, `${type} validation should pass`).toBeNull();
      });
    });

    it('should handle all primitive types with invalid type mismatches', () => {
      const literal = { type: 'string', value: 'invalid' };

      ['boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double'].forEach(type => {
        const result = validateWithRules(type, literal, 'field');
        expect(result, `${type} should reject string literal`).not.toBeNull();
        expect(result).toContain('got string');
      });
    });
  });
});