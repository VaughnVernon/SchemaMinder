import { SchemaVersion, SchemaStatus } from '../../../types/schema';
import { DialogMode } from '../../../types/dialogMode';

/**
 * Text and data formatting utilities
 * Complexity: ~4 points total
 */

/**
 * Build version data object from form state
 * Complexity: 1 point (1 ternary condition)
 */
export const buildVersionData = (
  specification: string,
  semanticVersion: string,
  description: string,
  status: SchemaStatus,
  schemaId: string,
  isEditMode: boolean,
  schemaVersion?: SchemaVersion
): Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    specification,
    semanticVersion,
    description: description.trim() || undefined,
    status,
    schemaId: isEditMode ? (schemaVersion?.schemaId || '') : schemaId
  };
};

/**
 * Format compatibility errors for display
 * Complexity: 1 point (no branching logic)
 */
export const formatCompatibilityError = (error: string): string[] => {
  return error.split('\n');
};

/**
 * Get form title based on mode and schema name
 * Complexity: 2 points (1 ternary + 1 ternary)
 */
export const getFormTitle = (mode: DialogMode, schemaName?: string): string => {
  const baseTitle = mode === DialogMode.Edit ? 'Edit' : 'New';
  return schemaName ? `${baseTitle} ${schemaName} Version` : `${baseTitle} Schema Version`;
};

/**
 * Get submit button text based on mode
 * Complexity: 1 point (1 ternary condition)
 */
export const getSubmitButtonText = (mode: DialogMode): string => {
  return mode === DialogMode.Edit ? 'Save' : 'Create';
};