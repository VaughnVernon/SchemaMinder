import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  SchemaSpecificationCompatibilityValidator, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning 
} from '../../src/services/schemaSpecificationCompatibilityValidator';
import { SchemaSpecification, FieldDeclaration } from '../../src/parser/types';
import { SchemaSpecificationParser } from '../../src/parser';

// Mock the parser
vi.mock('../../src/parser', () => ({
  SchemaSpecificationParser: {
    parse: vi.fn()
  }
}));

describe('SchemaSpecificationCompatibilityValidator', () => {
  let validator: SchemaSpecificationCompatibilityValidator;
  
  beforeEach(() => {
    validator = new SchemaSpecificationCompatibilityValidator();
    vi.clearAllMocks();
  });

  // Helper function to create mock specifications
  const createMockSpec = (fields: Array<{name: string, type: string, isArray?: boolean, required?: boolean}>): SchemaSpecification => ({
    category: 'Commands',
    name: 'TestCommand',
    fields: fields.map(field => ({
      name: field.name,
      type: {
        kind: 'primitive' as const,
        type: field.type,
        isArray: field.isArray || false
      },
      defaultValue: field.required === false ? 'default' : undefined,
      location: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
    } as FieldDeclaration))
  });

  const mockSuccessfulParse = (spec: SchemaSpecification) => {
    (SchemaSpecificationParser.parse as any).mockReturnValue({
      success: true,
      specification: spec,
      errors: []
    });
  };

  const mockFailedParse = () => {
    (SchemaSpecificationParser.parse as any).mockReturnValue({
      success: false,
      specification: null,
      errors: [{ message: 'Parse error', severity: 'error' }]
    });
  };

  describe('Version Validation', () => {
    it('should reject invalid semantic versions', () => {
      const result = validator.validateCompatibility('', '1.0.0', '', 'invalid-version');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_VERSION');
      expect(result.errors[0].message).toContain('Invalid semantic version format');
    });

    it('should reject version that does not increase', () => {
      mockSuccessfulParse(createMockSpec([]));
      
      const result = validator.validateCompatibility('', '2.0.0', '', '1.0.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_VERSION')).toBe(true);
    });

    it('should accept increasing versions', () => {
      const currentSpec = createMockSpec([{ name: 'field1', type: 'string' }]);
      const newSpec = createMockSpec([{ name: 'field1', type: 'string' }]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Parse Error Handling', () => {
    it('should handle specification parse failures', () => {
      mockFailedParse();
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('PARSE_ERROR');
      expect(result.errors[0].message).toContain('Failed to parse schema specification');
    });

    it('should handle parser exceptions', () => {
      (SchemaSpecificationParser.parse as any).mockImplementation(() => {
        throw new Error('Parser crashed');
      });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('PARSE_ERROR');
      expect(result.errors[0].message).toContain('Failed to parse schema specification');
    });
  });

  describe('Breaking Changes Detection', () => {
    it('should detect removed fields as breaking changes', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' },
        { name: 'field2', type: 'int' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'string' }
        // field2 removed
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('BREAKING_CHANGE');
      expect(result.errors[0].message).toContain('Breaking changes detected');
      expect(result.errors[0].details).toContain("Field 'field2' was removed");
    });

    it('should detect type changes as breaking changes', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'int' }
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].details).toContain("Field 'field1' type changed from 'string' to 'int'");
    });

    it('should allow breaking changes with major version increment', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'int' } // type change
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '2.0.0');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Breaking change detected (allowed with major version increment)');
    });
  });

  describe('Additive Changes Detection', () => {
    it('should detect new fields as additive changes', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'string' },
        { name: 'field2', type: 'int' }
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about unnecessary major version increment for additive changes', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'string' },
        { name: 'field2', type: 'int' }
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.0.0', '', '2.0.0');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Major version increment may be unnecessary');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty specifications', () => {
      const emptySpec = createMockSpec([]);
      mockSuccessfulParse(emptySpec);
      
      const result = validator.validateCompatibility('', '1.0.0', '', '1.1.0');
      
      expect(result.isValid).toBe(true);
    });

    it('should provide proper error suggestions for major version increments', () => {
      const currentSpec = createMockSpec([
        { name: 'field1', type: 'string' }
      ]);
      const newSpec = createMockSpec([
        { name: 'field1', type: 'int' }
      ]);
      
      (SchemaSpecificationParser.parse as any)
        .mockReturnValueOnce({ success: true, specification: currentSpec, errors: [] })
        .mockReturnValueOnce({ success: true, specification: newSpec, errors: [] });
      
      const result = validator.validateCompatibility('', '1.5.3', '', '1.6.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].details).toContain('To fix: Increment the major version from 1 to 2 (e.g., 2.0.0)');
    });
  });
});