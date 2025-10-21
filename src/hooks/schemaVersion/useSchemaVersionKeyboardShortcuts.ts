import { useEffect } from 'react';
import { SchemaVersion, SchemaStatus } from '../../types/schema';
import { buildVersionData, validateFormReadiness } from '../../components/schemaVersion/tools';
import { SchemaVersionFormState } from './useSchemaVersionFormState';

interface UseSchemaVersionKeyboardShortcutsProps {
  // Form state
  specification: string;
  semanticVersion: string;
  description: string;
  status: SchemaStatus;
  isEditMode: boolean;
  
  // Validation states
  semanticVersionError: string | null;
  isSpecificationValid: boolean;
  specificationErrors: string[];
  compatibilityErrors: string[];
  
  // Schema data
  schemaVersion?: SchemaVersion;
  schemaId?: string;
  
  // Functions
  showError: (message: string) => void;
  handleCompatibilityValidation: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => boolean;
  onSubmit: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

/**
 * Custom hook to handle keyboard shortcuts for the schema version form
 * Extracts the keyboard shortcut handling logic from the main component
 */
export const useSchemaVersionKeyboardShortcuts = ({
  specification,
  semanticVersion,
  description,
  status,
  isEditMode,
  semanticVersionError,
  isSpecificationValid,
  specificationErrors,
  compatibilityErrors,
  schemaVersion,
  schemaId,
  showError,
  handleCompatibilityValidation,
  onSubmit,
  onCancel
}: UseSchemaVersionKeyboardShortcutsProps) => {
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save/create
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();

        // Validate form readiness
        const validation = validateFormReadiness(
          isEditMode,
          status,
          semanticVersionError,
          isSpecificationValid,
          specificationErrors,
          compatibilityErrors
        );

        if (!validation.isValid) {
          showError(validation.errorMessage!);
          return;
        }

        // Build version data
        const versionData = buildVersionData(
          specification,
          semanticVersion,
          description,
          status,
          schemaId || '',
          isEditMode,
          schemaVersion
        );

        // Run compatibility validation and submit
        if (handleCompatibilityValidation(versionData)) {
          onSubmit(versionData);
        }
      }
      
      // Esc for cancel
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    specification,
    semanticVersion,
    description,
    status,
    isEditMode,
    semanticVersionError,
    isSpecificationValid,
    specificationErrors,
    compatibilityErrors,
    schemaVersion,
    schemaId,
    showError,
    handleCompatibilityValidation,
    onSubmit,
    onCancel
  ]);
};

/**
 * Convenience hook that works with SchemaVersionFormState
 */
export const useSchemaVersionKeyboardShortcutsWithState = (
  formState: SchemaVersionFormState,
  schemaVersion: SchemaVersion | undefined,
  schemaId: string | undefined,
  handleCompatibilityValidation: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => boolean,
  onSubmit: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => void,
  onCancel: () => void
) => {
  return useSchemaVersionKeyboardShortcuts({
    specification: formState.specification,
    semanticVersion: formState.semanticVersion,
    description: formState.description,
    status: formState.status,
    isEditMode: formState.isEditMode,
    semanticVersionError: formState.semanticVersionError,
    isSpecificationValid: formState.isSpecificationValid,
    specificationErrors: formState.specificationErrors,
    compatibilityErrors: formState.compatibilityErrors,
    schemaVersion,
    schemaId,
    showError: formState.showError,
    handleCompatibilityValidation,
    onSubmit,
    onCancel
  });
};