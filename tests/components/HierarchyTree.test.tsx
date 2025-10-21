import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HierarchyTree } from '../../src/components/HierarchyTree';
import { Product, Domain, Context, Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus, SchemaScope } from '../../src/types/schema';
import { HierarchyTreeState, HierarchyTreeCallbacks } from '../../src/hooks/useHierarchyTree';
import { HierarchyTreeHandlers, HierarchyTreeStateHandlers } from '../../src/components/eventHandlers/HierarchyTreeHandlers';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pencil: () => <div data-testid="pencil-icon">Pencil</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Pin: () => <div data-testid="pin-icon">Pin</div>,
  PinOff: () => <div data-testid="pin-off-icon">PinOff</div>,
  Box: () => <div data-testid="box-icon">Box</div>,
  Waypoints: () => <div data-testid="waypoints-icon">Waypoints</div>,
  Circle: () => <div data-testid="circle-icon">Circle</div>,
  CircleAlert: () => <div data-testid="circle-alert-icon">CircleAlert</div>,
  Binary: () => <div data-testid="binary-icon">Binary</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  CircleHelp: () => <div data-testid="circle-help-icon">CircleHelp</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  BellOff: () => <div data-testid="bell-off-icon">BellOff</div>,
  Braces: () => <div data-testid="braces-icon">Braces</div>
}));

// Mock DropdownMenu component
vi.mock('../../src/components/DropdownMenu', () => ({
  DropdownMenu: ({ items }: { items: any[] }) => (
    <div data-testid="dropdown-menu">
      {items.map((item, index) => (
        <button key={index} onClick={item.onClick} title={item.tooltip}>
          {item.label}
        </button>
      ))}
    </div>
  )
}));

// Mock SemanticVersion
vi.mock('../../src/services/semanticVersion', () => ({
  SemanticVersion: {
    sort: (versions: SchemaVersion[]) => [...versions].sort((a, b) => a.semanticVersion.localeCompare(b.semanticVersion))
  }
}));

