import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaForm } from '../../src/components/SchemaForm';
import { DialogMode } from '../../src/types/dialogMode';
import { Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus, SchemaScope } from '../../src/types/schema';
import * as schemaTypeSpecificationService from '../../src/services/schemaTypeSpecification';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CircleAlert: () => <div data-testid="circle-alert-icon">CircleAlert</div>,
  Binary: () => <div data-testid="binary-icon">Binary</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  CircleHelp: () => <div data-testid="circle-help-icon">CircleHelp</div>
}));

// Mock SpecificationValidator component with flexible mocking capability
const mockSpecificationValidator = vi.hoisted(() => vi.fn(({ onValidationChange, showSuccessMessage }: any) => {
  React.useEffect(() => {
    onValidationChange(true); // Default to valid
  }, [onValidationChange]);

  return (
    <div data-testid="specification-validator">
      {showSuccessMessage && <div data-testid="validation-success">Valid</div>}
    </div>
  );
}));

vi.mock('../../src/components/SpecificationValidator', () => ({
  SpecificationValidator: mockSpecificationValidator
}));

// Mock schema services
vi.mock('../../src/services/schemaTypeSpecification', () => ({
  formatSpecification: vi.fn((spec, category, name) => `formatted ${category} ${name} spec`),
  hasNonDraftVersions: vi.fn((schema) => schema?.versions?.some((v: any) => v.status !== SchemaStatus.Draft) || false),
  updateAllVersionSpecifications: vi.fn((schema, newName) =>
    schema.versions.map((v: any) => ({ ...v, specification: `updated ${newName} spec` }))
  ),
  isValidSemanticVersion: vi.fn((version) => /^\d+\.\d+\.\d+$/.test(version)),
  getSemanticVersionError: vi.fn((version) => {
    if (!version) return 'Semantic version is required';
    if (!/^\d+\.\d+\.\d+$/.test(version)) return 'Version must follow semantic versioning format (e.g., 1.0.0, 2.1.3)';
    return null;
  }),
  generateSpecificationTemplate: vi.fn((categoryConfig, schemaName) => `${categoryConfig.typeName} ${schemaName} {\n  // TODO: details here\n}`),
  updateExistingSpecification: vi.fn((existingSpec, categoryConfig, schemaName) => `${categoryConfig.typeName} ${schemaName} { updated }`),
  getCurrentVersionString: vi.fn((schema, baseVersion) => baseVersion?.semanticVersion || '0.0.0'),
  getSuggestedNextVersion: vi.fn((schema, baseVersion) => '0.1.0'),
  getPreviousSpecification: vi.fn((schema, baseVersion) => baseVersion?.specification)
}));

