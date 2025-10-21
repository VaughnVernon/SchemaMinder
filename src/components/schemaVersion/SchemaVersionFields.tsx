import React, { useCallback } from 'react';
import { SchemaStatus, SchemaTypeCategory } from '../../types/schema';
import { SpecificationValidator } from '../SpecificationValidator';
import { FORM_LABELS, VALIDATION_MESSAGES } from './constants';
import { formatCompatibilityError } from './tools';
import { SchemaVersionFormState } from '../../hooks/schemaVersion/useSchemaVersionFormState';

interface SchemaVersionFieldsProps {
  // Form state
  semanticVersion: string;
  semanticVersionError: string | null;
  description: string;
  status: SchemaStatus;
  specification: string;
  isSpecificationValid: boolean;
  specificationErrors: string[];
  compatibilityErrors: string[];
  
  // Field setters
  setSemanticVersion: (value: string) => void;
  setDescription: (value: string) => void;
  setSpecification: (value: string) => void;
  setIsSpecificationValid: (value: boolean) => void;
  setSpecificationErrors: (errors: string[]) => void;
  
  // Business rules
  isFieldEditable: (fieldName: string) => boolean;
  getAllowedStatusOptions: () => SchemaStatus[];
  handleStatusChange: (newStatus: SchemaStatus) => void;
  
  // Schema info
  schemaCategory?: SchemaTypeCategory;
}

/**
 * Component containing all form fields for schema version
 * Extracted from SchemaVersionForm to reduce complexity
 */
export const SchemaVersionFields: React.FC<SchemaVersionFieldsProps> = ({
  semanticVersion,
  semanticVersionError,
  description,
  status,
  specification,
  isSpecificationValid,
  specificationErrors,
  compatibilityErrors,
  setSemanticVersion,
  setDescription,
  setSpecification,
  setIsSpecificationValid,
  setSpecificationErrors,
  isFieldEditable,
  getAllowedStatusOptions,
  handleStatusChange,
  schemaCategory
}) => {
  
  // Memoize the validation callback to prevent infinite re-renders
  const handleSpecificationValidation = useCallback((isValid: boolean, errors?: string[]) => {
    setIsSpecificationValid(isValid);
    setSpecificationErrors(errors || []);
  }, [setIsSpecificationValid, setSpecificationErrors]);
  
  return (
    <>
      {/* Semantic Version Field */}
      <div className="form-group">
        <label htmlFor="semanticVersion">{FORM_LABELS.SEMANTIC_VERSION}</label>
        <input
          type="text"
          id="semanticVersion"
          value={semanticVersion}
          onChange={(e) => setSemanticVersion(e.target.value)}
          placeholder={FORM_LABELS.SEMANTIC_VERSION_PLACEHOLDER}
          required
          disabled={!isFieldEditable('semanticVersion')}
          className={semanticVersionError ? 'error' : ''}
        />
        {semanticVersionError && (
          <div className="error-message">{semanticVersionError}</div>
        )}
      </div>

      {/* Description Field */}
      <div className="form-group">
        <label htmlFor="version-description">{FORM_LABELS.DESCRIPTION}</label>
        <textarea
          id="version-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={FORM_LABELS.DESCRIPTION_PLACEHOLDER}
          rows={2}
          disabled={!isFieldEditable('description')}
        />
      </div>

      {/* Status Field */}
      <div className="form-group">
        <label htmlFor="status">{FORM_LABELS.STATUS}</label>
        <select
          id="status"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as SchemaStatus)}
          disabled={!isFieldEditable('status')}
        >
          {getAllowedStatusOptions().map(stat => (
            <option key={stat} value={stat}>{stat}</option>
          ))}
        </select>
      </div>

      {/* Specification Field */}
      <div className={`form-group has-validator ${isSpecificationValid ? '' : 'validation-error'}`}>
        <label htmlFor="specification">{FORM_LABELS.SPECIFICATION}</label>
        <textarea
          spellCheck="false"
          id="specification"
          className="specification"
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          placeholder={FORM_LABELS.SPECIFICATION_PLACEHOLDER}
          rows={7}
          required
          disabled={!isFieldEditable('specification')}
        />
        <SpecificationValidator
          specification={specification}
          expectedCategory={schemaCategory}
          onValidationChange={handleSpecificationValidation}
          showSuccessMessage={isSpecificationValid && compatibilityErrors.length === 0}
        />

        {/* Show only compatibility errors (specification errors are handled by SpecificationValidator) */}
        {compatibilityErrors.length > 0 && (
          <div className="validation-errors">
            <div className="validation-error-header">
              <strong>Compatibility Issues:</strong>
            </div>

            {/* Compatibility validation errors */}
            {compatibilityErrors.map((error, index) => (
              <div key={`compat-${index}`} className="validation-error-message">
                {formatCompatibilityError(error).map((line, lineIndex) => (
                  <div key={lineIndex}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Convenience wrapper that works directly with SchemaVersionFormState
 */
interface SchemaVersionFieldsWithStateProps {
  formState: SchemaVersionFormState;
  isFieldEditable: (fieldName: string) => boolean;
  getAllowedStatusOptions: () => SchemaStatus[];
  handleStatusChange: (newStatus: SchemaStatus) => void;
  schemaCategory?: SchemaTypeCategory;
}

export const SchemaVersionFieldsWithState: React.FC<SchemaVersionFieldsWithStateProps> = ({
  formState,
  isFieldEditable,
  getAllowedStatusOptions,
  handleStatusChange,
  schemaCategory
}) => {
  return (
    <SchemaVersionFields
      semanticVersion={formState.semanticVersion}
      semanticVersionError={formState.semanticVersionError}
      description={formState.description}
      status={formState.status}
      specification={formState.specification}
      isSpecificationValid={formState.isSpecificationValid}
      specificationErrors={formState.specificationErrors}
      compatibilityErrors={formState.compatibilityErrors}
      setSemanticVersion={formState.setSemanticVersion}
      setDescription={formState.setDescription}
      setSpecification={formState.setSpecification}
      setIsSpecificationValid={formState.setIsSpecificationValid}
      setSpecificationErrors={formState.setSpecificationErrors}
      isFieldEditable={isFieldEditable}
      getAllowedStatusOptions={getAllowedStatusOptions}
      handleStatusChange={handleStatusChange}
      schemaCategory={schemaCategory}
    />
  );
};