const mockSchemaVersion: SchemaVersion = {
  id: 'version-1',
  specification: 'command TestCommand { field: string }',
  semanticVersion: '1.0.0',
  status: SchemaStatus.Published,
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
  versions: [mockSchemaVersion],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const mockContext: Context = {
  id: 'context-1',
  name: 'Test Context',
  description: 'Test context description',
  domainId: 'domain-1',
  schemas: [mockSchema],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const mockDomain: Domain = {
  id: 'domain-1',
  name: 'Test Domain',
  description: 'Test domain description',
  productId: 'product-1',
  contexts: [mockContext],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const mockProduct: Product = {
  id: 'product-1',
  name: 'Test Product',
  description: 'Test product description',
  domains: [mockDomain],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const defaultProps = {
  state: {
    products: [mockProduct],
    expandedItems: new Set<string>(),
    pinnedItem: null,
    selectedItem: null,
    statusFilter: {
      Draft: true,
      Published: true,
      Deprecated: true,
      Removed: true
    }
  },
  callbacks: {
    onExpandedItemsChange: vi.fn(),
    onFind: vi.fn(),
    onFilter: vi.fn()
  },
  handlers: {
    onItemSelect: vi.fn(),
    onPinProduct: vi.fn(),
    onPinDomain: vi.fn(),
    onPinContext: vi.fn(),
    onUnpin: vi.fn(),
    onSchemaSelect: vi.fn(),
    onCreateProduct: vi.fn(),
    onCreateDomain: vi.fn(),
    onCreateContext: vi.fn(),
    onCreateSchema: vi.fn(),
    onCreateSchemaVersion: vi.fn(),
    onEditProduct: vi.fn(),
    onEditDomain: vi.fn(),
    onEditContext: vi.fn(),
    onEditSchema: vi.fn(),
    onEditSchemaVersion: vi.fn()
  },
  stateHandlers: {
    toggleExpanded: vi.fn(),
    toggleAllDescendants: vi.fn(),
    setContextMenu: vi.fn()
  }
};

// Helper function to create test props with overrides
const createTestProps = (overrides: any = {}) => {
  const result = {
    ...defaultProps,
    state: {
      ...defaultProps.state,
      ...overrides.state
    },
    callbacks: {
      ...defaultProps.callbacks,
      ...overrides.callbacks
    },
    handlers: {
      ...defaultProps.handlers,
      ...overrides.handlers
    },
    stateHandlers: {
      ...defaultProps.stateHandlers,
      ...overrides.stateHandlers
    }
  };
  return result;
};

describe('HierarchyTree', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the hierarchy tree with products root', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('should render product with correct icon', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      expect(screen.getByTestId('box-icon')).toBeInTheDocument();
    });

    it('should render root actions dropdown', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const dropdowns = screen.getAllByTestId('dropdown-menu');
      expect(dropdowns[0]).toBeInTheDocument();
      // Verify it's the root dropdown by checking it contains "Find" and "New Product" buttons
      expect(dropdowns[0]).toHaveTextContent('Find');
      expect(dropdowns[0]).toHaveTextContent('New Product');
    });

    it('should render empty hierarchy when no products', () => {
      const props = createTestProps({
        state: { products: [] }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
    });
  });

  describe('Product Rendering', () => {
    it('should render product item with correct structure', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      expect(productItem).toHaveClass('hierarchy-item', 'expandable');
      expect(productItem).not.toHaveClass('expanded');
    });

    it('should show product as selected when selectedItem matches', () => {
      const props = createTestProps({
        state: { selectedItem: { type: 'product' as const, id: 'product-1' } }
      });
      render(<HierarchyTree {...props} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      expect(productItem).toHaveClass('selected');
    });

    it('should show product as expanded when in expandedItems', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      expect(productItem).toHaveClass('expanded');
      expect(screen.getByText('Test Domain')).toBeInTheDocument();
    });
  });

  describe('Domain Rendering', () => {
    it('should render domain when product is expanded', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Domain')).toBeInTheDocument();
      expect(screen.getByTestId('waypoints-icon')).toBeInTheDocument();
    });

    it('should show domain as selected when selectedItem matches', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1']),
          selectedItem: { type: 'domain' as const, id: 'domain-1' } }
      });
      render(<HierarchyTree {...props} />);
      
      const domainItem = screen.getByText('Test Domain').closest('.hierarchy-item');
      expect(domainItem).toHaveClass('selected');
    });
  });

  describe('Context Rendering', () => {
    it('should render context when domain is expanded', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Context')).toBeInTheDocument();
      expect(screen.getByTestId('circle-icon')).toBeInTheDocument();
    });

    it('should show context as selected when selectedItem matches', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1']),
          selectedItem: { type: 'context' as const, id: 'context-1' } }
      });
      render(<HierarchyTree {...props} />);
      
      const contextItem = screen.getByText('Test Context').closest('.hierarchy-item');
      expect(contextItem).toHaveClass('selected');
    });
  });

  describe('Schema Category Rendering', () => {
    it('should render schema categories when context is expanded', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Commands')).toBeInTheDocument();
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument();
    });

    it('should render all schema category icons correctly', () => {
      const multiCategorySchema: Schema = {
        ...mockSchema,
        schemaTypeCategory: SchemaTypeCategory.Data
      };
      
      const contextWithMultipleSchemas: Context = {
        ...mockContext,
        schemas: [
          mockSchema, // Commands
          { ...multiCategorySchema, id: 'schema-2', schemaTypeCategory: SchemaTypeCategory.Data },
          { ...multiCategorySchema, id: 'schema-3', schemaTypeCategory: SchemaTypeCategory.Documents },
          { ...multiCategorySchema, id: 'schema-4', schemaTypeCategory: SchemaTypeCategory.Envelopes },
          { ...multiCategorySchema, id: 'schema-5', schemaTypeCategory: SchemaTypeCategory.Events },
          { ...multiCategorySchema, id: 'schema-6', schemaTypeCategory: SchemaTypeCategory.Queries }
        ]
      };
      
      const productWithMultipleCategories: Product = {
        ...mockProduct,
        domains: [{
          ...mockDomain,
          contexts: [contextWithMultipleSchemas]
        }]
      };
      
      const props = createTestProps({
        state: { products: [productWithMultipleCategories],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1']) }
      });
      
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByTestId('circle-alert-icon')).toBeInTheDocument(); // Commands
      expect(screen.getByTestId('binary-icon')).toBeInTheDocument(); // Data
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument(); // Documents
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument(); // Envelopes
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument(); // Events
      expect(screen.getByTestId('circle-help-icon')).toBeInTheDocument(); // Queries
    });
  });

  describe('Schema Rendering', () => {
    it('should render schema when category is expanded', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands']) }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Schema')).toBeInTheDocument();
    });

    it('should show schema as selected when selectedItem matches', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands']),
          selectedItem: { type: 'schema' as const, id: 'schema-1' } }
      });
      render(<HierarchyTree {...props} />);
      
      const schemaItem = screen.getByText('Test Schema').closest('.hierarchy-item');
      expect(schemaItem).toHaveClass('selected');
    });
  });

  describe('Schema Version Rendering', () => {
    it('should render schema version when schema is expanded', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('should show version as selected when selectedItem matches', () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']),
          selectedItem: { type: 'version' as const, id: 'version-1' } }
      });
      render(<HierarchyTree {...props} />);
      
      const versionItem = screen.getByText('v1.0.0').closest('.hierarchy-item');
      expect(versionItem).toHaveClass('selected');
    });
  });

  describe('Click Interactions', () => {
    it('should call onItemSelect when product is clicked', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      await user.click(productItem!);
      
      // Single-click should call onItemSelect with the full product object
      expect(defaultProps.handlers.onItemSelect).toHaveBeenCalledWith(
        'product', 
        'product-1', 
        expect.objectContaining({
          id: 'product-1',
          name: 'Test Product'
        })
      );
      
      // Single-click should NOT toggle expansion
      expect(defaultProps.stateHandlers.toggleExpanded).not.toHaveBeenCalled();
    });

    it('should toggle expansion when expand arrow is clicked', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const expandArrow = screen.getByTestId('chevron-right-icon').closest('button');
      await user.click(expandArrow!);
      
      expect(defaultProps.stateHandlers.toggleExpanded).toHaveBeenCalledWith('product-1');
      // Arrow click should NOT call onItemSelect
      expect(defaultProps.handlers.onItemSelect).not.toHaveBeenCalled();
    });

    it('should toggle expansion when product is double-clicked', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      await user.dblClick(productItem!);
      
      expect(defaultProps.stateHandlers.toggleExpanded).toHaveBeenCalledWith('product-1');
    });

    it('should call onSchemaSelect when version is clicked', async () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      const versionItem = screen.getByText('v1.0.0').closest('.hierarchy-item');
      await user.click(versionItem!);
      
      expect(defaultProps.handlers.onSchemaSelect).toHaveBeenCalledWith(mockSchema, mockSchemaVersion);
    });
  });

  describe('Shift+Click Interactions', () => {
    it('should expand all descendants when shift+clicking product', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      fireEvent.click(productItem!, { shiftKey: true });
      
      // Should call toggleAllDescendants for expanding all children
      expect(defaultProps.stateHandlers.toggleAllDescendants).toHaveBeenCalledWith('product-1', 'product', false);
    });

    it('should collapse all descendants when shift+clicking expanded product', async () => {
      const props = createTestProps({
        state: { expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']) }
      });
      render(<HierarchyTree {...props} />);
      
      const productItem = screen.getByText('Test Product').closest('.hierarchy-item');
      fireEvent.click(productItem!, { shiftKey: true });
      
      // Should call toggleAllDescendants for collapsing all children
      expect(defaultProps.stateHandlers.toggleAllDescendants).toHaveBeenCalledWith('product-1', 'product', true);
    });
  });

  describe('Dropdown Menu Actions', () => {
    it('should call onFind when Find is clicked from root dropdown', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const findButton = screen.getByText('Find');
      await user.click(findButton);
      
      expect(defaultProps.callbacks.onFind).toHaveBeenCalled();
    });

    it('should call onCreateProduct when New Product is clicked from root dropdown', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const newProductButton = screen.getByText('New Product');
      await user.click(newProductButton);
      
      expect(defaultProps.handlers.onCreateProduct).toHaveBeenCalled();
    });

    it('should call onEditProduct when Edit is clicked from product dropdown', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      expect(defaultProps.handlers.onEditProduct).toHaveBeenCalledWith(mockProduct);
    });

    it('should call onPinProduct when Pin is clicked from product dropdown', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const pinButton = screen.getByText('Pin');
      await user.click(pinButton);
      
      expect(defaultProps.handlers.onPinProduct).toHaveBeenCalledWith(mockProduct);
    });

    it('should call onCreateDomain when New Domain is clicked from product dropdown', async () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const newDomainButton = screen.getByText('New Domain');
      await user.click(newDomainButton);
      
      expect(defaultProps.handlers.onCreateDomain).toHaveBeenCalledWith('product-1');
    });
  });

  describe('Pinned View', () => {
    it('should render pinned product view', () => {
      const props = createTestProps({
        state: { pinnedItem: { type: 'product' as const, item: mockProduct } }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByTestId('pin-off-icon')).toBeInTheDocument();
    });

    it('should render pinned domain view with path', () => {
      const props = createTestProps({
        state: { pinnedItem: { type: 'domain' as const, item: mockDomain } }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Product/Test Domain')).toBeInTheDocument();
      expect(screen.getByTestId('pin-off-icon')).toBeInTheDocument();
    });

    it('should render pinned context view with full path', () => {
      const props = createTestProps({
        state: { pinnedItem: { type: 'context' as const, item: mockContext } }
      });
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Product/Test Domain/Test Context')).toBeInTheDocument();
      expect(screen.getByTestId('pin-off-icon')).toBeInTheDocument();
    });

    it('should call onUnpin when unpin button is clicked', async () => {
      const props = createTestProps({
        state: { pinnedItem: { type: 'product' as const, item: mockProduct } }
      });
      render(<HierarchyTree {...props} />);
      
      const unpinButton = screen.getByTestId('pin-off-icon').closest('button');
      await user.click(unpinButton!);
      
      expect(defaultProps.handlers.onUnpin).toHaveBeenCalled();
    });

    it('should call onUnpin when pinned item no longer exists', () => {
      const props = createTestProps({
        state: { products: [], // Remove the product that was pinned
          pinnedItem: { type: 'product' as const, item: mockProduct } }
      });
      render(<HierarchyTree {...props} />);
      
      expect(defaultProps.handlers.onUnpin).toHaveBeenCalled();
    });
  });

  describe('Alphabetical Sorting', () => {
    it('should display products in alphabetical order', () => {
      // Test with pre-sorted products (as they would come from App component)
      const sortedProducts: Product[] = [
        {
          id: 'product-1',
          name: 'Alpha Product',
          description: 'First product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-2',
          name: 'Beta Product',
          description: 'Middle product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-3',
          name: 'Zebra Product',
          description: 'Last product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const props = createTestProps({
        state: { products: sortedProducts }
      });
      render(<HierarchyTree {...props} />);

      // Use a more specific approach - look for products by their text content  
      expect(screen.getByText('Alpha Product')).toBeInTheDocument();
      expect(screen.getByText('Beta Product')).toBeInTheDocument();
      expect(screen.getByText('Zebra Product')).toBeInTheDocument();
      
      // Verify they appear in order by checking DOM order
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Product');
      const betaIndex = allText.indexOf('Beta Product');  
      const zebraIndex = allText.indexOf('Zebra Product');
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should display domains in alphabetical order within each product', () => {
      // Test with pre-sorted domains (as they would come from App component)
      const productWithSortedDomains: Product = {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test Description',
        domains: [
          {
            id: 'domain-1',
            name: 'Alpha Domain',
            description: 'First domain',
            contexts: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'domain-2',
            name: 'Beta Domain', 
            description: 'Middle domain',
            contexts: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'domain-3',
            name: 'Zebra Domain',
            description: 'Last domain',
            contexts: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const props = createTestProps({
        state: { 
          products: [productWithSortedDomains],
          expandedItems: new Set(['product-1'])
        }
      });
      render(<HierarchyTree {...props} />);

      // Verify domains appear in sorted order
      expect(screen.getByText('Alpha Domain')).toBeInTheDocument();
      expect(screen.getByText('Beta Domain')).toBeInTheDocument();
      expect(screen.getByText('Zebra Domain')).toBeInTheDocument();
      
      // Verify they appear in DOM order
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Domain');
      const betaIndex = allText.indexOf('Beta Domain');
      const zebraIndex = allText.indexOf('Zebra Domain');
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should display contexts in alphabetical order within each domain', () => {
      // Test with pre-sorted contexts (as they would come from App component)
      const domainWithSortedContexts: Domain = {
        id: 'domain-1',
        name: 'Test Domain',
        description: 'Test Description',
        contexts: [
          {
            id: 'context-1',
            name: 'Alpha Context',
            description: 'First context',
            schemas: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'context-2',
            name: 'Beta Context',
            description: 'Middle context',
            schemas: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'context-3',
            name: 'Zebra Context',
            description: 'Last context',
            schemas: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const productWithSortedContexts: Product = {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test Description',
        domains: [domainWithSortedContexts],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const props = createTestProps({
        state: { 
          products: [productWithSortedContexts],
          expandedItems: new Set(['product-1', 'domain-1'])
        }
      });
      render(<HierarchyTree {...props} />);

      // Verify contexts appear in sorted order
      expect(screen.getByText('Alpha Context')).toBeInTheDocument();
      expect(screen.getByText('Beta Context')).toBeInTheDocument();
      expect(screen.getByText('Zebra Context')).toBeInTheDocument();
      
      // Verify they appear in DOM order
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Context');
      const betaIndex = allText.indexOf('Beta Context');
      const zebraIndex = allText.indexOf('Zebra Context');
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should handle case-insensitive alphabetical sorting', () => {
      // Test with pre-sorted mixed case products (as they would come from App component)
      const productsWithMixedCase: Product[] = [
        {
          id: 'product-2',
          name: 'Alpha Product',
          description: 'Uppercase first letter',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-3',
          name: 'beta product',
          description: 'Mixed case',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-1',
          name: 'zebra product',
          description: 'Lowercase first letter',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const props = createTestProps({
        state: { products: productsWithMixedCase }
      });
      render(<HierarchyTree {...props} />);

      // Verify case-insensitive sorting is working  
      expect(screen.getByText('Alpha Product')).toBeInTheDocument();
      expect(screen.getByText('beta product')).toBeInTheDocument();
      expect(screen.getByText('zebra product')).toBeInTheDocument();
      
      // Verify they appear in DOM order regardless of case
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Product');
      const betaIndex = allText.indexOf('beta product');
      const zebraIndex = allText.indexOf('zebra product');
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should maintain sorting when new items are added', () => {
      // This test simulates receiving already-sorted data (as would happen from the sortRegistryData function)
      const initialProducts: Product[] = [
        {
          id: 'product-1',
          name: 'Alpha Product',
          description: 'First product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-3',
          name: 'Zebra Product',
          description: 'Last product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const initialProps = createTestProps({
        state: { products: initialProducts }
      });
      const { rerender } = render(<HierarchyTree {...initialProps} />);

      // Add a new product in the middle alphabetically
      const updatedProducts: Product[] = [
        {
          id: 'product-1',
          name: 'Alpha Product',
          description: 'First product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-2',
          name: 'Beta Product',
          description: 'Middle product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-3',
          name: 'Zebra Product',
          description: 'Last product',
          domains: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const updatedProps = createTestProps({
        state: { products: updatedProducts }
      });
      rerender(<HierarchyTree {...updatedProps} />);

      // Verify sorting is maintained after updates
      expect(screen.getByText('Alpha Product')).toBeInTheDocument();
      expect(screen.getByText('Beta Product')).toBeInTheDocument();
      expect(screen.getByText('Zebra Product')).toBeInTheDocument();
      
      // Verify they appear in DOM order  
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Product');
      const betaIndex = allText.indexOf('Beta Product');
      const zebraIndex = allText.indexOf('Zebra Product');
      
      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should handle nested sorting correctly', () => {
      // Test with pre-sorted nested hierarchy (as it would come from App component)
      const complexHierarchy: Product[] = [
        {
          id: 'product-1',
          name: 'Alpha Product',
          description: 'First product',
          domains: [
            {
              id: 'domain-2',
              name: 'Alpha Domain',
              description: 'First domain in Alpha',
              contexts: [],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'product-2',
          name: 'Beta Product',
          description: 'Second product',
          domains: [
            {
              id: 'domain-1',
              name: 'Zebra Domain',
              description: 'Last domain in Beta',
              contexts: [
                {
                  id: 'context-1',
                  name: 'Alpha Context',
                  description: 'First context',
                  schemas: [],
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z'
                },
                {
                  id: 'context-2',
                  name: 'Beta Context',
                  description: 'Middle context',
                  schemas: [],
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z'
                }
              ],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      const props = createTestProps({
        state: { 
          products: complexHierarchy,
          expandedItems: new Set(['product-1', 'product-2', 'domain-1', 'domain-2'])
        }
      });
      render(<HierarchyTree {...props} />);

      // Verify nested hierarchical sorting is working correctly
      expect(screen.getByText('Alpha Product')).toBeInTheDocument();
      expect(screen.getByText('Beta Product')).toBeInTheDocument();
      expect(screen.getByText('Alpha Domain')).toBeInTheDocument(); 
      expect(screen.getByText('Zebra Domain')).toBeInTheDocument();
      expect(screen.getByText('Alpha Context')).toBeInTheDocument();
      expect(screen.getByText('Beta Context')).toBeInTheDocument();
      
      // Verify DOM order for products
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaProductIndex = allText.indexOf('Alpha Product');
      const betaProductIndex = allText.indexOf('Beta Product');
      expect(alphaProductIndex).toBeLessThan(betaProductIndex);
      
      // Verify DOM order for contexts (both should appear after their parent domain)
      const alphaContextIndex = allText.indexOf('Alpha Context');
      const betaContextIndex = allText.indexOf('Beta Context');
      expect(alphaContextIndex).toBeLessThan(betaContextIndex);
    });

    it('should display schemas in alphabetical order within their type categories', () => {
      // Create a context with multiple schemas in the same category but unsorted names
      const schemasData: Schema[] = [
        {
          id: 'schema-3',
          name: 'Zebra Event',
          description: 'Last schema',
          schemaTypeCategory: SchemaTypeCategory.Events,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'schema-1',
          name: 'Alpha Event',
          description: 'First schema',
          schemaTypeCategory: SchemaTypeCategory.Events,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'schema-2',
          name: 'Beta Event',
          description: 'Middle schema',
          schemaTypeCategory: SchemaTypeCategory.Events,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      ];

      // Pre-sort schemas as they would come from App component
      const sortedSchemas = schemasData
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const contextWithSortedSchemas: Context = {
        ...mockContext,
        schemas: sortedSchemas
      };

      const productWithSortedSchemas: Product = {
        ...mockProduct,
        domains: [{
          ...mockDomain,
          contexts: [contextWithSortedSchemas]
        }]
      };

      const props = createTestProps({
        state: { 
          products: [productWithSortedSchemas],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Events'])
        }
      });
      render(<HierarchyTree {...props} />);

      // Verify all schemas appear in the document
      expect(screen.getByText('Alpha Event')).toBeInTheDocument();
      expect(screen.getByText('Beta Event')).toBeInTheDocument();
      expect(screen.getByText('Zebra Event')).toBeInTheDocument();

      // Verify they appear in DOM order
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      const alphaIndex = allText.indexOf('Alpha Event');
      const betaIndex = allText.indexOf('Beta Event');
      const zebraIndex = allText.indexOf('Zebra Event');

      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should sort schemas across different type categories independently', () => {
      // Create schemas in different categories with names that should sort independently
      const schemasData: Schema[] = [
        // Event schemas (will be under Events category)
        {
          id: 'schema-event-2',
          name: 'Zebra Event',
          description: 'Event schema',
          schemaTypeCategory: SchemaTypeCategory.Events,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'schema-event-1',
          name: 'Alpha Event',
          description: 'Event schema',
          schemaTypeCategory: SchemaTypeCategory.Events,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        // Command schemas (will be under Commands category)
        {
          id: 'schema-command-2',
          name: 'Zebra Command',
          description: 'Command schema',
          schemaTypeCategory: SchemaTypeCategory.Commands,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'schema-command-1',
          name: 'Alpha Command',
          description: 'Command schema',
          schemaTypeCategory: SchemaTypeCategory.Commands,
          scope: SchemaScope.Private,
          contextId: 'context-1',
          versions: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      ];

      // Pre-sort schemas as they would come from App component
      const sortedSchemas = schemasData
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const contextWithMultiCategorySchemas: Context = {
        ...mockContext,
        schemas: sortedSchemas
      };

      const productWithMultiCategorySchemas: Product = {
        ...mockProduct,
        domains: [{
          ...mockDomain,
          contexts: [contextWithMultiCategorySchemas]
        }]
      };

      const props = createTestProps({
        state: { 
          products: [productWithMultiCategorySchemas],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Events', 'context-1-Commands'])
        }
      });
      render(<HierarchyTree {...props} />);

      // Verify schemas are present
      expect(screen.getByText('Alpha Event')).toBeInTheDocument();
      expect(screen.getByText('Zebra Event')).toBeInTheDocument();
      expect(screen.getByText('Alpha Command')).toBeInTheDocument();
      expect(screen.getByText('Zebra Command')).toBeInTheDocument();

      // Verify sorting within each category by checking DOM order
      const container = document.querySelector('body');
      const allText = container?.textContent || '';
      
      // Within Events category: Alpha Event should come before Zebra Event
      const alphaEventIndex = allText.indexOf('Alpha Event');
      const zebraEventIndex = allText.indexOf('Zebra Event');
      expect(alphaEventIndex).toBeLessThan(zebraEventIndex);
      
      // Within Commands category: Alpha Command should come before Zebra Command
      const alphaCommandIndex = allText.indexOf('Alpha Command');
      const zebraCommandIndex = allText.indexOf('Zebra Command');
      expect(alphaCommandIndex).toBeLessThan(zebraCommandIndex);
    });
  });

  describe('Schema Version Sorting', () => {
    it('should sort schema versions using SemanticVersion', () => {
      const multipleVersions: SchemaVersion[] = [
        { ...mockSchemaVersion, id: 'v2', semanticVersion: '2.0.0' },
        { ...mockSchemaVersion, id: 'v1', semanticVersion: '1.0.0' },
        { ...mockSchemaVersion, id: 'v1.1', semanticVersion: '1.1.0' }
      ];
      
      const schemaWithVersions: Schema = {
        ...mockSchema,
        versions: multipleVersions
      };
      
      const contextWithVersions: Context = {
        ...mockContext,
        schemas: [schemaWithVersions]
      };
      
      const productWithVersions: Product = {
        ...mockProduct,
        domains: [{
          ...mockDomain,
          contexts: [contextWithVersions]
        }]
      };
      
      const props = createTestProps({
        state: { products: [productWithVersions],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']) }
      });
      
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('v1.1.0')).toBeInTheDocument();
      expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty domains in product', () => {
      const productWithNoDomains: Product = {
        ...mockProduct,
        domains: []
      };
      
      const props = createTestProps({
        state: { products: [productWithNoDomains],
          expandedItems: new Set(['product-1']) }
      });
      
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.queryByText('Test Domain')).not.toBeInTheDocument();
    });

    it('should handle context with no schemas', () => {
      const contextWithNoSchemas: Context = {
        ...mockContext,
        schemas: []
      };
      
      const domainWithEmptyContext: Domain = {
        ...mockDomain,
        contexts: [contextWithNoSchemas]
      };
      
      const productWithEmptyContext: Product = {
        ...mockProduct,
        domains: [domainWithEmptyContext]
      };
      
      const props = createTestProps({
        state: { products: [productWithEmptyContext],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1']) }
      });
      
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Context')).toBeInTheDocument();
      // Should not render any categories since there are no schemas
      expect(screen.queryByText('Commands')).not.toBeInTheDocument();
    });

    it('should handle schema with no versions', () => {
      const schemaWithNoVersions: Schema = {
        ...mockSchema,
        versions: []
      };
      
      const contextWithEmptySchema: Context = {
        ...mockContext,
        schemas: [schemaWithNoVersions]
      };
      
      const props = createTestProps({
        state: { products: [{
          ...mockProduct,
          domains: [{
            ...mockDomain,
            contexts: [contextWithEmptySchema]
          }]
        }],
          expandedItems: new Set(['product-1', 'domain-1', 'context-1', 'context-1-Commands', 'schema-1']) }
      });
      
      render(<HierarchyTree {...props} />);
      
      expect(screen.getByText('Test Schema')).toBeInTheDocument();
      expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles for dropdown items', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // All dropdown buttons should have proper button role
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        // Buttons should either have type="button" or no type attribute (defaults to button)
        const type = button.getAttribute('type');
        expect(type === null || type === 'button').toBe(true);
      });
    });

    it('should have title attributes for dropdown buttons', () => {
      render(<HierarchyTree {...defaultProps} />);
      
      const findButton = screen.getByText('Find');
      const editButton = screen.getByText('Edit');
      const pinButton = screen.getByText('Pin');
      
      expect(findButton).toHaveAttribute('title', 'Find');
      expect(editButton).toHaveAttribute('title', 'Edit');
      expect(pinButton).toHaveAttribute('title', 'Pin');
    });
  });
});