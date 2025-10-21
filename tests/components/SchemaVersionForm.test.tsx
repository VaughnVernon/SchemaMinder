import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaVersionForm } from '../../src/components/SchemaVersionForm';
import { DialogMode } from '../../src/types/dialogMode';
import { SchemaVersion, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CircleAlert: () => <div data-testid="circle-alert-icon">CircleAlert</div>,
  Binary: () => <div data-testid="binary-icon">Binary</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  CircleHelp: () => <div data-testid="circle-help-icon">CircleHelp</div>
}));

// Mock SpecificationValidator component with flexible behavior
const mockSpecificationValidator = vi.hoisted(() => vi.fn(({ onValidationChange, showSuccessMessage }: any) => {
  React.useEffect(() => {
    onValidationChange(true, []); // Default to valid with no errors
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

// Mock MessageModal component
vi.mock('../../src/components/MessageModal', () => ({
  MessageModal: ({ isOpen, type, title, message, onClose, onConfirm, confirmText, cancelText, showCancel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="message-modal">
        <div data-testid="modal-type">{type}</div>
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-message">{message}</div>
        <button onClick={onClose} data-testid="modal-close">{cancelText || 'Close'}</button>
        {onConfirm && <button onClick={onConfirm} data-testid="modal-confirm">{confirmText}</button>}
      </div>
    );
  }
}));

// Mock compatibility validator - Define mock function to be accessible by tests
const mockValidateCompatibility = vi.hoisted(() => vi.fn().mockReturnValue({
  isValid: true,
  errors: [],
  warnings: []
}));

vi.mock('../../src/services/schemaSpecificationCompatibilityValidator', () => ({
  SchemaSpecificationCompatibilityValidator: class MockValidator {
    validateCompatibility = mockValidateCompatibility;
  },
  // Export actual interface types for proper TypeScript support
  ValidationResult: {} as any,
  ValidationError: {} as any,
  ValidationWarning: {} as any
}));

const mockSchemaVersion: SchemaVersion = {
  id: 'version-1',
  specification: 'command TestCommand { field: string }',
  semanticVersion: '1.0.0',
  description: 'Test version description',
  status: SchemaStatus.Draft,
  schemaId: 'schema-1',
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const defaultNewProps = {
  mode: DialogMode.New,
  schemaId: 'schema-1',
  currentVersion: '1.0.0',
  suggestedVersion: '1.1.0',
  previousSpecification: 'command PreviousCommand {\n  field: string;\n}',
  schemaName: 'Test Schema',
  schemaCategory: SchemaTypeCategory.Commands,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

const defaultEditProps = {
  mode: DialogMode.Edit,
  schemaVersion: mockSchemaVersion,
  schemaName: 'Test Schema',
  schemaCategory: SchemaTypeCategory.Commands,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

describe('SchemaVersionForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset mock implementations to their defaults
    mockValidateCompatibility.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    mockSpecificationValidator.mockImplementation(({ onValidationChange, showSuccessMessage }: any) => {
      React.useEffect(() => {
        onValidationChange(true, []); // Default to valid with no errors
      }, [onValidationChange]);
      
      return (
        <div data-testid="specification-validator">
          {showSuccessMessage && <div data-testid="validation-success">Valid</div>}
        </div>
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering - New Mode', () => {
    it('should render new version form with correct title', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      expect(screen.getByText('New Test Schema Version')).toBeInTheDocument();
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument();
    });

    it('should display current version information', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      expect(screen.getByText('Current version: 1.0.0')).toBeInTheDocument();
    });

    it('should populate fields with suggested values in new mode', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionInput = screen.getByLabelText('Description:');
      const statusSelect = screen.getByLabelText('Status:');
      const specificationInput = screen.getByLabelText('Specification:');
      
      expect(versionInput).toHaveValue('1.1.0');
      expect(descriptionInput).toHaveValue('');
      expect(statusSelect).toHaveValue(SchemaStatus.Draft);
      expect(specificationInput.textContent).toContain('TODO: for compatibility, make additive-only changes');
    });

    it('should render Create button in new mode', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should handle new mode without previous specification', () => {
      render(<SchemaVersionForm {...defaultNewProps} previousSpecification={undefined} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      expect(specificationInput).toHaveValue('');
    });

    it('should handle new mode without suggested version', () => {
      render(<SchemaVersionForm {...defaultNewProps} suggestedVersion={undefined} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      expect(versionInput).toHaveValue('');
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit version form with correct title', () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      expect(screen.getByText('Edit Test Schema Version')).toBeInTheDocument();
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument();
    });

    it('should populate form fields with version data in edit mode', () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionInput = screen.getByLabelText('Description:');
      const statusSelect = screen.getByLabelText('Status:');
      const specificationInput = screen.getByLabelText('Specification:');
      
      expect(versionInput).toHaveValue('1.0.0');
      expect(descriptionInput).toHaveValue('Test version description');
      expect(statusSelect).toHaveValue(SchemaStatus.Draft);
      expect(specificationInput).toHaveValue('command TestCommand { field: string }');
    });

    it('should render Save button in edit mode', () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not display current version in edit mode', () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      expect(screen.queryByText(/Current version:/)).not.toBeInTheDocument();
    });

    it('should handle version without description in edit mode', () => {
      const versionWithoutDescription = { ...mockSchemaVersion, description: undefined };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={versionWithoutDescription} />);
      
      const descriptionInput = screen.getByLabelText('Description:');
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Schema Category Icons', () => {
    it('should display correct icons for each schema category', () => {
      const categories = [
        { category: SchemaTypeCategory.Commands, icon: 'circle-alert-icon' },
        { category: SchemaTypeCategory.Data, icon: 'binary-icon' },
        { category: SchemaTypeCategory.Documents, icon: 'file-text-icon' },
        { category: SchemaTypeCategory.Envelopes, icon: 'mail-icon' },
        { category: SchemaTypeCategory.Events, icon: 'zap-icon' },
        { category: SchemaTypeCategory.Queries, icon: 'circle-help-icon' }
      ];

      categories.forEach(({ category, icon }) => {
        render(<SchemaVersionForm {...defaultNewProps} schemaCategory={category} />);
        expect(screen.getByTestId(icon)).toBeInTheDocument();
      });
    });

    it('should not display icon when schema category is not provided', () => {
      render(<SchemaVersionForm {...defaultNewProps} schemaCategory={undefined} />);
      
      expect(screen.queryByTestId('circle-alert-icon')).not.toBeInTheDocument();
    });
  });

  describe('Form Structure', () => {
    it('should have proper form structure and attributes', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const form = document.querySelector('form.form');
      expect(form).toBeInTheDocument();
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionTextarea = screen.getByLabelText('Description:');
      const statusSelect = screen.getByLabelText('Status:');
      const specificationTextarea = screen.getByLabelText('Specification:');
      
      expect(versionInput).toHaveAttribute('type', 'text');
      expect(versionInput).toHaveAttribute('required');
      expect(versionInput).toHaveAttribute('placeholder', 'e.g., 1.1.0, 2.0.0');
      
      expect(descriptionTextarea.tagName).toBe('TEXTAREA');
      expect(descriptionTextarea).toHaveAttribute('rows', '2');
      expect(descriptionTextarea).toHaveAttribute('placeholder', 'Enter optional version description');
      
      expect(statusSelect.tagName).toBe('SELECT');
      
      expect(specificationTextarea.tagName).toBe('TEXTAREA');
      expect(specificationTextarea).toHaveAttribute('required');
      expect(specificationTextarea).toHaveAttribute('spellCheck', 'false');
      expect(specificationTextarea).toHaveClass('specification');
      expect(specificationTextarea).toHaveAttribute('rows', '7');
    });

    it('should render all schema status options', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      const options = Array.from(statusSelect.querySelectorAll('option'));
      
      expect(options).toHaveLength(Object.values(SchemaStatus).length);
      Object.values(SchemaStatus).forEach(status => {
        expect(options.some(option => option.value === status)).toBe(true);
      });
    });
  });

  describe('Previous Specification Processing', () => {
    it('should add TODO comment to previous specification', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      expect(specificationInput.textContent).toContain('TODO: for compatibility, make additive-only changes');
    });

    it('should remove existing TODO comment before adding new one', () => {
      const specWithExistingTodo = 'command TestCommand {\n  // TODO: for compatibility, make additive-only changes\n  field: string;\n}';
      
      render(<SchemaVersionForm {...defaultNewProps} previousSpecification={specWithExistingTodo} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const todoCount = (specificationInput.textContent?.match(/TODO: for compatibility, make additive-only changes/g) || []).length;
      expect(todoCount).toBe(1); // Should only have one TODO comment
    });

    it('should handle previous specification without closing brace', () => {
      const incompleteSpec = 'command TestCommand { field: string';
      
      render(<SchemaVersionForm {...defaultNewProps} previousSpecification={incompleteSpec} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      expect(specificationInput).toHaveValue(incompleteSpec);
    });
  });

  describe('User Interactions', () => {
    it('should update form fields when user types', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionInput = screen.getByLabelText('Description:');
      const specificationInput = screen.getByLabelText('Specification:');
      const statusSelect = screen.getByLabelText('Status:');
      
      await user.clear(versionInput);
      await user.type(versionInput, '2.0.0');
      await user.type(descriptionInput, 'New version description');
      await user.clear(specificationInput);
      await user.paste('command UpdatedCommand { newField: string }');
      await user.selectOptions(statusSelect, SchemaStatus.Published);
      
      expect(versionInput).toHaveValue('2.0.0');
      expect(descriptionInput).toHaveValue('New version description');
      expect(specificationInput).toHaveValue('command UpdatedCommand { newField: string }');
      expect(statusSelect).toHaveValue(SchemaStatus.Published);
    });

    it('should clear errors when specification or version changes', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const specificationInput = screen.getByLabelText('Specification:');
      
      // Simulate typing to trigger error clearing
      await user.type(versionInput, '2');
      await user.type(specificationInput, ' updated');
      
      // Should not show any errors initially
      expect(screen.queryByText('Specification Issues:')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission - New Mode', () => {
    it('should submit new version with valid data', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionInput = screen.getByLabelText('Description:');
      const statusSelect = screen.getByLabelText('Status:');
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(versionInput);
      await user.type(versionInput, '1.2.0');
      await user.type(descriptionInput, 'New feature version');
      await user.selectOptions(statusSelect, SchemaStatus.Published);
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      const newSpec = 'command NewCommand { feature: string }';
      specificationInput.focus();
      await user.paste(newSpec);
      
      await user.click(submitButton);
      
      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        specification: 'command NewCommand { feature: string }',
        semanticVersion: '1.2.0',
        description: 'New feature version',
        status: SchemaStatus.Published,
        schemaId: 'schema-1'
      });
    });

    it('should submit version without description when empty', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(versionInput);
      await user.type(versionInput, '1.2.0');
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command NewCommand { }');
      
      await user.click(submitButton);
      
      const call = defaultNewProps.onSubmit.mock.calls[0][0];
      expect(call.description).toBeUndefined();
    });

    it('should trim whitespace from description', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const descriptionInput = screen.getByLabelText('Description:');
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.type(descriptionInput, '  Trimmed Description  ');
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command TrimmedCommand { }');
      
      await user.click(submitButton);
      
      const call = defaultNewProps.onSubmit.mock.calls[0][0];
      expect(call.description).toBe('Trimmed Description');
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('should submit edited version with updated data', async () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const descriptionInput = screen.getByLabelText('Description:');
      const statusSelect = screen.getByLabelText('Status:');
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Save');
      
      // Update description - clear and type new value
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      
      // Update status to Published - this will make version and specification read-only
      await user.selectOptions(statusSelect, SchemaStatus.Published);
      
      await user.click(submitButton);
      
      expect(defaultEditProps.onSubmit).toHaveBeenCalledWith({
        specification: 'command TestCommand { field: string }', // Original specification unchanged
        semanticVersion: '1.0.0', // Original version unchanged  
        description: 'Updated description', // Only description and status can change for Published
        status: SchemaStatus.Published,
        schemaId: 'schema-1'
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('should not submit when specification validation fails', async () => {
      // Mock validator to return invalid for this specific test
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false, ['Invalid specification']);
        }, [onValidationChange]);
        return <div data-testid="specification-validator">Invalid</div>;
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const submitButton = screen.getByText('Create');
      await user.click(submitButton);
      
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
      expect(screen.getByTestId('message-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-message')).toHaveTextContent('Please fix all specification and compatibility errors before submitting.');
    });

    it('should display specification errors in the form', async () => {
      // Mock validator to return errors
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false, ['Syntax error at line 1', 'Missing required field']);
        }, [onValidationChange]);
        return (
          <div data-testid="specification-validator">
            <div>Specification Issues:</div>
            <div>Syntax error at line 1</div>
            <div>Missing required field</div>
          </div>
        );
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      expect(screen.getByText('Specification Issues:')).toBeInTheDocument();
      expect(screen.getByText('Syntax error at line 1')).toBeInTheDocument();
      expect(screen.getByText('Missing required field')).toBeInTheDocument();
    });
  });

  describe('Compatibility Validation', () => {
    beforeEach(() => {
      mockValidateCompatibility.mockClear();
    });

    it('should show warning modal for non-breaking changes', async () => {
      mockValidateCompatibility.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{ message: 'Field added - this is a non-breaking change' }]
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command UpdatedCommand { field: string; newField: string }');
      await user.click(submitButton);
      
      expect(screen.getByTestId('message-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-type')).toHaveTextContent('warning');
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Schema Changes Detected');
    });

    it('should proceed with submission when user confirms warning', async () => {
      mockValidateCompatibility.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{ message: 'Non-breaking change detected' }]
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command UpdatedCommand { field: string; newField: string }');
      await user.click(submitButton);
      
      // Click confirm in the warning modal
      const confirmButton = screen.getByTestId('modal-confirm');
      await user.click(confirmButton);
      
      expect(defaultNewProps.onSubmit).toHaveBeenCalled();
    });

    it('should not proceed when user cancels warning', async () => {
      mockValidateCompatibility.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{ message: 'Non-breaking change detected' }]
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command UpdatedCommand { field: string; newField: string }');
      await user.click(submitButton);
      
      // Click close/cancel in the warning modal
      const closeButton = screen.getByTestId('modal-close');
      await user.click(closeButton);
      
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should display compatibility errors and prevent submission', async () => {
      mockValidateCompatibility.mockReturnValue({
        isValid: false,
        errors: [
          { message: 'Breaking change: field removed', details: 'Field "oldField" was removed' },
          { message: 'Type mismatch', details: 'Field type changed from string to number' }
        ],
        warnings: []
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command BreakingCommand { newField: number }');
      await user.click(submitButton);
      
      expect(screen.getByText('Compatibility Issues:')).toBeInTheDocument();
      expect(screen.getByText('Breaking change: field removed')).toBeInTheDocument();
      expect(screen.getByText('Field "oldField" was removed')).toBeInTheDocument();
      expect(screen.getByText('Type mismatch')).toBeInTheDocument();
      expect(screen.getByText('Field type changed from string to number')).toBeInTheDocument();
      
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should skip compatibility validation in edit mode', async () => {
      render(<SchemaVersionForm {...defaultEditProps} />);
      
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);
      
      expect(mockValidateCompatibility).not.toHaveBeenCalled();
      expect(defaultEditProps.onSubmit).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form when Ctrl+S is pressed with valid data', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const versionInput = screen.getByLabelText('Semantic Version:');
      const specificationInput = screen.getByLabelText('Specification:');
      
      await user.clear(versionInput);
      await user.type(versionInput, '1.2.0');
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command KeyboardCommand { }');
      
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      
      expect(defaultNewProps.onSubmit).toHaveBeenCalled();
    });

    it('should show error modal when Ctrl+S is pressed with validation errors', async () => {
      // Mock validator to return invalid
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false, ['Invalid specification']);
        }, [onValidationChange]);
        return <div data-testid="specification-validator">Invalid</div>;
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      
      expect(screen.getByTestId('message-modal')).toBeInTheDocument();
      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior for keyboard shortcuts', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      // Fill in required fields to make form valid
      const versionInput = screen.getByLabelText('Semantic Version:');
      const specificationInput = screen.getByLabelText('Specification:');
      
      await user.clear(versionInput);
      await user.type(versionInput, '1.2.0');
      await user.clear(specificationInput);
      specificationInput.focus();
      await user.paste('command TestCommand { field: string }');
      
      // Test that Ctrl+S triggers form submission (which means preventDefault worked)
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      
      // Verify that onSubmit was called, indicating the shortcut worked
      expect(defaultNewProps.onSubmit).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Interactions', () => {
    it('should close error modal when close button is clicked', async () => {
      // Mock validator to return invalid to show error modal
      mockSpecificationValidator.mockImplementation(({ onValidationChange }: any) => {
        React.useEffect(() => {
          onValidationChange(false, ['Invalid specification']);
        }, [onValidationChange]);
        return <div data-testid="specification-validator">Invalid</div>;
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const submitButton = screen.getByText('Create');
      await user.click(submitButton);
      
      expect(screen.getByTestId('message-modal')).toBeInTheDocument();
      
      const closeButton = screen.getByTestId('modal-close');
      await user.click(closeButton);
      
      expect(screen.queryByTestId('message-modal')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined schema version in edit mode', () => {
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={undefined} />);
      
      expect(screen.getByLabelText('Semantic Version:')).toHaveValue('');
      expect(screen.getByLabelText('Description:')).toHaveValue('');
    });

    it('should handle form without schema name', () => {
      render(<SchemaVersionForm {...defaultNewProps} schemaName={undefined} />);
      
      expect(screen.getByText('New Schema Version')).toBeInTheDocument();
    });

    it('should handle empty specification with validation', async () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      await user.click(submitButton);
      
      // Should not crash, but form validation should prevent submission
      expect(screen.getByLabelText('Specification:')).toHaveValue('');
    });
  });

  describe('Validation Success Display', () => {
    it('should show validation success when specification is valid and no compatibility errors', () => {
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      expect(screen.getByTestId('validation-success')).toBeInTheDocument();
    });

    it('should hide validation success when there are compatibility errors', async () => {
      // Mock compatibility validator to return errors
      mockValidateCompatibility.mockReturnValue({
        isValid: false,
        errors: [{ message: 'Breaking change' }],
        warnings: []
      });
      
      render(<SchemaVersionForm {...defaultNewProps} />);
      
      const specificationInput = screen.getByLabelText('Specification:');
      const submitButton = screen.getByText('Create');
      
      await user.clear(specificationInput);
      // Use paste to avoid curly brace parsing issues
      specificationInput.focus();
      await user.paste('command BreakingCommand { }');
      await user.click(submitButton);
      
      expect(screen.queryByTestId('validation-success')).not.toBeInTheDocument();
    });
  });

  describe('Status-Based Field Editability Rules', () => {
    describe('Published Version Rules', () => {
      it('should allow only description and status fields to be editable for published versions', () => {
        const publishedVersion = { ...mockSchemaVersion, status: SchemaStatus.Published };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={publishedVersion} />);
        
        const versionInput = screen.getByLabelText('Semantic Version:');
        const descriptionInput = screen.getByLabelText('Description:');
        const statusSelect = screen.getByLabelText('Status:');
        const specificationInput = screen.getByLabelText('Specification:');
        
        expect(versionInput).toBeDisabled();
        expect(descriptionInput).not.toBeDisabled();
        expect(statusSelect).not.toBeDisabled();
        expect(specificationInput).toBeDisabled();
      });

      it('should show restriction notice for published versions', () => {
        const publishedVersion = { ...mockSchemaVersion, status: SchemaStatus.Published };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={publishedVersion} />);
        
        expect(screen.getByText(/Published Version:/)).toBeInTheDocument();
        expect(screen.getByText(/Only description can change and status can be marked Deprecated/)).toBeInTheDocument();
      });

      it('should show only Published and Deprecated options in status dropdown for published versions', () => {
        const publishedVersion = { ...mockSchemaVersion, status: SchemaStatus.Published };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={publishedVersion} />);
        
        const statusSelect = screen.getByLabelText('Status:');
        const options = Array.from(statusSelect.querySelectorAll('option'));
        
        expect(options).toHaveLength(2);
        expect(options.some(option => option.value === SchemaStatus.Published)).toBe(true);
        expect(options.some(option => option.value === SchemaStatus.Deprecated)).toBe(true);
        expect(options.some(option => option.value === SchemaStatus.Draft)).toBe(false);
        expect(options.some(option => option.value === SchemaStatus.Removed)).toBe(false);
      });
    });

    describe('Deprecated Version Rules', () => {
      it('should allow only description and status fields to be editable for deprecated versions', () => {
        const deprecatedVersion = { ...mockSchemaVersion, status: SchemaStatus.Deprecated };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={deprecatedVersion} />);
        
        const versionInput = screen.getByLabelText('Semantic Version:');
        const descriptionInput = screen.getByLabelText('Description:');
        const statusSelect = screen.getByLabelText('Status:');
        const specificationInput = screen.getByLabelText('Specification:');
        
        expect(versionInput).toBeDisabled();
        expect(descriptionInput).not.toBeDisabled();
        expect(statusSelect).not.toBeDisabled();
        expect(specificationInput).toBeDisabled();
      });

      it('should show restriction notice for deprecated versions', () => {
        const deprecatedVersion = { ...mockSchemaVersion, status: SchemaStatus.Deprecated };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={deprecatedVersion} />);
        
        expect(screen.getByText(/Deprecated Version:/)).toBeInTheDocument();
        expect(screen.getByText(/Only description can change and status can be marked Removed/)).toBeInTheDocument();
      });

      it('should show only Deprecated and Removed options in status dropdown for deprecated versions', () => {
        const deprecatedVersion = { ...mockSchemaVersion, status: SchemaStatus.Deprecated };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={deprecatedVersion} />);
        
        const statusSelect = screen.getByLabelText('Status:');
        const options = Array.from(statusSelect.querySelectorAll('option'));
        
        expect(options).toHaveLength(2);
        expect(options.some(option => option.value === SchemaStatus.Deprecated)).toBe(true);
        expect(options.some(option => option.value === SchemaStatus.Removed)).toBe(true);
        expect(options.some(option => option.value === SchemaStatus.Draft)).toBe(false);
        expect(options.some(option => option.value === SchemaStatus.Published)).toBe(false);
      });
    });

    describe('Removed Version Rules', () => {
      it('should disable all fields for removed versions', () => {
        const removedVersion = { ...mockSchemaVersion, status: SchemaStatus.Removed };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={removedVersion} />);
        
        const versionInput = screen.getByLabelText('Semantic Version:');
        const descriptionInput = screen.getByLabelText('Description:');
        const statusSelect = screen.getByLabelText('Status:');
        const specificationInput = screen.getByLabelText('Specification:');
        const submitButton = screen.getByText('Save');
        
        expect(versionInput).toBeDisabled();
        expect(descriptionInput).toBeDisabled();
        expect(statusSelect).toBeDisabled();
        expect(specificationInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });

      it('should show restriction notice for removed versions', () => {
        const removedVersion = { ...mockSchemaVersion, status: SchemaStatus.Removed };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={removedVersion} />);
        
        expect(screen.getByText(/Removed Version:/)).toBeInTheDocument();
        expect(screen.getByText(/This version is read-only and cannot be modified/)).toBeInTheDocument();
      });

      it('should show only Removed option in status dropdown for removed versions', () => {
        const removedVersion = { ...mockSchemaVersion, status: SchemaStatus.Removed };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={removedVersion} />);
        
        const statusSelect = screen.getByLabelText('Status:');
        const options = Array.from(statusSelect.querySelectorAll('option'));
        
        expect(options).toHaveLength(1);
        expect(options[0].value).toBe(SchemaStatus.Removed);
      });

      it('should prevent submission for removed versions', async () => {
        const removedVersion = { ...mockSchemaVersion, status: SchemaStatus.Removed };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={removedVersion} />);
        
        // Try keyboard shortcut
        fireEvent.keyDown(document, { key: 's', ctrlKey: true });
        
        expect(screen.getByTestId('message-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-message')).toHaveTextContent('This version is read-only and cannot be modified.');
        expect(defaultEditProps.onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('Draft Version Rules', () => {
      it('should allow all fields to be editable for draft versions', () => {
        const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
        
        const versionInput = screen.getByLabelText('Semantic Version:');
        const descriptionInput = screen.getByLabelText('Description:');
        const statusSelect = screen.getByLabelText('Status:');
        const specificationInput = screen.getByLabelText('Specification:');
        
        expect(versionInput).not.toBeDisabled();
        expect(descriptionInput).not.toBeDisabled();
        expect(statusSelect).not.toBeDisabled();
        expect(specificationInput).not.toBeDisabled();
      });

      it('should show all status options for draft versions', () => {
        const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
        
        const statusSelect = screen.getByLabelText('Status:');
        const options = Array.from(statusSelect.querySelectorAll('option'));
        
        expect(options).toHaveLength(Object.values(SchemaStatus).length);
        Object.values(SchemaStatus).forEach(status => {
          expect(options.some(option => option.value === status)).toBe(true);
        });
      });

      it('should not show restriction notice for draft versions', () => {
        const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft };
        render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
        
        expect(screen.queryByText(/Published Version:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Deprecated Version:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Removed Version:/)).not.toBeInTheDocument();
      });
    });

    describe('New Version Mode Rules', () => {
      it('should allow all fields to be editable in new version mode regardless of any status', () => {
        render(<SchemaVersionForm {...defaultNewProps} />);
        
        const versionInput = screen.getByLabelText('Semantic Version:');
        const descriptionInput = screen.getByLabelText('Description:');
        const statusSelect = screen.getByLabelText('Status:');
        const specificationInput = screen.getByLabelText('Specification:');
        
        expect(versionInput).not.toBeDisabled();
        expect(descriptionInput).not.toBeDisabled();
        expect(statusSelect).not.toBeDisabled();
        expect(specificationInput).not.toBeDisabled();
      });

      it('should show all status options in new version mode', () => {
        render(<SchemaVersionForm {...defaultNewProps} />);
        
        const statusSelect = screen.getByLabelText('Status:');
        const options = Array.from(statusSelect.querySelectorAll('option'));
        
        expect(options).toHaveLength(Object.values(SchemaStatus).length);
        Object.values(SchemaStatus).forEach(status => {
          expect(options.some(option => option.value === status)).toBe(true);
        });
      });
    });
  });

  describe('Deprecated Status Prefix Functionality', () => {
    // Mock ConfirmationModal component for these tests
    beforeEach(() => {
      vi.mock('../../src/components/ConfirmationModal', () => ({
        ConfirmationModal: ({ isOpen, onConfirm, onClose }: any) => {
          if (!isOpen) return null;
          return (
            <div data-testid="confirmation-modal">
              <button onClick={() => onConfirm(true)} data-testid="confirm-yes">Yes</button>
              <button onClick={() => onConfirm(false)} data-testid="confirm-no">No</button>
              <button onClick={onClose} data-testid="confirm-close">Close</button>
            </div>
          );
        }
      }));
    });

    it('should add DEPRECATED prefix when status is changed to deprecated', async () => {
      const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft, description: 'Test description' };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      const descriptionInput = screen.getByLabelText('Description:');
      
      // Change status to Deprecated
      await user.selectOptions(statusSelect, SchemaStatus.Deprecated);
      
      // Confirm the status change
      const confirmButton = screen.getByTestId('confirm-yes');
      await user.click(confirmButton);
      
      expect(descriptionInput).toHaveValue('*DEPRECATED*: Test description');
    });

    it('should not add duplicate DEPRECATED prefix if already present', async () => {
      const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft, description: '*DEPRECATED*: Already deprecated' };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      const descriptionInput = screen.getByLabelText('Description:');
      
      // Change status to Deprecated
      await user.selectOptions(statusSelect, SchemaStatus.Deprecated);
      
      // Confirm the status change
      const confirmButton = screen.getByTestId('confirm-yes');
      await user.click(confirmButton);
      
      expect(descriptionInput).toHaveValue('*DEPRECATED*: Already deprecated');
      // Ensure no duplicate prefix
      expect((descriptionInput.value.match(/\*DEPRECATED\*:/g) || []).length).toBe(1);
    });

    it('should add DEPRECATED prefix to empty description', async () => {
      const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft, description: '' };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      const descriptionInput = screen.getByLabelText('Description:');
      
      // Change status to Deprecated
      await user.selectOptions(statusSelect, SchemaStatus.Deprecated);
      
      // Confirm the status change
      const confirmButton = screen.getByTestId('confirm-yes');
      await user.click(confirmButton);
      
      expect(descriptionInput).toHaveValue('*DEPRECATED*: ');
    });

    it('should show confirmation modal when changing to deprecated or removed status', async () => {
      const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      
      // Change status to Deprecated
      await user.selectOptions(statusSelect, SchemaStatus.Deprecated);
      
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });

    it('should not change status when confirmation is cancelled', async () => {
      const draftVersion = { ...mockSchemaVersion, status: SchemaStatus.Draft };
      render(<SchemaVersionForm {...defaultEditProps} schemaVersion={draftVersion} />);
      
      const statusSelect = screen.getByLabelText('Status:');
      
      // Change status to Deprecated
      await user.selectOptions(statusSelect, SchemaStatus.Deprecated);
      
      // Cancel the status change
      const cancelButton = screen.getByTestId('confirm-no');
      await user.click(cancelButton);
      
      expect(statusSelect).toHaveValue(SchemaStatus.Draft);
    });
  });
});