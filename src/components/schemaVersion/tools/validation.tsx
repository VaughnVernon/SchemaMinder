import { SchemaStatus } from '../../../types/schema';
import { VALIDATION_MESSAGES } from '../constants';

/**
 * Validation utilities for schema version forms
 * Complexity: ~4 points total
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validate form submission readiness
 * Complexity: 4 points (3 if conditions + 1 logical OR)
 */
export const validateFormReadiness = (
  isEditMode: boolean,
  status: SchemaStatus,
  semanticVersionError: string | null,
  isSpecificationValid: boolean,
  specificationErrors: string[],
  compatibilityErrors: string[]
): ValidationResult => {
  // Check if version is removed (read-only)
  if (isEditMode && status === SchemaStatus.Removed) {
    return {
      isValid: false,
      errorMessage: VALIDATION_MESSAGES.REMOVED_VERSION_ERROR
    };
  }

  // Check semantic version validity
  if (semanticVersionError) {
    return {
      isValid: false,
      errorMessage: semanticVersionError
    };
  }

  // Check for any validation errors
  const allErrors = [...specificationErrors, ...compatibilityErrors];
  if (!isSpecificationValid || allErrors.length > 0) {
    return {
      isValid: false,
      errorMessage: VALIDATION_MESSAGES.FIX_ERRORS_MESSAGE
    };
  }

  return { isValid: true };
};