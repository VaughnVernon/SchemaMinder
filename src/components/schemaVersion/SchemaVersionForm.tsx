import React from 'react';
import { SchemaVersion, SchemaTypeCategory } from '../../types/schema';
import { DialogMode } from '../../types/dialogMode';
import { useSchemaVersionFormState } from '../../hooks/schemaVersion/useSchemaVersionFormState';
import { useSchemaVersionInitialization } from '../../hooks/schemaVersion/useSchemaVersionInitialization';
import { useSemanticVersionValidation } from '../../hooks/schemaVersion/useSemanticVersionValidation';
import { useSchemaCompatibilityValidation } from '../../hooks/schemaVersion/useSchemaCompatibilityValidation';
import { useSchemaVersionKeyboardShortcutsWithState } from '../../hooks/schemaVersion/useSchemaVersionKeyboardShortcuts';
import { useSchemaVersionBusinessRules } from '../../hooks/schemaVersion/useSchemaVersionBusinessRules';
import { SchemaVersionStatusNotice } from './SchemaVersionStatusNotice';
import { SchemaVersionFieldsWithState } from './SchemaVersionFields';
import { SchemaVersionModalsWithState } from './SchemaVersionModals';
import { getCategoryIcon, buildVersionData, validateFormReadiness } from './tools';

interface SchemaVersionFormProps {
  mode: DialogMode;
  schemaVersion?: SchemaVersion; // Only required for Edit mode
  schemaId?: string; // Only required for New mode
  currentVersion?: string; // Only required for New mode
  suggestedVersion?: string; // Suggested next version for New mode
  previousSpecification?: string; // Previous version's specification to copy
  schemaName?: string; // Optional schema name for better title display
  schemaCategory?: SchemaTypeCategory; // Schema type category for validation
  onSubmit: (data: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

/**
 * Refactored SchemaVersionForm component with reduced complexity.
 * Logic has been extracted into custom hooks and sub-components.
 */
export const SchemaVersionForm: React.FC<SchemaVersionFormProps> = ({
  mode,
  schemaVersion,
  schemaId,
  currentVersion,
  suggestedVersion,
  previousSpecification,
  schemaName,
  schemaCategory,
  onSubmit,
  onCancel
}) => {
  // Consolidated form state management
  const formState = useSchemaVersionFormState(mode, schemaName);
  
  // Business rules for field editability and status transitions
  const businessRules = useSchemaVersionBusinessRules({
    mode,
    status: formState.status
  });
  
  // Initialize form fields based on mode and props
  useSchemaVersionInitialization({
    mode,
    schemaVersion,
    suggestedVersion,
    previousSpecification,
    setSpecification: formState.setSpecification,
    setSemanticVersion: formState.setSemanticVersion,
    setDescription: formState.setDescription,
    setStatus: formState.setStatus
  });
  
  // Semantic version validation
  useSemanticVersionValidation({
    semanticVersion: formState.semanticVersion,
    setSemanticVersionError: formState.setSemanticVersionError
  });
  
  // Compatibility validation logic
  const { handleCompatibilityValidation } = useSchemaCompatibilityValidation({
    mode,
    previousSpecification,
    currentVersion,
    setCompatibilityErrors: formState.setCompatibilityErrors,
    setCompatibilityModalType: formState.setCompatibilityModalType,
    setCompatibilityModalTitle: formState.setCompatibilityModalTitle,
    setCompatibilityModalMessage: formState.setCompatibilityModalMessage,
    setCompatibilityModalDetails: formState.setCompatibilityModalDetails,
    setShowCompatibilityModal: formState.setShowCompatibilityModal,
    setPendingSubmission: formState.setPendingSubmission
  });
  
  // Handle status changes with confirmation
  const handleStatusChange = (newStatus: string) => {
    businessRules.handleStatusChange(
      newStatus as any,
      formState.description,
      formState.setStatus,
      formState.setDescription,
      formState.setPendingStatus,
      formState.setShowStatusConfirmation
    );
  };
  
  // Handle status confirmation
  const handleStatusConfirmation = (confirmed: boolean) => {
    businessRules.handleStatusConfirmation(
      confirmed,
      formState.pendingStatus,
      formState.description,
      formState.setStatus,
      formState.setDescription,
      formState.setPendingStatus,
      formState.setShowStatusConfirmation
    );
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form readiness
    const validation = validateFormReadiness(
      formState.isEditMode,
      formState.status,
      formState.semanticVersionError,
      formState.isSpecificationValid,
      formState.specificationErrors,
      formState.compatibilityErrors
    );

    if (!validation.isValid) {
      formState.showError(validation.errorMessage!);
      return;
    }
    
    // Build version data
    const versionData = buildVersionData(
      formState.specification,
      formState.semanticVersion,
      formState.description,
      formState.status,
      schemaId || '',
      formState.isEditMode,
      schemaVersion
    );
    
    // Run compatibility validation and submit
    if (handleCompatibilityValidation(versionData)) {
      onSubmit(versionData);
    }
  };
  
  // Handle compatibility modal actions
  const onConfirmCompatibilityModal = () => {
    if (formState.pendingSubmission) {
      onSubmit(formState.pendingSubmission);
      formState.setPendingSubmission(null);
      formState.setShowCompatibilityModal(false);
    }
  };
  
  const onCancelCompatibilityModal = () => {
    formState.setPendingSubmission(null);
    formState.setShowCompatibilityModal(false);
  };
  
  // Keyboard shortcuts handling
  useSchemaVersionKeyboardShortcutsWithState(
    formState,
    schemaVersion,
    schemaId,
    handleCompatibilityValidation,
    onSubmit,
    onCancel
  );
  
  return (
    <>
      <form onSubmit={handleSubmit} className="form" role="form">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getCategoryIcon(schemaCategory)}
          {formState.title}
        </h3>
        
        {!formState.isEditMode && currentVersion && (
          <p>Current version: {currentVersion}</p>
        )}
        
        <SchemaVersionStatusNotice
          status={formState.status}
          isEditMode={formState.isEditMode}
        />
        
        <SchemaVersionFieldsWithState
          formState={formState}
          isFieldEditable={businessRules.isFieldEditable}
          getAllowedStatusOptions={businessRules.getAllowedStatusOptions}
          handleStatusChange={handleStatusChange}
          schemaCategory={schemaCategory}
        />
        
        <div>
          <button
            type="submit"
            className="button"
            disabled={!!formState.semanticVersionError || (formState.isEditMode && formState.status === 'Removed')}
          >
            {formState.submitButtonText}
          </button>
          <button type="button" onClick={onCancel} className="button secondary">
            Cancel
          </button>
        </div>
      </form>
      
      <SchemaVersionModalsWithState
        formState={formState}
        onConfirmCompatibilityModal={onConfirmCompatibilityModal}
        onCancelCompatibilityModal={onCancelCompatibilityModal}
        onConfirmStatusChange={handleStatusConfirmation}
      />
    </>
  );
};