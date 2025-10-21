import React, { useState, useEffect } from 'react';
import { Schema, SchemaVersion, SchemaStatus, SchemaTypeCategory, SchemaScope, SCHEMA_TYPE_CATEGORIES } from '../types/schema';
import { DialogMode } from '../types/dialogMode';
import { formatSpecification, hasNonDraftVersions, updateAllVersionSpecifications, isValidSemanticVersion, getSemanticVersionError } from '../services/schemaTypeSpecification';
import { SpecificationValidator } from './SpecificationValidator';
import { CircleAlert, Binary, FileText, Mail, Zap, CircleHelp } from 'lucide-react';

interface SchemaFormProps {
  mode: DialogMode;
  schema?: Schema; // Only required for Edit mode
  contextId?: string; // Only required for New mode
  preselectedCategory?: SchemaTypeCategory; // Optional pre-selected category for New mode
  onSubmit: (data: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const SchemaForm: React.FC<SchemaFormProps> = ({ mode, schema, contextId, preselectedCategory, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SchemaTypeCategory | ''>('');
  const [scope, setScope] = useState<SchemaScope>(SchemaScope.Public);
  const [specification, setSpecification] = useState('');
  const [semanticVersion, setSemanticVersion] = useState('0.1.0');
  const [semanticVersionError, setSemanticVersionError] = useState<string | null>(null);
  const [status, setStatus] = useState<SchemaStatus>(SchemaStatus.Draft);
  const [isSpecificationValid, setIsSpecificationValid] = useState(true);

  // Rule 1: Determine if schema name should be read-only
  const isSchemaNameReadOnly = mode === DialogMode.Edit && hasNonDraftVersions(schema);

  // Track the original schema name to detect changes for Rule 2
  const [originalSchemaName, setOriginalSchemaName] = useState('');

  // Initialize form fields based on mode
  useEffect(() => {
    if (mode === DialogMode.Edit && schema) {
      setName(schema.name);
      setOriginalSchemaName(schema.name); // Track original for Rule 2
      setDescription(schema.description || '');
      setCategory(schema.schemaTypeCategory);
      setScope(schema.scope);
      // For edit mode, we'll use the latest version's specification
      const latestVersion = schema.versions[schema.versions.length - 1];
      setSpecification(latestVersion?.specification || '');
      setSemanticVersion(latestVersion?.semanticVersion || '0.1.0');
      setStatus(latestVersion?.status || SchemaStatus.Draft);
    } else {
      setName('');
      setOriginalSchemaName('');
      setDescription('');
      setCategory(preselectedCategory || '');
      setScope(SchemaScope.Public);
      setSpecification('');
      setSemanticVersion('0.1.0');
      setStatus(SchemaStatus.Draft);
    }
  }, [mode, schema, preselectedCategory]);

  // Handle specification generation and updates when category or name changes
  useEffect(() => {
    // Only apply for new schemas (not edit mode)
    if (mode === DialogMode.New) {
      // Skip if no category is selected
      if (!category || category === '') return;

      try {
        const updatedSpec = formatSpecification(specification, category as SchemaTypeCategory, name);
        setSpecification(updatedSpec);
      } catch (error) {
        console.error('Error formatting specification:', error);
      }
    }
  }, [mode, name, category, specification]);

  // Validate semantic version when it changes
  useEffect(() => {
    if (semanticVersion) {
      const error = getSemanticVersionError(semanticVersion);
      setSemanticVersionError(error);
    } else {
      setSemanticVersionError(null);
    }
  }, [semanticVersion]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save/create
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();

        // Ensure category is selected for new schemas
        if (!category) {
          alert('Please select a Schema Type Category');
          return;
        }

        // Don't submit if specification is invalid
        if (!isSpecificationValid) {
          alert('Please fix specification errors before submitting');
          return;
        }

        // Don't submit if semantic version is invalid (for new schemas)
        if (mode === DialogMode.New && semanticVersionError) {
          alert(semanticVersionError);
          return;
        }

        const isEditMode = mode === DialogMode.Edit;

        if (isEditMode && schema) {
          // Rule 2: Check if schema name changed and update all version specifications
          const trimmedName = name.trim();
          const schemaNameChanged = trimmedName !== originalSchemaName;
          let updatedVersions = schema.versions;

          if (schemaNameChanged) {
            updatedVersions = updateAllVersionSpecifications(schema, trimmedName);
          }

          // For edit mode, preserve existing versions and update schema metadata
          const updatedSchema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
            name: trimmedName,
            description: description.trim() || undefined,
            schemaTypeCategory: category as SchemaTypeCategory,
            scope,
            contextId: schema.contextId,
            versions: updatedVersions
          };
          onSubmit(updatedSchema);
        } else {
          // For new mode, create initial version
          const initialVersion: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> = {
            specification,
            semanticVersion,
            description: undefined,
            status,
            schemaId: '' // This will be set by the parent
          };

          const newSchema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
            name: name.trim(),
            description: description.trim() || undefined,
            schemaTypeCategory: category as SchemaTypeCategory,
            scope,
            contextId: contextId || '',
            versions: [initialVersion]
          };
          onSubmit(newSchema);
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
  }, [name, description, category, scope, specification, semanticVersion, status, isSpecificationValid, mode, schema, contextId, onSubmit, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure category is selected for new schemas
    if (!category) {
      alert('Please select a Schema Type Category');
      return;
    }

    // Don't submit if specification is invalid
    if (!isSpecificationValid) {
      alert('Please fix specification errors before submitting');
      return;
    }

    // Don't submit if semantic version is invalid (for new schemas)
    if (mode === DialogMode.New && semanticVersionError) {
      alert(semanticVersionError);
      return;
    }

    const isEditMode = mode === DialogMode.Edit;

    if (isEditMode && schema) {
      // Rule 2: Check if schema name changed and update all version specifications
      const trimmedName = name.trim();
      const schemaNameChanged = trimmedName !== originalSchemaName;
      let updatedVersions = schema.versions;

      if (schemaNameChanged) {
        updatedVersions = updateAllVersionSpecifications(schema, trimmedName);
      }

      // For edit mode, preserve existing versions and update schema metadata
      const updatedSchema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: trimmedName,
        description: description.trim() || undefined,
        schemaTypeCategory: category as SchemaTypeCategory,
        scope,
        contextId: schema.contextId,
        versions: updatedVersions
      };
      onSubmit(updatedSchema);
    } else {
      // For new mode, create initial version
      const initialVersion: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> = {
        specification,
        semanticVersion,
        status
      };

      const newSchema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        schemaTypeCategory: category as SchemaTypeCategory,
        scope,
        contextId: contextId!,
        versions: [initialVersion as SchemaVersion]
      };
      onSubmit(newSchema);
    }
  };

