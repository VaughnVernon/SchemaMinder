import { SchemaStatus } from '../../../types/schema';
import { STATUS_FIELD_EDITABILITY, STATUS_TRANSITIONS } from '../constants';

/**
 * Status-based business rules utilities
 * Complexity: ~4 points total
 */

/**
 * Check if a specific field is editable based on status
 * Simplified from switch statement to object lookup
 * Complexity: 2 points (1 if condition + 1 ternary)
 */
export const isFieldEditableByStatus = (
  fieldName: string,
  status: SchemaStatus,
  isEditMode: boolean
): boolean => {
  // New versions can edit all fields
  if (!isEditMode) return true;
  
  // Use lookup table for edit mode
  const editableFields = STATUS_FIELD_EDITABILITY[status];
  return editableFields ? editableFields.has(fieldName) : true;
};

/**
 * Get allowed status transitions based on current status
 * Simplified from switch statement to object lookup
 * Complexity: 2 points (1 if condition + 1 logical OR)
 */
export const getAllowedStatusTransitions = (
  currentStatus: SchemaStatus,
  isEditMode: boolean
): SchemaStatus[] => {
  // New versions can select any status
  if (!isEditMode) return Object.values(SchemaStatus);
  
  // Use lookup table for edit mode
  return STATUS_TRANSITIONS[currentStatus] || Object.values(SchemaStatus);
};