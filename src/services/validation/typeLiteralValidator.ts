/**
 * Dedicated service for validating type literals in schema specifications
 */

import { ParseError, SchemaSpecification } from '../../parser';
import { validateTypeLiteral } from './typeValidators';

export class TypeLiteralValidator {
  /**
   * Validate all field type literals in a specification
   */
  static validateSpecification(specification: SchemaSpecification): ParseError[] {
    const errors: ParseError[] = [];
    
    for (const field of specification.fields) {
      if (field.defaultValue && field.type.kind === 'primitive') {
        const fieldErrors = this.validateField(field);
        errors.push(...fieldErrors);
      }
    }
    
    return errors;
  }

  /**
   * Validate a single field's default value against its type
   */
  private static validateField(field: any): ParseError[] {
    const typeError = this.validatePrimitiveType(field.name, field.type, field.defaultValue);
    if (typeError) {
      return [{
        message: typeError,
        severity: 'error',
        location: field.location
      }];
    }
    return [];
  }

  /**
   * Validate a primitive type field (handles both single values and arrays)
   */
  private static validatePrimitiveType(fieldName: string, fieldType: any, defaultValue: any): string | null {
    // Handle array types
    if (fieldType.isArray) {
      return this.validateArrayType(fieldName, fieldType, defaultValue);
    }
    
    // Handle single primitive types
    return validateTypeLiteral(fieldType.type, defaultValue, fieldName);
  }

  /**
   * Validate an array type field
   */
  private static validateArrayType(fieldName: string, fieldType: any, defaultValue: any): string | null {
    if (defaultValue.type !== 'array') {
      return `Field '${fieldName}': array field requires array literal { ... }`;
    }
    
    // Validate each element in the array
    for (let i = 0; i < defaultValue.elements.length; i++) {
      const elementError = validateTypeLiteral(fieldType.type, defaultValue.elements[i], `${fieldName}[${i}]`);
      if (elementError) return elementError;
    }
    
    return null;
  }
}