  const isEditMode = mode === DialogMode.Edit;
  const getFriendlyName = () => {
    if (category && SCHEMA_TYPE_CATEGORIES[category as keyof typeof SCHEMA_TYPE_CATEGORIES]) {
      return SCHEMA_TYPE_CATEGORIES[category as keyof typeof SCHEMA_TYPE_CATEGORIES].friendlyName;
    }
    return '';
  };
  const title = isEditMode
    ? (category ? `Edit ${getFriendlyName()} Schema` : 'Edit Schema')
    : 'New Schema';
  const submitButtonText = isEditMode ? 'Save' : 'Create';

  const getCategoryIcon = () => {
    if (!category) return null;
    switch (category) {
      case SchemaTypeCategory.Commands:
        return <CircleAlert size={20} />;
      case SchemaTypeCategory.Data:
        return <Binary size={20} />;
      case SchemaTypeCategory.Documents:
        return <FileText size={20} />;
      case SchemaTypeCategory.Envelopes:
        return <Mail size={20} />;
      case SchemaTypeCategory.Events:
        return <Zap size={20} />;
      case SchemaTypeCategory.Queries:
        return <CircleHelp size={20} />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {getCategoryIcon()}
        {title}
      </h3>

      <div className="form-group">
        <label htmlFor="name">Schema Name:</label>
        <input
          spellCheck="false"
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          readOnly={isSchemaNameReadOnly}
          style={isSchemaNameReadOnly ? {
            backgroundColor: '#f5f5f5',
            color: '#666',
            cursor: 'not-allowed'
          } : undefined}
          title={isSchemaNameReadOnly ?
            'Schema name cannot be changed when non-draft versions exist' :
            undefined
          }
        />
        {isSchemaNameReadOnly && (
          <small style={{ color: '#666', fontSize: '0.8em', marginTop: '4px', display: 'block' }}>
            Schema name is read-only because this schema has published, deprecated, or removed versions.
          </small>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter optional schema description"
          rows={2}
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Schema Type Category:</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as SchemaTypeCategory | '')}
          required
        >
          <option value="">(Select)</option>
          {Object.entries(SCHEMA_TYPE_CATEGORIES).map(([key, value]) => (
            <option key={key} value={key}>{value.friendlyName}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="scope">Schema Scope:</label>
        <select
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as SchemaScope)}
        >
          {Object.values(SchemaScope).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!isEditMode && (
        <>
          <div className="form-group">
            <label htmlFor="semanticVersion">Initial Semantic Version:</label>
            <input
              type="text"
              id="semanticVersion"
              value={semanticVersion}
              onChange={(e) => setSemanticVersion(e.target.value)}
              placeholder="e.g., 0.1.0, 1.0.0"
              required
              className={semanticVersionError ? 'error' : ''}
            />
            {semanticVersionError && (
              <div className="error-message">{semanticVersionError}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="status">Initial Status:</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SchemaStatus)}
            >
              {Object.values(SchemaStatus).map(stat => (
                <option key={stat} value={stat}>{stat}</option>
              ))}
            </select>
          </div>

          <div className={`form-group has-validator ${isSpecificationValid ? '' : 'validation-error'}`}>
            <label htmlFor="specification">Initial Specification:</label>
            <textarea
              spellCheck="false"
              id="specification"
              className="specification"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Enter your schema specification here..."
              rows={7}
              required
            />
            <SpecificationValidator
              specification={specification}
              expectedCategory={category || undefined}
              onValidationChange={setIsSpecificationValid}
              showSuccessMessage={true}
            />
          </div>
        </>
      )}

      <div>
        <button
          type="submit"
          className="button"
          disabled={mode === DialogMode.New && !!semanticVersionError}
        >
          {submitButtonText}
        </button>
        <button type="button" onClick={onCancel} className="button secondary">Cancel</button>
      </div>
    </form>
  );
};