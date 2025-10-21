import { useCallback } from 'react';
import { SchemaStatus } from '../../types/schema';
import { DialogMode } from '../../types/dialogMode';
import { isFieldEditableByStatus, getAllowedStatusTransitions } from '../../components/schemaVersion/tools';
import { VALIDATION_MESSAGES } from '../../components/schemaVersion/constants';

interface UseSchemaVersionBusinessRulesProps {
  mode: DialogMode;
  status: SchemaStatus;
}

interface BusinessRulesReturn {
  isFieldEditable: (fieldName: string) => boolean;
  getAllowedStatusOptions: () => SchemaStatus[];
  handleStatusChange: (newStatus: SchemaStatus, currentDescription: string, setStatus: (status: SchemaStatus) => void, setDescription: (desc: string) => void, setPendingStatus: (status: SchemaStatus | null) => void, setShowStatusConfirmation: (show: boolean) => void) => void;
  handleStatusConfirmation: (confirmed: boolean, pendingStatus: SchemaStatus | null, currentDescription: string, setStatus: (status: SchemaStatus) => void, setDescription: (desc: string) => void, setPendingStatus: (status: SchemaStatus | null) => void, setShowStatusConfirmation: (show: boolean) => void) => void;
}

/**
 * Custom hook to handle business rules for schema version form
 * Extracts field editability, status transitions, and related business logic
 */
export const useSchemaVersionBusinessRules = ({
  mode,
  status
}: UseSchemaVersionBusinessRulesProps): BusinessRulesReturn => {
  
  // Check if a specific field is editable
  const isFieldEditable = useCallback((fieldName: string): boolean => {
    return isFieldEditableByStatus(fieldName, status, mode === DialogMode.Edit);
  }, [status, mode]);
  
  // Get allowed status options based on current status
  const getAllowedStatusOptions = useCallback((): SchemaStatus[] => {
    return getAllowedStatusTransitions(status, mode === DialogMode.Edit);
  }, [status, mode]);
  
  // Handle status change with confirmation for destructive operations
  const handleStatusChange = useCallback((
    newStatus: SchemaStatus,
    currentDescription: string,
    setStatus: (status: SchemaStatus) => void,
    setDescription: (desc: string) => void,
    setPendingStatus: (status: SchemaStatus | null) => void,
    setShowStatusConfirmation: (show: boolean) => void
  ) => {
    if (newStatus === SchemaStatus.Deprecated || newStatus === SchemaStatus.Removed) {
      // Show confirmation modal for destructive status changes
      setPendingStatus(newStatus);
      setShowStatusConfirmation(true);
    } else {
      // Direct change for non-destructive statuses
      setStatus(newStatus);
    }
  }, []);
  
  // Handle status confirmation result
  const handleStatusConfirmation = useCallback((
    confirmed: boolean,
    pendingStatus: SchemaStatus | null,
    currentDescription: string,
    setStatus: (status: SchemaStatus) => void,
    setDescription: (desc: string) => void,
    setPendingStatus: (status: SchemaStatus | null) => void,
    setShowStatusConfirmation: (show: boolean) => void
  ) => {
    if (confirmed && pendingStatus) {
      // User confirmed - apply the status change
      setStatus(pendingStatus);

      // If setting to Deprecated, add the *DEPRECATED*: prefix to description if not already present
      if (pendingStatus === SchemaStatus.Deprecated) {
        const deprecatedPrefix = VALIDATION_MESSAGES.DEPRECATED_PREFIX;
        if (!currentDescription.startsWith(deprecatedPrefix)) {
          setDescription(deprecatedPrefix + currentDescription);
        }
      }
    }
    // Reset confirmation state regardless of choice
    setPendingStatus(null);
    setShowStatusConfirmation(false);
  }, []);
  
  return {
    isFieldEditable,
    getAllowedStatusOptions,
    handleStatusChange,
    handleStatusConfirmation
  };
};