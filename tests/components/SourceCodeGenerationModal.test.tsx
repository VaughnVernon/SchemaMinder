import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SourceCodeGenerationModal } from '../../src/components/SourceCodeGenerationModal';
import { CodeGenerationContext } from '../../src/services/codegen/types';

describe('SourceCodeGenerationModal', () => {
  const mockContext: CodeGenerationContext = {
    productName: 'TestProduct',
    domainName: 'TestDomain',
    contextName: 'User Management',
    contextNamespace: 'Com.Example.UserMgmt',
    schemas: [
      {
        schema: {
          id: 'schema-1',
          name: 'UserRegistered',
          schemaTypeCategory: 'Events',
          contextId: 'ctx-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          scope: 'Public',
          versions: []
        },
        versions: [
          {
            id: 'v1',
            schemaId: 'schema-1',
            semanticVersion: '1.0.0',
            status: 'Published',
            specification: 'event UserRegistered { string userId }',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    ]
  };

  const mockOnClose = vi.fn();
  const mockOnGenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <SourceCodeGenerationModal
          isOpen={false}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when context is null', () => {
      const { container } = render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={null as any}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true and context is provided', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      expect(screen.getByText('Generate Source Code')).toBeInTheDocument();
      expect(screen.getByText('TestProduct / TestDomain / User Management')).toBeInTheDocument();
    });

    it('should display schema count', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      expect(screen.getByText(/Total schemas to be generated:/)).toBeInTheDocument();
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });

    it('should render all language options', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const select = screen.getByLabelText(/Target Language:/);
      expect(select).toBeInTheDocument();

      // Check that all languages are available
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(6);
      expect(screen.getByText('C#')).toBeInTheDocument();
      expect(screen.getByText('Go')).toBeInTheDocument();
      expect(screen.getByText('Java')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Rust')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  describe('Initialization', () => {
    it('should initialize namespace from context', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const namespaceInput = screen.getByLabelText(/Namespace:/) as HTMLInputElement;
      expect(namespaceInput.value).toBe('Com.Example.UserMgmt');
    });

    it('should initialize filename with PascalCase context name', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;
      expect(filenameInput.value).toBe('UserManagementSchemas.cs');
    });

    it('should update filename extension when language changes', async () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const languageSelect = screen.getByLabelText(/Target Language:/) as HTMLSelectElement;
      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;

      // Change to Go
      fireEvent.change(languageSelect, { target: { value: 'golang' } });
      await waitFor(() => {
        expect(filenameInput.value).toBe('UserManagementSchemas.go');
      });

      // Change to Java
      fireEvent.change(languageSelect, { target: { value: 'java' } });
      await waitFor(() => {
        expect(filenameInput.value).toBe('UserManagementSchemas.java');
      });
    });
  });

  describe('Namespace Label', () => {
    it('should display "Namespace" for C#', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      expect(screen.getByText(/Namespace:/)).toBeInTheDocument();
    });

    it('should display "Package" for Go', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const languageSelect = screen.getByLabelText(/Target Language:/);
      fireEvent.change(languageSelect, { target: { value: 'golang' } });

      expect(screen.getByText(/Package:/)).toBeInTheDocument();
    });

    it('should display "Package" for Java', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const languageSelect = screen.getByLabelText(/Target Language:/);
      fireEvent.change(languageSelect, { target: { value: 'java' } });

      expect(screen.getByText(/Package:/)).toBeInTheDocument();
    });

    it('should display "Module" for JavaScript', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const languageSelect = screen.getByLabelText(/Target Language:/);
      fireEvent.change(languageSelect, { target: { value: 'javascript' } });

      expect(screen.getByText(/Module:/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow editing namespace', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const namespaceInput = screen.getByLabelText(/Namespace:/) as HTMLInputElement;
      fireEvent.change(namespaceInput, { target: { value: 'Com.NewNamespace' } });

      expect(namespaceInput.value).toBe('Com.NewNamespace');
    });

    it('should allow editing filename', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;
      fireEvent.change(filenameInput, { target: { value: 'CustomFilename.cs' } });

      expect(filenameInput.value).toBe('CustomFilename.cs');
    });

    it('should call onClose when Cancel button is clicked', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when X button is clicked', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const overlay = screen.getByText('Generate Source Code').closest('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when clicking modal content', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const modalContent = screen.getByText('Generate Source Code').closest('.modal-content');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Generate Button', () => {
    it('should be disabled when namespace is empty', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const namespaceInput = screen.getByLabelText(/Namespace:/);
      fireEvent.change(namespaceInput, { target: { value: '' } });

      const generateButton = screen.getByText('Generate & Download');
      expect(generateButton).toBeDisabled();
    });

    it('should be disabled when namespace is only whitespace', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const namespaceInput = screen.getByLabelText(/Namespace:/);
      fireEvent.change(namespaceInput, { target: { value: '   ' } });

      const generateButton = screen.getByText('Generate & Download');
      expect(generateButton).toBeDisabled();
    });

    it('should be enabled when namespace has content', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const generateButton = screen.getByText('Generate & Download');
      expect(generateButton).not.toBeDisabled();
    });

    it('should call onGenerate with correct parameters when clicked', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const generateButton = screen.getByText('Generate & Download');
      fireEvent.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledTimes(1);
      expect(mockOnGenerate).toHaveBeenCalledWith(
        'csharp',
        'Com.Example.UserMgmt',
        'UserManagementSchemas.cs'
      );
    });

    it('should call onGenerate with custom values', () => {
      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / User Management"
          context={mockContext}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const languageSelect = screen.getByLabelText(/Target Language:/);
      const namespaceInput = screen.getByLabelText(/Namespace:/);
      const filenameInput = screen.getByLabelText(/Output Filename:/);

      fireEvent.change(languageSelect, { target: { value: 'golang' } });
      fireEvent.change(namespaceInput, { target: { value: 'com.custom.namespace' } });
      fireEvent.change(filenameInput, { target: { value: 'CustomFile.go' } });

      const generateButton = screen.getByText('Generate & Download');
      fireEvent.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith(
        'golang',
        'com.custom.namespace',
        'CustomFile.go'
      );
    });
  });

  describe('PascalCase Conversion', () => {
    it('should convert space-separated words to PascalCase', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'user management system'
      };

      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / user management system"
          context={contextWithSpaces}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;
      expect(filenameInput.value).toBe('UserManagementSystemSchemas.cs');
    });

    it('should convert hyphen-separated words to PascalCase', () => {
      const contextWithHyphens = {
        ...mockContext,
        contextName: 'user-management-system'
      };

      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / user-management-system"
          context={contextWithHyphens}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;
      expect(filenameInput.value).toBe('UserManagementSystemSchemas.cs');
    });

    it('should convert underscore-separated words to PascalCase', () => {
      const contextWithUnderscores = {
        ...mockContext,
        contextName: 'user_management_system'
      };

      render(
        <SourceCodeGenerationModal
          isOpen={true}
          contextPath="TestProduct / TestDomain / user_management_system"
          context={contextWithUnderscores}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );

      const filenameInput = screen.getByLabelText(/Output Filename:/) as HTMLInputElement;
      expect(filenameInput.value).toBe('UserManagementSystemSchemas.cs');
    });
  });
});
