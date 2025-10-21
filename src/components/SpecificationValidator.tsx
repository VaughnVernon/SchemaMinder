import React, { useState, useEffect, useCallback } from 'react';
import { SchemaSpecificationValidator, ValidationResult } from '../services/schemaSpecificationValidator';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { SCHEMA_TYPE_CATEGORIES } from '../types/schema';
import './SpecificationValidator.css';

interface SpecificationValidatorProps {
  specification: string;
  expectedCategory?: string;
  onValidationChange?: (isValid: boolean, errors?: string[]) => void;
  showSuccessMessage?: boolean;
  className?: string;
}

interface ErrorDisplay {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export const SpecificationValidator: React.FC<SpecificationValidatorProps> = ({
  specification,
  expectedCategory,
  onValidationChange,
  showSuccessMessage = true,
  className = ''
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [errors, setErrors] = useState<ErrorDisplay[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  useEffect(() => {
    // Skip validation for empty specifications
    if (!specification.trim()) {
      setValidationResult(null);
      setErrors([]);
      onValidationChange?.(true, []); // Empty is considered valid
      return;
    }

    // Debounce validation by 500ms
    const timer = setTimeout(() => {
      setIsValidating(true);
      
      try {
        // Map the category enum value to its lowercase typeName
        let expectedTypeName: string | undefined = expectedCategory;
        if (expectedCategory && SCHEMA_TYPE_CATEGORIES[expectedCategory as keyof typeof SCHEMA_TYPE_CATEGORIES]) {
          expectedTypeName = SCHEMA_TYPE_CATEGORIES[expectedCategory as keyof typeof SCHEMA_TYPE_CATEGORIES].typeName;
        }
        
        const result = SchemaSpecificationValidator.validate(specification, expectedTypeName);
        setValidationResult(result);
        
        // Format errors for display
        const formattedErrors: ErrorDisplay[] = [
          ...result.errors.map(e => ({
            line: e.location?.start.line || 0,
            column: e.location?.start.column || 0,
            message: e.message,
            severity: 'error' as const
          })),
          ...result.warnings.map(w => ({
            line: w.location?.start.line || 0,
            column: w.location?.start.column || 0,
            message: w.message,
            severity: 'warning' as const
          }))
        ];
        
        setErrors(formattedErrors);
        
        // Pass formatted error messages to parent
        const errorMessages = formattedErrors
          .filter(e => e.severity === 'error')
          .map(e => {
            const location = e.line > 0 ? `Line ${e.line}${e.column > 0 ? `:${e.column}` : ''} - ` : '';
            return `${location}${e.message}`;
          });
        
        onValidationChange?.(result.isValid, errorMessages);
      } catch (error) {
        // Silently catch validation errors and display user-friendly message
        
        // Try to extract meaningful error from the caught error
        let errorMessage = 'Unexpected validation error';
        if (error instanceof Error) {
          errorMessage = error.message;
          // If it's an ANTLR parsing error, try to provide better context
          if (error.message.includes('assert') || error.message.includes('assert2')) {
            errorMessage = 'Parser internal error - this appears to be a polyfill issue';
          }
        }
        
        setValidationResult({
          isValid: false,
          errors: [{
            message: errorMessage,
            severity: 'error'
          }],
          warnings: []
        });
        setErrors([{
          line: 0,
          column: 0,
          message: errorMessage,
          severity: 'error'
        }]);
        onValidationChange?.(false, [errorMessage]);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [specification, expectedCategory, onValidationChange]);

  // Group errors by line for better display
  const errorsByLine = errors.reduce((acc, error) => {
    const line = error.line || 0;
    if (!acc[line]) acc[line] = [];
    acc[line].push(error);
    return acc;
  }, {} as Record<number, ErrorDisplay[]>);

  if (!specification.trim()) {
    return null;
  }

  if (isValidating) {
    return (
      <div className={`specification-validator ${className}`}>
        <div className="validation-status validating">
          <span className="validation-spinner">⟳</span>
          Validating specification...
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  return (
    <div className={`specification-validator ${className}`}>
      {validationResult.isValid ? (
        showSuccessMessage && (
          <div className="validation-status valid">
            <CheckCircle size={16} />
            <span>Valid {validationResult.specification?.category} specification</span>
            {validationResult.specification && (
              <span className="field-count">
                ({validationResult.specification.fields.length} fields)
              </span>
            )}
          </div>
        )
      ) : (
        <div className="validation-errors">
          <div className="validation-status invalid">
            <AlertCircle size={16} />
            <span>
              {errors.filter(e => e.severity === 'error').length} error(s): {
                errors[0] && errors[0].line > 0 
                  ? `Line ${errors[0].line}${errors[0].column > 0 ? `:${errors[0].column}` : ''} - ${errors[0].message}`
                  : errors[0]?.message || 'Please correct the syntax error in specification.'
              }
              {errors.filter(e => e.severity === 'warning').length > 0 && 
                `, ${errors.filter(e => e.severity === 'warning').length} warning(s)`}
            </span>
          </div>
          
        </div>
      )}

      {/* Parsed Structure section - commented out for cleaner UI, can be restored if needed for debugging
      {validationResult.isValid && validationResult.specification && (
        <details className="specification-details">
          <summary>Parsed Structure</summary>
          <div className="parsed-structure">
            <div className="structure-item">
              <strong>Type:</strong> {validationResult.specification.category}
            </div>
            <div className="structure-item">
              <strong>Name:</strong> {validationResult.specification.name}
            </div>
            <div className="structure-item">
              <strong>Fields:</strong>
              <ul className="field-list">
                {validationResult.specification.fields.map((field, idx) => (
                  <li key={idx}>
                    <code>{field.name}</code>
                    <span className="field-type">
                      {field.type.kind === 'primitive' && `${field.type.type}${field.type.isArray ? '[]' : ''}`}
                      {field.type.kind === 'special' && field.type.type}
                      {field.type.kind === 'complex' && (
                        <>
                          {field.type.category && `${field.type.category}.`}
                          {field.type.schemaName}
                          {field.type.version && `:${field.type.version}`}
                          {field.type.isArray && '[]'}
                        </>
                      )}
                    </span>
                    {field.defaultValue && (
                      <span className="field-default">
                        {' = '}
                        {field.defaultValue.type === 'array' ? 
                          `{ ${field.defaultValue.elements.map(e => 
                            typeof e.value === 'string' ? `"${e.value}"` : e.value
                          ).join(', ')} }` :
                          typeof field.defaultValue.value === 'string' ? 
                            `"${field.defaultValue.value}"` : 
                            String(field.defaultValue.value)
                        }
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
      */}
    </div>
  );
};