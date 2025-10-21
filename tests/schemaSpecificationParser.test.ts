import { describe, it, expect } from 'vitest';
import { SchemaSpecificationParser, TypeCategory, PrimitiveType, SpecialType } from '../src/parser';
import { EXAMPLE_SPECIFICATIONS, INVALID_SPECIFICATIONS } from './parser/examples';

describe('Schema Specification Parser', () => {
  
  describe('Valid Specifications', () => {
    
    it('should parse a simple command specification', () => {
      const result = SchemaSpecificationParser.parse(EXAMPLE_SPECIFICATIONS.simpleCommand);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.specification).toBeDefined();
      
      const spec = result.specification!;
      expect(spec.category).toBe(TypeCategory.Command);
      expect(spec.name).toBe('CreateUser');
      expect(spec.fields).toHaveLength(7);
      
      // Check specific fields
      const usernameField = spec.fields.find(f => f.name === 'username');
      expect(usernameField).toBeDefined();
      expect(usernameField!.type.kind).toBe('primitive');
      expect(usernameField!.defaultValue).toEqual({ type: 'string', value: 'defaultUser' });
      
      const isActiveField = spec.fields.find(f => f.name === 'isActive');
      expect(isActiveField).toBeDefined();
      expect(isActiveField!.defaultValue).toEqual({ type: 'boolean', value: true });
    });
    
    it('should parse complex event with arrays and cross-references', () => {
      const result = SchemaSpecificationParser.parse(EXAMPLE_SPECIFICATIONS.complexEvent);
      
      expect(result.success).toBe(true);
      expect(result.specification).toBeDefined();
      
      const spec = result.specification!;
      expect(spec.category).toBe(TypeCategory.Event);
      expect(spec.name).toBe('UserRegistered');
      
      // Check cross-category reference
      const personalInfoField = spec.fields.find(f => f.name === 'personalInfo');
      expect(personalInfoField).toBeDefined();
      expect(personalInfoField!.type.kind).toBe('complex');
      if (personalInfoField!.type.kind === 'complex') {
        expect(personalInfoField!.type.category).toBe('data');
        expect(personalInfoField!.type.schemaName).toBe('PersonalInfo');
        expect(personalInfoField!.type.isArray).toBe(false);
      }
      
      // Check array reference
      const contactMethodsField = spec.fields.find(f => f.name === 'contactMethods');
      expect(contactMethodsField).toBeDefined();
      expect(contactMethodsField!.type.kind).toBe('complex');
      if (contactMethodsField!.type.kind === 'complex') {
        expect(contactMethodsField!.type.category).toBe('data');
        expect(contactMethodsField!.type.schemaName).toBe('ContactInfo');
        expect(contactMethodsField!.type.isArray).toBe(true);
      }
      
      // Check string array with default
      const rolesField = spec.fields.find(f => f.name === 'roles');
      expect(rolesField).toBeDefined();
      expect(rolesField!.defaultValue).toEqual({
        type: 'array',
        elements: [
          { type: 'string', value: 'user' },
          { type: 'string', value: 'member' }
        ]
      });
    });
    
    it('should parse document with versioned references', () => {
      const result = SchemaSpecificationParser.parse(EXAMPLE_SPECIFICATIONS.documentWithVersions);
      
      expect(result.success).toBe(true);
      expect(result.specification).toBeDefined();
      
      const spec = result.specification!;
      expect(spec.category).toBe(TypeCategory.Document);
      
      // Check versioned reference
      const basicInfoField = spec.fields.find(f => f.name === 'basicInfo');
      expect(basicInfoField).toBeDefined();
      expect(basicInfoField!.type.kind).toBe('complex');
      if (basicInfoField!.type.kind === 'complex') {
        expect(basicInfoField!.type.category).toBe('data');
        expect(basicInfoField!.type.schemaName).toBe('PersonalInfo');
        expect(basicInfoField!.type.version).toBe('1.2.0');
        expect(basicInfoField!.type.isArray).toBe(false);
      }
      
      // Check versioned array reference
      const contactsField = spec.fields.find(f => f.name === 'contacts');
      expect(contactsField).toBeDefined();
      expect(contactsField!.type.kind).toBe('complex');
      if (contactsField!.type.kind === 'complex') {
        expect(contactsField!.type.category).toBe('data');
        expect(contactsField!.type.schemaName).toBe('ContactInfo');
        expect(contactsField!.type.version).toBe('1.1.0');
        expect(contactsField!.type.isArray).toBe(true);
      }
    });
    
    it('should parse all primitive data types correctly', () => {
      const result = SchemaSpecificationParser.parse(EXAMPLE_SPECIFICATIONS.allDataTypes);
      
      expect(result.success).toBe(true);
      expect(result.specification).toBeDefined();
      
      const spec = result.specification!;
      
      // Check special types
      const typeNameField = spec.fields.find(f => f.name === 'commandType');
      expect(typeNameField!.type).toEqual({ kind: 'special', type: SpecialType.SchemaTypeName });
      
      const versionField = spec.fields.find(f => f.name === 'commandVersion');
      expect(versionField!.type).toEqual({ kind: 'special', type: SpecialType.Version });
      
      const timestampField = spec.fields.find(f => f.name === 'issuedAt');
      expect(timestampField!.type).toEqual({ kind: 'special', type: SpecialType.Timestamp });
      
      // Check primitive types
      const flagField = spec.fields.find(f => f.name === 'flag');
      expect(flagField!.type).toEqual({ kind: 'primitive', type: PrimitiveType.Boolean, isArray: false });
      expect(flagField!.defaultValue).toEqual({ type: 'boolean', value: true });
      
      const flagsField = spec.fields.find(f => f.name === 'flags');
      expect(flagsField!.type).toEqual({ kind: 'primitive', type: PrimitiveType.Boolean, isArray: true });
      
      const precisionField = spec.fields.find(f => f.name === 'precision');
      expect(precisionField!.type).toEqual({ kind: 'primitive', type: PrimitiveType.Double, isArray: false });
      expect(precisionField!.defaultValue).toEqual({ type: 'double', value: 3.14159 });
      
      const initialField = spec.fields.find(f => f.name === 'initial');
      expect(initialField!.type).toEqual({ kind: 'primitive', type: PrimitiveType.Char, isArray: false });
      expect(initialField!.defaultValue).toEqual({ type: 'char', value: 'A' });
    });
    
    it('should parse same-category references', () => {
      const result = SchemaSpecificationParser.parse(EXAMPLE_SPECIFICATIONS.allDataTypes);
      
      expect(result.success).toBe(true);
      expect(result.specification).toBeDefined();
      
      const spec = result.specification!;
      
      // Check same-category reference
      const userDataField = spec.fields.find(f => f.name === 'userData');
      expect(userDataField).toBeDefined();
      expect(userDataField!.type.kind).toBe('complex');
      if (userDataField!.type.kind === 'complex') {
        expect(userDataField!.type.category).toBeUndefined(); // Same category
        expect(userDataField!.type.schemaName).toBe('UserData');
        expect(userDataField!.type.isArray).toBe(false);
      }
    });
  });
  
  describe('Invalid Specifications', () => {
    
    it('should report syntax errors for missing braces', () => {
      const result = SchemaSpecificationParser.parse(INVALID_SPECIFICATIONS.missingBrace);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.severity === 'error')).toBe(true);
    });
    
    it('should report errors for invalid type names', () => {
      const result = SchemaSpecificationParser.parse(INVALID_SPECIFICATIONS.invalidType);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should report errors for invalid field types', () => {
      const result = SchemaSpecificationParser.parse(INVALID_SPECIFICATIONS.invalidField);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Validation Only', () => {
    
    it('should validate without building AST', () => {
      const errors = SchemaSpecificationParser.validate(EXAMPLE_SPECIFICATIONS.simpleCommand);
      expect(errors).toHaveLength(0);
    });
    
    it('should return validation errors', () => {
      const errors = SchemaSpecificationParser.validate(INVALID_SPECIFICATIONS.missingBrace);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Edge Cases', () => {
    
    it('should handle empty input', () => {
      const result = SchemaSpecificationParser.parse('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle whitespace-only input', () => {
      const result = SchemaSpecificationParser.parse('   \n\t  ');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle specifications with only comments', () => {
      const result = SchemaSpecificationParser.parse('// This is just a comment\n/* Block comment */');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});