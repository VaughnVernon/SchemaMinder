import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaSpecificationValidator, ValidationResult } from '../../src/services/schemaSpecificationValidator';
import { SchemaSpecificationParser, ParseError, SchemaSpecification } from '../../src/parser';

// Mock the parser
vi.mock('../../src/parser', () => ({
  SchemaSpecificationParser: {
    parse: vi.fn()
  }
}));

describe('SchemaSpecificationValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParseResult = (success: boolean, specification?: SchemaSpecification, errors: ParseError[] = []) => ({
    success,
    specification: specification || null,
    errors
  });

  const createMockSpecification = (name: string = 'TestSchema', category: string = 'Commands', fieldCount: number = 3): SchemaSpecification => ({
    name,
    category,
    fields: Array.from({ length: fieldCount }, (_, i) => ({
      name: `field${i + 1}`,
      type: {
        kind: 'primitive' as const,
        type: 'string',
        isArray: false
      },
      defaultValue: undefined,
      location: { start: { line: i + 2, column: 1 }, end: { line: i + 2, column: 10 } }
    }))
  });

  const createMockError = (message: string, severity: 'error' | 'warning' = 'error'): ParseError => ({
    message,
    severity,
    location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
  });

  describe('Basic Validation', () => {
    it('should validate successful parse results', () => {
      const mockSpec = createMockSpecification('ValidSchema', 'Events', 5);
      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('valid schema text');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.specification).toEqual(mockSpec);
    });

    it('should handle parse errors', () => {
      const parseErrors = [
        createMockError('Syntax error at line 1', 'error'),
        createMockError('Missing closing brace', 'error')
      ];
      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(false, null, parseErrors)
      );

      const result = SchemaSpecificationValidator.validate('invalid schema text');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toBe('Syntax error at line 1');
      expect(result.errors[1].message).toBe('Missing closing brace');
      expect(result.specification).toBeNull();
    });

    it('should handle warnings separately from errors', () => {
      const mockSpec = createMockSpecification();
      const parseErrors = [
        createMockError('Minor issue', 'warning'),
        createMockError('Another warning', 'warning')
      ];
      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, parseErrors)
      );

      const result = SchemaSpecificationValidator.validate('schema with warnings');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].message).toBe('Minor issue');
      expect(result.specification).toEqual(mockSpec);
    });

    it('should handle mixed errors and warnings', () => {
      const parseErrors = [
        createMockError('Critical error', 'error'),
        createMockError('Warning message', 'warning'),
        createMockError('Another error', 'error')
      ];
      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(false, undefined, parseErrors)
      );

      const result = SchemaSpecificationValidator.validate('problematic schema');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0].message).toBe('Critical error');
      expect(result.errors[1].message).toBe('Another error');
      expect(result.warnings[0].message).toBe('Warning message');
    });

    it('should pass expected category to parser', () => {
      const mockSpec = createMockSpecification();
      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      SchemaSpecificationValidator.validate('schema text', 'Events');

      expect(SchemaSpecificationParser.parse).toHaveBeenCalledWith('schema text', 'Events');
    });
  });

  describe('Type Literal Validation', () => {
    it('should validate primitive type literals for successful parses', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'stringField',
            type: { kind: 'primitive', type: 'string', isArray: false },
            defaultValue: { type: 'string', value: 'test' },
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          },
          {
            name: 'intField',
            type: { kind: 'primitive', type: 'int', isArray: false },
            defaultValue: { type: 'int', value: 42 },
            location: { start: { line: 2, column: 1 }, end: { line: 2, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with defaults');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect type literal mismatches', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'stringField',
            type: { kind: 'primitive', type: 'string', isArray: false },
            defaultValue: { type: 'int', value: 42 }, // Wrong type
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with type error');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('string field requires string literal');
    });

    it('should validate array type literals', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'arrayField',
            type: { kind: 'primitive', type: 'string', isArray: true },
            defaultValue: { 
              type: 'array', 
              elements: [
                { type: 'string', value: 'item1' },
                { type: 'string', value: 'item2' }
              ]
            },
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with array');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect array type literal errors', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'arrayField',
            type: { kind: 'primitive', type: 'int', isArray: true },
            defaultValue: { type: 'string', value: 'not an array' }, // Should be array
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with array error');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('array field requires array literal');
    });

    it('should validate numeric range constraints', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'byteField',
            type: { kind: 'primitive', type: 'byte', isArray: false },
            defaultValue: { type: 'int', value: 300 }, // Out of byte range
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with range error');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('byte value 300 is out of range (0-255)');
    });

    it('should validate string length constraints', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'stringField',
            type: { kind: 'primitive', type: 'string', isArray: false },
            defaultValue: { type: 'string', value: 'a'.repeat(100) }, // Too long
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with string error');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('string must be 1-64 characters, got 100');
    });

    it('should skip type validation for complex fields', () => {
      const mockSpec: SchemaSpecification = {
        name: 'TestSchema',
        category: 'Commands',
        fields: [
          {
            name: 'complexField',
            type: { kind: 'complex', category: 'Data', schemaName: 'UserInfo', isArray: false },
            defaultValue: { type: 'object', value: {} },
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
          }
        ]
      };

      (SchemaSpecificationParser.parse as any).mockReturnValue(
        createMockParseResult(true, mockSpec, [])
      );

      const result = SchemaSpecificationValidator.validate('schema with complex field');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle parser exceptions gracefully', () => {
      (SchemaSpecificationParser.parse as any).mockImplementation(() => {
        throw new Error('Parser crashed unexpectedly');
      });

      const result = SchemaSpecificationValidator.validate('problematic schema');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Parser crashed unexpectedly');
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle non-Error exceptions', () => {
      (SchemaSpecificationParser.parse as any).mockImplementation(() => {
        throw 'String error';
      });

      const result = SchemaSpecificationValidator.validate('problematic schema');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Unknown validation error');
    });
  });

  describe('Validation Summary Formatting', () => {
    it('should format valid schema summaries', () => {
      const mockSpec = createMockSpecification('UserCreated', 'Events', 3);
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        specification: mockSpec
      };

      const summary = SchemaSpecificationValidator.formatValidationSummary(result);

      expect(summary).toBe('✅ Valid Events schema "UserCreated" with 3 fields');
    });

    it('should format invalid schema summaries with error count', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [createMockError('Error 1'), createMockError('Error 2')],
        warnings: [],
      };

      const summary = SchemaSpecificationValidator.formatValidationSummary(result);

      expect(summary).toBe('❌ Invalid specification (2 errors)');
    });

    it('should format invalid schema summaries with warning count', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [createMockError('Error 1')],
        warnings: [createMockError('Warning 1', 'warning'), createMockError('Warning 2', 'warning')],
      };

      const summary = SchemaSpecificationValidator.formatValidationSummary(result);

      expect(summary).toBe('❌ Invalid specification (1 error) (2 warnings)');
    });

    it('should format single counts correctly', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [createMockError('Error 1')],
        warnings: [createMockError('Warning 1', 'warning')],
      };

      const summary = SchemaSpecificationValidator.formatValidationSummary(result);

      expect(summary).toBe('❌ Invalid specification (1 error) (1 warning)');
    });
  });

  describe('Error Message Formatting', () => {
    it('should format errors with location information', () => {
      const errors = [
        {
          message: 'Syntax error',
          severity: 'error' as const,
          location: { start: { line: 3, column: 15 }, end: { line: 3, column: 20 } }
        },
        {
          message: 'Type mismatch',
          severity: 'error' as const,
          location: { start: { line: 7, column: 8 }, end: { line: 7, column: 12 } }
        }
      ];

      const formatted = SchemaSpecificationValidator.formatErrors(errors);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe('Line 3, Column 15: Syntax error');
      expect(formatted[1]).toBe('Line 7, Column 8: Type mismatch');
    });

    it('should format errors without location information', () => {
      const errors = [
        { message: 'General error', severity: 'error' as const },
        { message: 'Another error', severity: 'error' as const }
      ];

      const formatted = SchemaSpecificationValidator.formatErrors(errors);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe('General error');
      expect(formatted[1]).toBe('Another error');
    });
  });

  describe('Demonstration Function', () => {
    it('should exist and be callable', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock parse results for the demo examples
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce(createMockParseResult(true, createMockSpecification('CreateUser', 'Commands', 4), []))
        .mockReturnValueOnce(createMockParseResult(true, createMockSpecification('UserRegistered', 'Events', 4), []))
        .mockReturnValueOnce(createMockParseResult(false, undefined, [createMockError('Missing closing brace')]));

      // Import the function dynamically to check if it exists
      expect(typeof SchemaSpecificationValidator.demonstrateParser).toBe('function');
      
      expect(() => {
        SchemaSpecificationValidator.demonstrateParser();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});