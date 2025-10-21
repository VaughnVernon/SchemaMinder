/**
 * Dedicated service for formatting validation errors and results
 */

import { ParseError } from '../../parser';
import type { ValidationResult } from '../schemaSpecificationValidator';

export class ValidationErrorFormatter {
  /**
   * Get a human-readable summary of validation results
   */
  static formatValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      const spec = result.specification!;
      return `✅ Valid ${spec.category} schema "${spec.name}" with ${spec.fields.length} fields`;
    }

    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    
    let summary = `❌ Invalid specification`;
    if (errorCount > 0) summary += ` (${errorCount} error${errorCount > 1 ? 's' : ''})`;
    if (warningCount > 0) summary += ` (${warningCount} warning${warningCount > 1 ? 's' : ''})`;
    
    return summary;
  }

  /**
   * Format detailed error messages for display
   */
  static formatErrors(errors: ParseError[]): string[] {
    return errors.map(error => this.formatError(error));
  }

  /**
   * Format a single error message with location information
   */
  private static formatError(error: ParseError): string {
    let message = error.message;
    if (error.location) {
      message = `Line ${error.location.start.line}, Column ${error.location.start.column}: ${message}`;
    }
    return message;
  }
}