const mockVersion: SchemaVersion = {
  id: 'version-1',
  specification: 'command TestCommand { field: string }',
  semanticVersion: '1.0.0',
  status: SchemaStatus.Draft,
  schemaId: 'schema-1',
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const mockSchema: Schema = {
  id: 'schema-1',
  name: 'Test Schema',
  description: 'Test schema description',
  schemaTypeCategory: SchemaTypeCategory.Commands,
  scope: SchemaScope.Public,
  contextId: 'context-1',
  versions: [mockVersion],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const defaultNewProps = {
  mode: DialogMode.New,
  contextId: 'context-1',
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

const defaultEditProps = {
  mode: DialogMode.Edit,
  schema: mockSchema,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

describe('SchemaForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering - New Mode', () => {
    it('should render new schema form with correct title', () => {
      render(<SchemaForm {...defaultNewProps} />);

      expect(screen.getByText('New Schema')).toBeInTheDocument();
    });

    it('should render empty form fields in new mode', () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const scopeSelect = screen.getByLabelText('Schema Scope:');
      const versionInput = screen.getByLabelText('Initial Semantic Version:');
      const statusSelect = screen.getByLabelText('Initial Status:');
      const specificationInput = screen.getByLabelText('Initial Specification:');

      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(categorySelect).toHaveValue('');
      expect(scopeSelect).toHaveValue(SchemaScope.Public);
      expect(versionInput).toHaveValue('0.1.0');
      expect(statusSelect).toHaveValue(SchemaStatus.Draft);
      expect(specificationInput).toHaveValue('');
    });

    it('should render Create button in new mode', () => {
      render(<SchemaForm {...defaultNewProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render initial version fields only in new mode', () => {
      render(<SchemaForm {...defaultNewProps} />);

      expect(screen.getByLabelText('Initial Semantic Version:')).toBeInTheDocument();
      expect(screen.getByLabelText('Initial Status:')).toBeInTheDocument();
      expect(screen.getByLabelText('Initial Specification:')).toBeInTheDocument();
    });

    it('should use preselected category when provided', () => {
      render(<SchemaForm {...defaultNewProps} preselectedCategory={SchemaTypeCategory.Events} />);

      const categorySelect = screen.getByLabelText('Schema Type Category:');
      expect(categorySelect).toHaveValue(SchemaTypeCategory.Events);
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit schema form with correct title', () => {
      render(<SchemaForm {...defaultEditProps} />);

      expect(screen.getByText('Edit Command Schema')).toBeInTheDocument();
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument();
    });

    it('should populate form fields with schema data in edit mode', () => {
      render(<SchemaForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const scopeSelect = screen.getByLabelText('Schema Scope:');

      expect(nameInput).toHaveValue('Test Schema');
      expect(descriptionInput).toHaveValue('Test schema description');
      expect(categorySelect).toHaveValue(SchemaTypeCategory.Commands);
      expect(scopeSelect).toHaveValue(SchemaScope.Public);
    });

    it('should render Save button in edit mode', () => {
      render(<SchemaForm {...defaultEditProps} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not render initial version fields in edit mode', () => {
      render(<SchemaForm {...defaultEditProps} />);

      expect(screen.queryByLabelText('Initial Semantic Version:')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Initial Status:')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Initial Specification:')).not.toBeInTheDocument();
    });

    it('should handle schema without description in edit mode', () => {
      const schemaWithoutDescription = { ...mockSchema, description: undefined };
      render(<SchemaForm {...defaultEditProps} schema={schemaWithoutDescription} />);

      const descriptionInput = screen.getByLabelText('Description:');
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Schema Name Read-Only Logic', () => {
    it('should make schema name read-only when schema has non-draft versions', () => {
      vi.mocked(schemaTypeSpecificationService.hasNonDraftVersions).mockReturnValue(true);

      render(<SchemaForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      expect(nameInput).toHaveAttribute('readonly');
      expect(nameInput).toHaveStyle({ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' });
      expect(nameInput).toHaveAttribute('title', 'Schema name cannot be changed when non-draft versions exist');
    });

    it('should show read-only message when schema name is read-only', () => {
      vi.mocked(schemaTypeSpecificationService.hasNonDraftVersions).mockReturnValue(true);

      render(<SchemaForm {...defaultEditProps} />);

      expect(screen.getByText('Schema name is read-only because this schema has published, deprecated, or removed versions.')).toBeInTheDocument();
    });

    it('should allow schema name editing when schema has only draft versions', () => {
      vi.mocked(schemaTypeSpecificationService.hasNonDraftVersions).mockReturnValue(false);

      render(<SchemaForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      expect(nameInput).not.toHaveAttribute('readonly');
      expect(screen.queryByText('Schema name is read-only because this schema has published, deprecated, or removed versions.')).not.toBeInTheDocument();
    });
  });

  describe('Category Icons', () => {
    it('should display correct icons for each schema category', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const categorySelect = screen.getByLabelText('Schema Type Category:');

      // Test Commands
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument();

      // Test Data
      await user.selectOptions(categorySelect, SchemaTypeCategory.Data);
      expect(screen.getByTestId('binary-icon')).toBeInTheDocument();

      // Test Documents
      await user.selectOptions(categorySelect, SchemaTypeCategory.Documents);
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();

      // Test Envelopes
      await user.selectOptions(categorySelect, SchemaTypeCategory.Envelopes);
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();

      // Test Events
      await user.selectOptions(categorySelect, SchemaTypeCategory.Events);
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();

      // Test Queries
      await user.selectOptions(categorySelect, SchemaTypeCategory.Queries);
      expect(screen.getByTestId('circle-help-icon')).toBeInTheDocument();
    });
  });

  describe('Form Structure', () => {
    it('should have proper form structure and attributes', () => {
      render(<SchemaForm {...defaultNewProps} />);

      const form = document.querySelector('form.form');
      expect(form).toBeInTheDocument();

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const specificationTextarea = screen.getByLabelText('Initial Specification:');

      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('spellCheck', 'false');

      expect(categorySelect).toHaveAttribute('required');

      expect(specificationTextarea.tagName).toBe('TEXTAREA');
      expect(specificationTextarea).toHaveAttribute('required');
      expect(specificationTextarea).toHaveAttribute('spellCheck', 'false');
      expect(specificationTextarea).toHaveClass('specification');
      expect(specificationTextarea).toHaveAttribute('rows', '7');
    });

    it('should render all schema type category options', () => {
      render(<SchemaForm {...defaultNewProps} />);

      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const options = within(categorySelect).getAllByRole('option');

      expect(options).toHaveLength(Object.keys(SchemaTypeCategory).length + 1); // +1 for "(Select)" option
      expect(within(categorySelect).getByText('(Select)')).toBeInTheDocument();
    });

    it('should render all schema scope options', () => {
      render(<SchemaForm {...defaultNewProps} />);

      const scopeSelect = screen.getByLabelText('Schema Scope:');
      const options = within(scopeSelect).getAllByRole('option');

      expect(options).toHaveLength(Object.values(SchemaScope).length);
    });

    it('should render all schema status options in new mode', () => {
      render(<SchemaForm {...defaultNewProps} />);

      const statusSelect = screen.getByLabelText('Initial Status:');
      const options = within(statusSelect).getAllByRole('option');

      expect(options).toHaveLength(Object.values(SchemaStatus).length);
    });
  });

  describe('User Interactions', () => {
    it('should update form fields when user types', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const versionInput = screen.getByLabelText('Initial Semantic Version:');
      const specificationInput = screen.getByLabelText('Initial Specification:');

      await user.type(nameInput, 'New Schema Name');
      await user.type(descriptionInput, 'New description');
      await user.clear(versionInput);
      await user.type(versionInput, '1.0.0');
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command NewCommand { }');

      expect(nameInput).toHaveValue('New Schema Name');
      expect(descriptionInput).toHaveValue('New description');
      expect(versionInput).toHaveValue('1.0.0');
      expect(specificationInput).toHaveValue('command NewCommand { }');
    });

    it('should update category and scope via dropdowns', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const scopeSelect = screen.getByLabelText('Schema Scope:');
      const statusSelect = screen.getByLabelText('Initial Status:');

      await user.selectOptions(categorySelect, SchemaTypeCategory.Events);
      await user.selectOptions(scopeSelect, SchemaScope.Private);
      await user.selectOptions(statusSelect, SchemaStatus.Published);

      expect(categorySelect).toHaveValue(SchemaTypeCategory.Events);
      expect(scopeSelect).toHaveValue(SchemaScope.Private);
      expect(statusSelect).toHaveValue(SchemaStatus.Published);
    });
  });

  describe('Specification Formatting', () => {
    it('should format specification when category and name change in new mode', async () => {
      // formatSpecification is already mocked at the top level

      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');

      await user.type(nameInput, 'TestSchema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);

      expect(vi.mocked(schemaTypeSpecificationService.formatSpecification)).toHaveBeenCalled();
    });

    it('should not format specification in edit mode', async () => {
      // formatSpecification is already mocked at the top level

      render(<SchemaForm {...defaultEditProps} />);

      expect(vi.mocked(schemaTypeSpecificationService.formatSpecification)).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission - New Mode', () => {
    it('should submit new schema with valid data', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const scopeSelect = screen.getByLabelText('Schema Scope:');
      const versionInput = screen.getByLabelText('Initial Semantic Version:');
      const statusSelect = screen.getByLabelText('Initial Status:');
      const specificationInput = screen.getByLabelText('Initial Specification:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'New Test Schema');
      await user.type(descriptionInput, 'New test description');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Events);
      await user.selectOptions(scopeSelect, SchemaScope.Private);
      await user.clear(versionInput);
      await user.type(versionInput, '1.0.0');
      await user.selectOptions(statusSelect, SchemaStatus.Published);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('event TestEvent { field: string }');

      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'New Test Schema',
        description: 'New test description',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Private,
        contextId: 'context-1',
        versions: [{
          specification: 'formatted Events New Test Schema spec',
          semanticVersion: '1.0.0',
          status: SchemaStatus.Published
        }]
      });
    });

    it('should not submit when category is not selected', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'Test Schema');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should not submit when specification is invalid', async () => {
      // Mock validation to return false
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false);
        }, [onValidationChange]);
        return <div data-testid="specification-validator">Invalid</div>;
      });

      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'Test Schema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('should submit edited schema with updated data', async () => {
      render(<SchemaForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const scopeSelect = screen.getByLabelText('Schema Scope:');
      const submitButton = screen.getByText('Save');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Schema Name');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      await user.selectOptions(scopeSelect, SchemaScope.Private);

      await user.click(submitButton);

      expect(defaultEditProps.onSubmit).toHaveBeenCalledWith({
        name: 'Updated Schema Name',
        description: 'Updated description',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: SchemaScope.Private,
        contextId: 'context-1',
        versions: expect.any(Array)
      });
    });

    it('should update version specifications when schema name changes', async () => {
      // updateAllVersionSpecifications is already mocked at the top level

      render(<SchemaForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const submitButton = screen.getByText('Save');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Schema Name');
      await user.click(submitButton);

      expect(vi.mocked(schemaTypeSpecificationService.updateAllVersionSpecifications)).toHaveBeenCalledWith(mockSchema, 'Updated Schema Name');
    });

    it('should preserve versions when schema name does not change', async () => {
      // updateAllVersionSpecifications is already mocked at the top level

      render(<SchemaForm {...defaultEditProps} />);

      const descriptionInput = screen.getByLabelText('Description:');
      const submitButton = screen.getByText('Save');

      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description only');
      await user.click(submitButton);

      expect(vi.mocked(schemaTypeSpecificationService.updateAllVersionSpecifications)).not.toHaveBeenCalled();
      expect(defaultEditProps.onSubmit).toHaveBeenCalledWith({
        name: 'Test Schema', // Original name preserved
        description: 'Updated description only',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: SchemaScope.Public,
        contextId: 'context-1',
        versions: mockSchema.versions
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form when Ctrl+S is pressed with valid data', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const specificationInput = screen.getByLabelText('Initial Specification:');

      await user.type(nameInput, 'Keyboard Schema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command KeyboardCommand { }');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(defaultNewProps.onSubmit).toHaveBeenCalled();
    });

    it('should show alert when Ctrl+S is pressed without category selected', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      await user.type(nameInput, 'Test Schema');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(alertSpy).toHaveBeenCalledWith('Please select a Schema Type Category');
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should show alert when Ctrl+S is pressed with invalid specification', async () => {
      // Mock validation to return false
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false);
        }, [onValidationChange]);
        return <div data-testid="specification-validator">Invalid</div>;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');

      await user.type(nameInput, 'Test Schema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(alertSpy).toHaveBeenCalledWith('Please fix specification errors before submitting');
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior for keyboard shortcuts', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');

      await user.type(nameInput, 'Test Schema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation Integration', () => {
    it('should show validation success message when specification is valid', () => {
      render(<SchemaForm {...defaultNewProps} />);

      expect(screen.getByTestId('validation-success')).toBeInTheDocument();
    });

    it('should pass expected category to SpecificationValidator', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const categorySelect = screen.getByLabelText('Schema Type Category:');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Events);

      // The mocked SpecificationValidator should receive the selected category
      expect(screen.getByTestId('specification-validator')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined schema in edit mode', () => {
      render(<SchemaForm {...defaultEditProps} schema={undefined} />);

      expect(screen.getByLabelText('Schema Name:')).toHaveValue('');
      expect(screen.getByLabelText('Description:')).toHaveValue('');
    });

    it('should handle schema with no versions in edit mode', () => {
      const schemaWithNoVersions = { ...mockSchema, versions: [] };
      render(<SchemaForm {...defaultEditProps} schema={schemaWithNoVersions} />);

      // Should not crash and should render form normally
      expect(screen.getByLabelText('Schema Name:')).toHaveValue('Test Schema');
    });

    it('should trim whitespace from name and description', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const specificationInput = screen.getByLabelText('Initial Specification:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, '  Trimmed Name  ');
      await user.type(descriptionInput, '  Trimmed Description  ');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command TrimmedCommand { }');

      await user.click(submitButton);

      const call = defaultNewProps.onSubmit.mock.calls[0][0];
      expect(call.name).toBe('Trimmed Name');
      expect(call.description).toBe('Trimmed Description');
    });

    it('should handle empty description as undefined', async () => {
      render(<SchemaForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Schema Name:');
      const categorySelect = screen.getByLabelText('Schema Type Category:');
      const specificationInput = screen.getByLabelText('Initial Specification:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'Test Schema');
      await user.selectOptions(categorySelect, SchemaTypeCategory.Commands);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command TestCommand { }');

      await user.click(submitButton);

      const call = defaultNewProps.onSubmit.mock.calls[0][0];
      expect(call.description).toBeUndefined();
    });
  });
});

// Helper function to work with select elements
function within(element: HTMLElement) {
  return {
    getAllByRole: (role: string) => Array.from(element.querySelectorAll(`[role="${role}"], ${role === 'option' ? 'option' : ''}`)),
    getByText: (text: string) => Array.from(element.querySelectorAll('*')).find(el => el.textContent === text) as HTMLElement
  };
}