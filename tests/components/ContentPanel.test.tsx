import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContentPanel } from '../../src/components/ContentPanel';
import { SchemaRegistry, Schema, SchemaVersion, Product, Domain, Context, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

// Mock the form components
vi.mock('../../src/components/ProductForm', () => ({
  ProductForm: ({ mode, onCancel }: { mode: string; onCancel: () => void }) => (
    <div data-testid="product-form">
      Product Form - {mode}
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../../src/components/DomainForm', () => ({
  DomainForm: ({ mode, onCancel }: { mode: string; onCancel: () => void }) => (
    <div data-testid="domain-form">
      Domain Form - {mode}
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../../src/components/ContextForm', () => ({
  ContextForm: ({ mode, onCancel }: { mode: string; onCancel: () => void }) => (
    <div data-testid="context-form">
      Context Form - {mode}
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../../src/components/SchemaForm', () => ({
  SchemaForm: ({ mode, onCancel }: { mode: string; onCancel: () => void }) => (
    <div data-testid="schema-form">
      Schema Form - {mode}
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('../../src/components/SchemaVersionForm', () => ({
  SchemaVersionForm: ({ mode, onCancel }: { mode: string; onCancel: () => void }) => (
    <div data-testid="schema-version-form">
      Schema Version Form - {mode}
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

// Mock services
vi.mock('../../src/services/schemaTypeSpecification', () => ({
  getCurrentVersionString: vi.fn(() => '1.0.0'),
  getSuggestedNextVersion: vi.fn(() => '1.1.0'),
  getPreviousSpecification: vi.fn(() => 'previous spec')
}));

describe('ContentPanel', () => {
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    domains: []
  };

  const mockDomain: Domain = {
    id: 'domain-1',
    name: 'Test Domain',
    contexts: []
  };

  const mockContext: Context = {
    id: 'context-1',
    name: 'Test Context',
    schemas: []
  };

  const mockSchema: Schema = {
    id: 'schema-1',
    name: 'Test Schema',
    schemaTypeCategory: SchemaTypeCategory.Events,
    versions: []
  };

  const mockVersion: SchemaVersion = {
    id: 'version-1',
    semanticVersion: '1.0.0',
    specification: 'test spec',
    status: SchemaStatus.Draft
  };

  const mockRegistry: SchemaRegistry = {
    products: [
      {
        ...mockProduct,
        domains: [
          {
            ...mockDomain,
            contexts: [mockContext]
          }
        ]
      }
    ]
  };

  const mockHandlers = {
    handleProductSubmit: vi.fn(),
    handleDomainSubmit: vi.fn(),
    handleContextSubmit: vi.fn(),
    handleSchemaSubmit: vi.fn(),
    handleVersionSubmit: vi.fn(),
    handleProductEditSubmit: vi.fn(),
    handleDomainEditSubmit: vi.fn(),
    handleContextEditSubmit: vi.fn(),
    handleSchemaEditSubmit: vi.fn(),
    handleSchemaVersionEditSubmit: vi.fn()
  };

  const defaultProps = {
    viewMode: 'tree' as const,
    selectedItem: null,
    registry: mockRegistry,
    selectedSchema: null,
    selectedVersion: null,
    editingProduct: null,
    editingDomain: null,
    editingContext: null,
    editingSchema: null,
    editingVersion: null,
    currentProductId: 'product-1',
    currentDomainId: 'domain-1',
    currentContextId: 'context-1',
    currentProductName: 'Test Product',
    currentDomainName: 'Test Domain',
    currentContextName: 'Test Context',
    preselectedCategory: undefined,
    handlers: mockHandlers,
    setViewMode: vi.fn(),
    setPreselectedCategory: vi.fn(),
    setSelectedItem: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create modes', () => {
    it('should render ProductForm for create-product mode', () => {
      render(<ContentPanel {...defaultProps} viewMode="create-product" />);
      expect(screen.getByTestId('product-form')).toBeInTheDocument();
      expect(screen.getByText('Product Form - new')).toBeInTheDocument();
    });

    it('should render DomainForm for create-domain mode', () => {
      render(<ContentPanel {...defaultProps} viewMode="create-domain" />);
      expect(screen.getByTestId('domain-form')).toBeInTheDocument();
      expect(screen.getByText('Domain Form - new')).toBeInTheDocument();
    });

    it('should render ContextForm for create-context mode', () => {
      render(<ContentPanel {...defaultProps} viewMode="create-context" />);
      expect(screen.getByTestId('context-form')).toBeInTheDocument();
      expect(screen.getByText('Context Form - new')).toBeInTheDocument();
    });

    it('should render SchemaForm for create-schema mode', () => {
      render(<ContentPanel {...defaultProps} viewMode="create-schema" />);
      expect(screen.getByTestId('schema-form')).toBeInTheDocument();
      expect(screen.getByText('Schema Form - new')).toBeInTheDocument();
    });

    it('should render SchemaVersionForm for create-version mode when selectedSchema exists', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="create-version" 
          selectedSchema={mockSchema} 
        />
      );
      expect(screen.getByTestId('schema-version-form')).toBeInTheDocument();
      expect(screen.getByText('Schema Version Form - new')).toBeInTheDocument();
    });

    it('should not render anything for create-version mode when selectedSchema is null', () => {
      const { container } = render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="create-version" 
          selectedSchema={null} 
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edit modes', () => {
    it('should render ProductForm for edit-product mode when editingProduct exists', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="edit-product" 
          editingProduct={mockProduct} 
        />
      );
      expect(screen.getByTestId('product-form')).toBeInTheDocument();
      expect(screen.getByText('Product Form - edit')).toBeInTheDocument();
    });

    it('should render DomainForm for edit-domain mode when editingDomain exists', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="edit-domain" 
          editingDomain={mockDomain} 
        />
      );
      expect(screen.getByTestId('domain-form')).toBeInTheDocument();
      expect(screen.getByText('Domain Form - edit')).toBeInTheDocument();
    });

    it('should render ContextForm for edit-context mode when editingContext exists', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="edit-context" 
          editingContext={mockContext} 
        />
      );
      expect(screen.getByTestId('context-form')).toBeInTheDocument();
      expect(screen.getByText('Context Form - edit')).toBeInTheDocument();
    });

    it('should render SchemaForm for edit-schema mode when editingSchema exists', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="edit-schema" 
          editingSchema={mockSchema} 
        />
      );
      expect(screen.getByTestId('schema-form')).toBeInTheDocument();
      expect(screen.getByText('Schema Form - edit')).toBeInTheDocument();
    });

    it('should render SchemaVersionForm for edit-version mode when both editingVersion and selectedSchema exist', () => {
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="edit-version" 
          editingVersion={mockVersion}
          selectedSchema={mockSchema}
        />
      );
      expect(screen.getByTestId('schema-version-form')).toBeInTheDocument();
      expect(screen.getByText('Schema Version Form - edit')).toBeInTheDocument();
    });

    it('should not render anything for edit modes when editing entities are null', () => {
      const testCases = [
        { viewMode: 'edit-product' as const, editingProduct: null },
        { viewMode: 'edit-domain' as const, editingDomain: null },
        { viewMode: 'edit-context' as const, editingContext: null },
        { viewMode: 'edit-schema' as const, editingSchema: null },
        { viewMode: 'edit-version' as const, editingVersion: null, selectedSchema: null }
      ];

      testCases.forEach(({ viewMode, ...overrides }) => {
        const { container } = render(
          <ContentPanel {...defaultProps} viewMode={viewMode} {...overrides} />
        );
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Tree mode', () => {
    it('should render welcome message when no item is selected', () => {
      render(<ContentPanel {...defaultProps} viewMode="tree" selectedItem={null} />);
      expect(screen.getByText('Select an item on the left to view details here.')).toBeInTheDocument();
    });

    it('should not render forms for product, domain, context in tree mode (they now use direct edit handlers)', () => {
      // Product selection - should not render form in tree mode
      const { rerender } = render(
        <ContentPanel
          {...defaultProps}
          viewMode="tree"
          selectedItem={{ type: 'product', id: 'product-1' }}
        />
      );
      expect(screen.queryByTestId('product-form')).not.toBeInTheDocument();

      // Domain selection - should not render form in tree mode
      rerender(
        <ContentPanel
          {...defaultProps}
          viewMode="tree"
          selectedItem={{ type: 'domain', id: 'domain-1' }}
        />
      );
      expect(screen.queryByTestId('domain-form')).not.toBeInTheDocument();

      // Context selection - should not render form in tree mode
      rerender(
        <ContentPanel
          {...defaultProps}
          viewMode="tree"
          selectedItem={{ type: 'context', id: 'context-1' }}
        />
      );
      expect(screen.queryByTestId('context-form')).not.toBeInTheDocument();
    });

    it('should not render form for schema or version selections in tree mode', () => {
      const testCases = [
        { type: 'schema' as const, id: 'schema-1' },
        { type: 'version' as const, id: 'version-1' }
      ];

      testCases.forEach((selectedItem) => {
        const { container } = render(
          <ContentPanel {...defaultProps} viewMode="tree" selectedItem={selectedItem} />
        );
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Cancel handlers', () => {
    it('should call setViewMode(tree) when canceling create forms', () => {
      const setViewMode = vi.fn();
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="create-product"
          setViewMode={setViewMode}
        />
      );
      
      screen.getByText('Cancel').click();
      expect(setViewMode).toHaveBeenCalledWith('tree');
    });

    it('should call setPreselectedCategory(undefined) and setViewMode(tree) when canceling schema creation', () => {
      const setViewMode = vi.fn();
      const setPreselectedCategory = vi.fn();
      
      render(
        <ContentPanel 
          {...defaultProps} 
          viewMode="create-schema"
          setViewMode={setViewMode}
          setPreselectedCategory={setPreselectedCategory}
        />
      );
      
      screen.getByText('Cancel').click();
      expect(setPreselectedCategory).toHaveBeenCalledWith(undefined);
      expect(setViewMode).toHaveBeenCalledWith('tree');
    });

  });
});