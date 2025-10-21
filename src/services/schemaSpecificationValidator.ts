/**
 * Schema specification validation service using the ANTLR parser
 */

import { SchemaSpecificationParser, ParseError, SchemaSpecification } from '../parser';
import { TypeLiteralValidator } from './validation/typeLiteralValidator';
import { ValidationErrorFormatter } from './validation/errorFormatter';

export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
  specification?: SchemaSpecification;
}

/**
 * Validates schema specifications and provides detailed error reporting
 */
export class SchemaSpecificationValidator {
  
  /**
   * Validate a schema specification text
   */
  static validate(specificationText: string, expectedCategory?: string): ValidationResult {
    try {
      const parseResult = SchemaSpecificationParser.parse(specificationText, expectedCategory);
      
      let errors = parseResult.errors.filter(e => e.severity === 'error');
      const warnings = parseResult.errors.filter(e => e.severity === 'warning');
      
      // Add type-literal validation if parsing was successful
      if (parseResult.success && parseResult.specification) {
        const typeLiteralErrors = TypeLiteralValidator.validateSpecification(parseResult.specification);
        errors = [...errors, ...typeLiteralErrors];
      }
      
      return {
        isValid: parseResult.success && errors.length === 0,
        errors,
        warnings,
        specification: parseResult.specification
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Get a human-readable summary of validation results
   */
  static formatValidationSummary(result: ValidationResult): string {
    return ValidationErrorFormatter.formatValidationSummary(result);
  }


  /**
   * Format detailed error messages for display
   */
  static formatErrors(errors: ParseError[]): string[] {
    return ValidationErrorFormatter.formatErrors(errors);
  }
  
  /**
   * Static wrapper for demonstrateParser function
   */
  static demonstrateParser(): void {
    return demonstrateParser();
  }
}

// Example usage and demo function
export function demonstrateParser(): void {
  const examples = [
    {
      name: 'Valid Command',
      spec: `command CreateUser {
  schemaTypeName typeName
  version currentVersion
  timestamp createdAt
  string username = "defaultUser"
  boolean isActive = true
}`
    },
    {
      name: 'Valid Event with References',
      spec: `event UserRegistered {
  schemaTypeName eventType
  version schemaVersion
  timestamp occurredOn
  data.PersonalInfo personalInfo
  string[] roles = { "user", "admin" }
}`
    },
    {
      name: 'Invalid Syntax',
      spec: `command BadCommand {
  string name
  // missing closing brace`
    }
  ];

  console.log('=== Schema Specification Parser Demo ===\n');

  examples.forEach(example => {
    console.log(`${example.name}:`);
    console.log(example.spec);
    console.log('---');
    
    const result = SchemaSpecificationValidator.validate(example.spec);
    console.log(SchemaSpecificationValidator.formatValidationSummary(result));
    
    if (!result.isValid) {
      const errorMessages = SchemaSpecificationValidator.formatErrors(result.errors);
      errorMessages.forEach(msg => console.log(`  ${msg}`));
    }
    
    console.log('\n');
  });
}