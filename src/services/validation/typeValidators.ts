/**
 * Simplified type validators using configuration-driven rules
 * This replaces complex conditional logic with data-driven validation
 */

import { validateWithRules } from './typeRules';

/**
 * Validate a single type literal using rule-based validation
 * This is the main entry point that replaces the old switch-based system
 */
export function validateTypeLiteral(primitiveType: string, literal: any, fieldRef: string): string | null {
  return validateWithRules(primitiveType, literal, fieldRef);
}