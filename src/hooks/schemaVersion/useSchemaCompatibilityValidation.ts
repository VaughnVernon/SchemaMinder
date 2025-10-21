import { useCallback } from 'react';
import { SchemaVersion } from '../../types/schema';
import { DialogMode } from '../../types/dialogMode';
import { SchemaSpecificationCompatibilityValidator } from '../../services/schemaSpecificationCompatibilityValidator';
import { MODAL_CONFIG } from '../../components/schemaVersion/constants';

interface UseSchemaCompatibilityValidationProps {
  mode: DialogMode;
  previousSpecification?: string;
  currentVersion?: string;
  setCompatibilityErrors: (errors: string[]) => void;
  setCompatibilityModalType: (type: 'warning' | 'error') => void;
  setCompatibilityModalTitle: (title: string) => void;
  setCompatibilityModalMessage: (message: string) => void;
  setCompatibilityModalDetails: (details: string | undefined) => void;
  setShowCompatibilityModal: (show: boolean) => void;
  setPendingSubmission: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> | null) => void;
}

export interface CompatibilityValidationResult {
  isValid: boolean;
  errors: Array<{ message: string; details?: string }>;
  warnings: Array<{ message: string; details?: string }>;
}

/**
 * Custom hook to handle schema compatibility validation
 * Extracts the complex compatibility validation logic from the main component
 */
export const useSchemaCompatibilityValidation = ({
  mode,
  previousSpecification,
  currentVersion,
  setCompatibilityErrors,
  setCompatibilityModalType,
  setCompatibilityModalTitle,
  setCompatibilityModalMessage,
  setCompatibilityModalDetails,
  setShowCompatibilityModal,
  setPendingSubmission
}: UseSchemaCompatibilityValidationProps) => {
  
  // Validate compatibility between versions
  const validateCompatibility = useCallback((
    versionData: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>
  ): CompatibilityValidationResult => {
    // Skip validation for edit mode or if no previous specification
    if (mode === DialogMode.Edit || !previousSpecification || !currentVersion) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const validator = new SchemaSpecificationCompatibilityValidator();
    return validator.validateCompatibility(
      previousSpecification,
      currentVersion,
      versionData.specification,
      versionData.semanticVersion
    );
  }, [mode, previousSpecification, currentVersion]);

  // Handle compatibility validation with UI updates
  const handleCompatibilityValidation = useCallback((
    versionData: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>
  ): boolean => {
    const validationResult = validateCompatibility(versionData);

    if (!validationResult.isValid) {
      // Show errors in the form's error display (blocking errors)
      const errorMessages = validationResult.errors.map(e => {
        const baseMessage = e.message;
        const details = e.details ? `\n${e.details}` : '';
        return `${baseMessage}${details}`;
      });

      setCompatibilityErrors(errorMessages);
      return false;
    } else {
      // Clear any previous compatibility errors
      setCompatibilityErrors([]);
    }

    if (validationResult.warnings.length > 0) {
      // Show warning modal for non-breaking changes
      const warningMessages = validationResult.warnings.map(w => w.message).join('\n');

      setCompatibilityModalType('warning');
      setCompatibilityModalTitle(MODAL_CONFIG.COMPATIBILITY_WARNING_TITLE);
      setCompatibilityModalMessage(MODAL_CONFIG.COMPATIBILITY_WARNING_MESSAGE);
      setCompatibilityModalDetails(warningMessages);
      setShowCompatibilityModal(true);
      setPendingSubmission(versionData);
      return false; // Don't submit yet, wait for user confirmation
    }

    // No issues, proceed with submission
    return true;
  }, [
    validateCompatibility,
    setCompatibilityErrors,
    setCompatibilityModalType,
    setCompatibilityModalTitle,
    setCompatibilityModalMessage,
    setCompatibilityModalDetails,
    setShowCompatibilityModal,
    setPendingSubmission
  ]);

  return {
    validateCompatibility,
    handleCompatibilityValidation
  };
};