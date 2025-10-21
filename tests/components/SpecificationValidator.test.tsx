import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SpecificationValidator } from '../../src/components/SpecificationValidator';
import * as SchemaSpecificationValidator from '../../src/services/schemaSpecificationValidator';

// Mock the validator service
vi.mock('../../src/services/schemaSpecificationValidator', () => ({
  SchemaSpecificationValidator: {
    validate: vi.fn()
  }
}));

const mockValidate = vi.mocked(SchemaSpecificationValidator.SchemaSpecificationValidator.validate);

describe('SpecificationValidator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Specification Handling', () => {
    it('should return null for empty specification', () => {
      const { container } = render(
        <SpecificationValidator
          specification=""
          onValidationChange={vi.fn()}
        />
      );

      // Should not render anything for empty spec
      expect(container.firstChild).toBeNull();
    });

    it('should return null for whitespace-only specification', () => {
      const { container } = render(
        <SpecificationValidator
          specification="   "
          onValidationChange={vi.fn()}
        />
      );

      // Should not render anything for whitespace-only spec
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Validation Success', () => {
    it('should show success message with field count when showSuccessMessage=true', async () => {
      mockValidate.mockReturnValue({
        isValid: true,
        specification: {
          category: 'Commands',
          name: 'TestCommand',
          fields: [
            { name: 'field1', type: { kind: 'primitive', type: 'string', isArray: false } },
            { name: 'field2', type: { kind: 'primitive', type: 'int', isArray: false } }
          ]
        },
        errors: [],
        warnings: []
      });

      render(
        <SpecificationValidator
          specification="command TestCommand { string field1; int field2 }"
          showSuccessMessage={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Valid Commands specification')).toBeInTheDocument();
        expect(screen.getByText('(2 fields)')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should not show success message when showSuccessMessage=false', async () => {
      mockValidate.mockReturnValue({
        isValid: true,
        specification: { category: 'Events', name: 'TestEvent', fields: [] },
        errors: [],
        warnings: []
      });

      render(
        <SpecificationValidator
          specification="event TestEvent {}"
          showSuccessMessage={false}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Valid.*specification/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Validation Errors', () => {
    it('should display error details with line and column info', async () => {
      mockValidate.mockReturnValue({
        isValid: false,
        specification: null,
        errors: [
          {
            message: 'Expected closing brace',
            severity: 'error',
            location: { start: { line: 3, column: 15 } }
          }
        ],
        warnings: []
      });

      render(
        <SpecificationValidator
          specification="invalid { spec"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1 error\(s\):/)).toBeInTheDocument();
        expect(screen.getByText(/Line 3:15 - Expected closing brace/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle errors without location information', async () => {
      mockValidate.mockReturnValue({
        isValid: false,
        specification: null,
        errors: [
          {
            message: 'General syntax error',
            severity: 'error'
          }
        ],
        warnings: []
      });

      render(
        <SpecificationValidator
          specification="invalid spec"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/General syntax error/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle mixed errors and warnings', async () => {
      mockValidate.mockReturnValue({
        isValid: false,
        specification: null,
        errors: [
          { message: 'Error 1', severity: 'error' },
          { message: 'Error 2', severity: 'error' }
        ],
        warnings: [
          { message: 'Warning 1', severity: 'warning' },
          { message: 'Warning 2', severity: 'warning' },
          { message: 'Warning 3', severity: 'warning' }
        ]
      });

      render(
        <SpecificationValidator
          specification="spec with issues"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 error\(s\):/)).toBeInTheDocument();
        expect(screen.getByText(/3 warning\(s\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Exception Handling', () => {
    it('should handle validation exceptions with specific parser errors', async () => {
      mockValidate.mockImplementation(() => {
        throw new Error('Parser internal error - assert2 failed');
      });

      const mockOnValidationChange = vi.fn();

      render(
        <SpecificationValidator
          specification="spec that causes error"
          onValidationChange={mockOnValidationChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Parser internal error - this appears to be a polyfill issue/)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockOnValidationChange).toHaveBeenCalledWith(false, ['Parser internal error - this appears to be a polyfill issue']);
    });

    it('should handle generic validation errors', async () => {
      mockValidate.mockImplementation(() => {
        throw new Error('Generic validation error');
      });

      render(
        <SpecificationValidator
          specification="spec that causes error"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Generic validation error/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle non-Error exceptions', async () => {
      mockValidate.mockImplementation(() => {
        throw 'String error';
      });

      render(
        <SpecificationValidator
          specification="spec that causes error"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Unexpected validation error/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Category Handling', () => {
    it('should handle expected category mapping', async () => {
      mockValidate.mockReturnValue({
        isValid: true,
        specification: { category: 'Events', name: 'TestEvent', fields: [] },
        errors: [],
        warnings: []
      });

      render(
        <SpecificationValidator
          specification="event TestEvent { string name }"
          expectedCategory="Events"
          showSuccessMessage={true}
        />
      );

      await waitFor(() => {
        expect(mockValidate).toHaveBeenCalledWith("event TestEvent { string name }", "event");
      }, { timeout: 3000 });
    });
  });

  describe('Props and Styling', () => {
    it('should apply custom className', async () => {
      mockValidate.mockReturnValue({
        isValid: true,
        specification: { category: 'Events', name: 'TestEvent', fields: [] },
        errors: [],
        warnings: []
      });

      const { container } = render(
        <SpecificationValidator
          specification="event TestEvent {}"
          className="custom-validator"
          showSuccessMessage={true}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.specification-validator.custom-validator')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('OnValidationChange Callback', () => {
    it('should call onValidationChange with valid result', async () => {
      mockValidate.mockReturnValue({
        isValid: true,
        specification: { category: 'Events', name: 'TestEvent', fields: [] },
        errors: [],
        warnings: []
      });

      const mockOnValidationChange = vi.fn();

      render(
        <SpecificationValidator
          specification="event TestEvent {}"
          onValidationChange={mockOnValidationChange}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(true, []);
      }, { timeout: 3000 });
    });

    it('should call onValidationChange with formatted error messages', async () => {
      mockValidate.mockReturnValue({
        isValid: false,
        specification: null,
        errors: [
          {
            message: 'Syntax error at line 2',
            severity: 'error',
            location: { start: { line: 2, column: 5 } }
          }
        ],
        warnings: [
          {
            message: 'Warning about field',
            severity: 'warning',
            location: { start: { line: 1, column: 10 } }
          }
        ]
      });

      const mockOnValidationChange = vi.fn();

      render(
        <SpecificationValidator
          specification="invalid spec"
          onValidationChange={mockOnValidationChange}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(false, ['Line 2:5 - Syntax error at line 2']);
      }, { timeout: 3000 });
    });
  });
});