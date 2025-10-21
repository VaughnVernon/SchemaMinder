import { SchemaSpecificationParser } from '../parser';
import { SemanticVersion, SemanticVersionData } from './semanticVersion';
import { SchemaSpecification, FieldDeclaration, ParseResult } from '../parser/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'BREAKING_CHANGE' | 'INVALID_VERSION' | 'PARSE_ERROR';
  message: string;
  details?: string;
}

export interface ValidationWarning {
  type: 'ADDITIVE_CHANGE' | 'DEPRECATED_FIELD';
  message: string;
}

export class SchemaSpecificationCompatibilityValidator {
  constructor() {
    // No need to instantiate since we use static methods
  }

  /**
   * Validates compatibility between two schema versions
   * @param currentSpec The current/existing schema specification
   * @param currentVersion The current semantic version
   * @param newSpec The new/proposed schema specification
   * @param newVersion The new semantic version
   */
  public validateCompatibility(
    currentSpec: string,
    currentVersion: string,
    newSpec: string,
    newVersion: string
  ): ValidationResult {

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Parse semantic versions
      const currentSemVer = SemanticVersion.parse(currentVersion);
      const newSemVer = SemanticVersion.parse(newVersion);

      if (!currentSemVer || !newSemVer) {
        result.isValid = false;
        result.errors.push({
          type: 'INVALID_VERSION',
          message: 'Invalid semantic version format',
          details: 'Version must be in format X.Y.Z where X, Y, and Z are non-negative integers'
        });
        return result;
      }

      // Parse specifications 
      const currentParseResult = this.parseSpecification(currentSpec);
      const newParseResult = this.parseSpecification(newSpec);


      if (!currentParseResult?.success || !newParseResult?.success || 
          !currentParseResult.specification || !newParseResult.specification) {
        result.isValid = false;
        result.errors.push({
          type: 'PARSE_ERROR',
          message: 'Failed to parse schema specification',
          details: 'Ensure the specification syntax is valid'
        });
        return result;
      }

      const currentSpecification = currentParseResult.specification;
      const newSpecification = newParseResult.specification;

      // Check version progression rules
      this.validateVersionProgression(currentSemVer, newSemVer, result);

      // Continue with field validation regardless of version issues to collect all errors
      
      // Detect all breaking changes first
      const breakingChanges = this.detectBreakingChanges(currentSpecification, newSpecification);

      // Rules-1: Same major version must have additive-only changes
      if (currentSemVer.major === newSemVer.major && breakingChanges.length > 0) {
        result.isValid = false;
        
        // Add a single summary error with all breaking changes listed
        const changeList = breakingChanges.map(change => `• ${change.message}`).join('\n');
        result.errors.push({
          type: 'BREAKING_CHANGE',
          message: 'Breaking changes detected that require a major version increment',
          details: `The following breaking changes were found:\n\n${changeList}\n\nTo fix: Increment the major version from ${currentSemVer.major} to ${currentSemVer.major + 1} (e.g., ${currentSemVer.major + 1}.0.0)`
        });
      }

      // Rules-2: Breaking changes with insufficient version increment
      if (breakingChanges.length > 0 && newSemVer.major <= currentSemVer.major) {
        // This is already handled by Rules-1 check above
      } else if (breakingChanges.length > 0 && newSemVer.major > currentSemVer.major) {
        // Breaking changes are allowed with major version increment
        breakingChanges.forEach(change => {
          result.warnings.push({
            type: 'ADDITIVE_CHANGE',
            message: `Breaking change detected (allowed with major version increment): ${change.message}`
          });
        });
      }

      // Check for additive changes (only if no breaking changes)
      if (breakingChanges.length === 0) {
        const additiveChanges = this.detectAdditiveChanges(currentSpecification, newSpecification);
        
        // Only warn about additive changes if the version increment seems inappropriate
        if (additiveChanges.length > 0) {
          // If major version was incremented but only additive changes were made,
          // warn that a minor version increment would have been sufficient
          if (newSemVer.major > currentSemVer.major) {
            result.warnings.push({
              type: 'ADDITIVE_CHANGE',
              message: `Major version increment may be unnecessary. Only additive changes detected: ${additiveChanges.map(c => c.message).join(', ')}`
            });
          }
          // If minor or patch version was incremented with additive changes, that's perfect - no warnings needed
          // This is the expected behavior for schema evolution
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push({
        type: 'PARSE_ERROR',
        message: 'Unexpected error during validation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return result;
  }


  /**
   * Parses a specification string 
   */
  private parseSpecification(spec: string): ParseResult | null {
    try {
      const parseResult = SchemaSpecificationParser.parse(spec);
      return parseResult;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates that version numbers progress correctly
   */
  private validateVersionProgression(
    current: SemanticVersionData,
    next: SemanticVersionData,
    result: ValidationResult
  ): void {
    // Version must increase
    if (SemanticVersion.isLessOrEqual(next, current)) {
      result.isValid = false;
      result.errors.push({
        type: 'INVALID_VERSION',
        message: `Version must increase from ${SemanticVersion.format(current)}`,
        details: `New version ${SemanticVersion.format(next)} is not greater than current version`
      });
    }
  }



  /**
   * Detects all breaking changes between two specifications
   */
  private detectBreakingChanges(
    currentSpec: SchemaSpecification,
    newSpec: SchemaSpecification
  ): Array<{ message: string }> {
    const changes: Array<{ message: string }> = [];
    const currentFields = this.getFieldMap(currentSpec);
    const newFields = this.getFieldMap(newSpec);


    // Check for removed fields
    for (const [fieldName] of currentFields) {
      if (!newFields.has(fieldName)) {
        changes.push({ message: `Field '${fieldName}' was removed` });
      }
    }

    // Check for type changes
    for (const [fieldName, currentField] of currentFields) {
      const newField = newFields.get(fieldName);
      if (newField) {
        const currentType = this.getFieldType(currentField);
        const newType = this.getFieldType(newField);
        
        if (currentType !== newType) {
          changes.push({ message: `Field '${fieldName}' type changed from '${currentType}' to '${newType}'` });
        }
      }
    }

    // Note: Adding new fields (even without defaults) is generally considered additive, not breaking.
    // Breaking changes for new fields would only apply in very specific domain contexts
    // where the schema contract requires all fields to be explicitly handled.
    // For most use cases, new fields should be handled in detectAdditiveChanges().

    // Check for fields that became required
    for (const [fieldName, currentField] of currentFields) {
      const newField = newFields.get(fieldName);
      if (newField && !this.isRequiredField(currentField) && this.isRequiredField(newField)) {
        changes.push({ message: `Field '${fieldName}' changed from optional to required` });
      }
    }

    return changes;
  }

  /**
   * Detects additive changes between two specifications
   */
  private detectAdditiveChanges(
    currentSpec: SchemaSpecification,
    newSpec: SchemaSpecification
  ): Array<{ message: string }> {
    const changes: Array<{ message: string }> = [];
    const currentFields = this.getFieldMap(currentSpec);
    const newFields = this.getFieldMap(newSpec);

    // Check for all added fields (whether they have defaults or not)
    for (const [fieldName, newField] of newFields) {
      if (!currentFields.has(fieldName)) {
        const hasDefault = newField.defaultValue !== undefined;
        if (hasDefault) {
          changes.push({ message: `Field '${fieldName}' was added with default value` });
        } else {
          changes.push({ message: `Field '${fieldName}' was added` });
        }
      }
    }

    // Check for fields that became optional
    for (const [fieldName, currentField] of currentFields) {
      const newField = newFields.get(fieldName);
      if (newField && this.isRequiredField(currentField) && !this.isRequiredField(newField)) {
        changes.push({ message: `Field '${fieldName}' changed from required to optional` });
      }
    }

    return changes;
  }

  /**
   * Creates a map of field names to field declarations
   */
  private getFieldMap(spec: SchemaSpecification): Map<string, FieldDeclaration> {
    const fieldMap = new Map<string, FieldDeclaration>();
    
    // Filter out special fields (schemaTypeName, version, timestamp)
    const regularFields = spec.fields.filter(field => 
      field.type.kind !== 'special'
    );

    for (const field of regularFields) {
      fieldMap.set(field.name, field);
    }


    return fieldMap;
  }

  /**
   * Gets the type string for a field
   */
  private getFieldType(field: FieldDeclaration): string {
    if (field.type.kind === 'primitive') {
      return field.type.isArray ? `${field.type.type}[]` : field.type.type;
    } else if (field.type.kind === 'complex') {
      const baseType = `${field.type.category}.${field.type.schemaName}`;
      return field.type.isArray ? `${baseType}[]` : baseType;
    }
    return 'unknown';
  }

  /**
   * Checks if a field is required (has no default value)
   */
  private isRequiredField(field: FieldDeclaration): boolean {
    return !field.defaultValue;
  }

}