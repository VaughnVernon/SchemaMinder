import { describe, it, expect } from 'vitest';
import {
  convertToFrontendDate,
  convertToAPIDate,
  isValidSchemaScope,
  isValidSchemaStatus,
  isValidSchemaTypeCategory,
  SchemaScope,
  SchemaStatus,
  SchemaTypeCategory
} from '../../src/types/schema';

describe('Schema Types Utility Functions', () => {
  
  describe('Date Conversion Functions', () => {
    describe('convertToFrontendDate', () => {
      it('should convert ISO string to Date object', () => {
        const isoString = '2024-01-15T10:30:00.000Z';
        const result = convertToFrontendDate(isoString);
        
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(isoString);
      });

      it('should handle various date string formats', () => {
        const dateString = '2023-12-25T12:00:00.000Z';
        const result = convertToFrontendDate(dateString);
        
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(dateString);
        expect(result.getUTCFullYear()).toBe(2023);
        expect(result.getUTCMonth()).toBe(11); // December is month 11
        expect(result.getUTCDate()).toBe(25);
      });
    });

    describe('convertToAPIDate', () => {
      it('should convert Date object to ISO string', () => {
        const date = new Date('2024-01-15T10:30:00.000Z');
        const result = convertToAPIDate(date);
        
        expect(typeof result).toBe('string');
        expect(result).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should handle current date conversion', () => {
        const now = new Date();
        const result = convertToAPIDate(now);
        
        expect(typeof result).toBe('string');
        expect(result).toBe(now.toISOString());
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });
  });

  describe('Type Guard Functions', () => {
    describe('isValidSchemaScope', () => {
      it('should return true for valid schema scopes', () => {
        expect(isValidSchemaScope('Public')).toBe(true);
        expect(isValidSchemaScope('Private')).toBe(true);
        expect(isValidSchemaScope(SchemaScope.Public)).toBe(true);
        expect(isValidSchemaScope(SchemaScope.Private)).toBe(true);
      });

      it('should return false for invalid schema scopes', () => {
        expect(isValidSchemaScope('Invalid')).toBe(false);
        expect(isValidSchemaScope('public')).toBe(false); // case sensitive
        expect(isValidSchemaScope('PRIVATE')).toBe(false); // case sensitive
        expect(isValidSchemaScope('')).toBe(false);
        expect(isValidSchemaScope('Protected')).toBe(false);
      });
    });

    describe('isValidSchemaStatus', () => {
      it('should return true for valid schema statuses', () => {
        expect(isValidSchemaStatus('Draft')).toBe(true);
        expect(isValidSchemaStatus('Published')).toBe(true);
        expect(isValidSchemaStatus('Deprecated')).toBe(true);
        expect(isValidSchemaStatus('Removed')).toBe(true);
        expect(isValidSchemaStatus(SchemaStatus.Draft)).toBe(true);
        expect(isValidSchemaStatus(SchemaStatus.Published)).toBe(true);
        expect(isValidSchemaStatus(SchemaStatus.Deprecated)).toBe(true);
        expect(isValidSchemaStatus(SchemaStatus.Removed)).toBe(true);
      });

      it('should return false for invalid schema statuses', () => {
        expect(isValidSchemaStatus('Invalid')).toBe(false);
        expect(isValidSchemaStatus('draft')).toBe(false); // case sensitive
        expect(isValidSchemaStatus('PUBLISHED')).toBe(false); // case sensitive
        expect(isValidSchemaStatus('')).toBe(false);
        expect(isValidSchemaStatus('Active')).toBe(false);
        expect(isValidSchemaStatus('Pending')).toBe(false);
      });
    });

    describe('isValidSchemaTypeCategory', () => {
      it('should return true for valid schema type categories', () => {
        expect(isValidSchemaTypeCategory('Commands')).toBe(true);
        expect(isValidSchemaTypeCategory('Data')).toBe(true);
        expect(isValidSchemaTypeCategory('Documents')).toBe(true);
        expect(isValidSchemaTypeCategory('Envelopes')).toBe(true);
        expect(isValidSchemaTypeCategory('Events')).toBe(true);
        expect(isValidSchemaTypeCategory('Queries')).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Commands)).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Data)).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Documents)).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Envelopes)).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Events)).toBe(true);
        expect(isValidSchemaTypeCategory(SchemaTypeCategory.Queries)).toBe(true);
      });

      it('should return false for invalid schema type categories', () => {
        expect(isValidSchemaTypeCategory('Invalid')).toBe(false);
        expect(isValidSchemaTypeCategory('commands')).toBe(false); // case sensitive
        expect(isValidSchemaTypeCategory('DATA')).toBe(false); // case sensitive
        expect(isValidSchemaTypeCategory('')).toBe(false);
        expect(isValidSchemaTypeCategory('Schemas')).toBe(false);
        expect(isValidSchemaTypeCategory('Models')).toBe(false);
        expect(isValidSchemaTypeCategory('Types')).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle date conversion roundtrip correctly', () => {
      const originalDate = new Date('2024-06-15T14:20:30.500Z');
      const apiString = convertToAPIDate(originalDate);
      const frontendDate = convertToFrontendDate(apiString);
      
      expect(frontendDate.getTime()).toBe(originalDate.getTime());
    });

    it('should handle type guards with non-string inputs gracefully', () => {
      // These should not throw but return false
      expect(isValidSchemaScope(null as any)).toBe(false);
      expect(isValidSchemaStatus(undefined as any)).toBe(false);
      expect(isValidSchemaTypeCategory(123 as any)).toBe(false);
    });
  });
});