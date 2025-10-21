import { describe, it, expect, vi } from 'vitest';
import {
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createContextMenuHandler,
  createProductMenuItems,
  createDomainMenuItems,
  createContextMenuItems,
  createSchemaMenuItems,
  createSchemaVersionMenuItems,
  createCategoryMenuItems,
  createProductClickHandler,
  createDomainClickHandler,
  createContextClickHandler,
  createSchemaClickHandler,
  createSchemaVersionClickHandler,
  createRightClickContextMenuItems
} from '../../../src/components/eventHandlers/HierarchyTreeHandlers';
import { Product, Domain, Context, Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus } from '../../../src/types/schema';

// Mock data
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

// Mock handlers
const mockHandlers: HierarchyTreeHandlers = {
  onItemSelect: vi.fn(),
  onEditProduct: vi.fn(),
  onEditDomain: vi.fn(),
  onEditContext: vi.fn(),
  onEditSchema: vi.fn(),
  onEditSchemaVersion: vi.fn(),
  onCreateProduct: vi.fn(),
  onCreateDomain: vi.fn(),
  onCreateContext: vi.fn(),
  onCreateSchema: vi.fn(),
  onCreateSchemaVersion: vi.fn(),
  onPinProduct: vi.fn(),
  onPinDomain: vi.fn(),
  onPinContext: vi.fn(),
  onUnpin: vi.fn(),
  onSchemaSelect: vi.fn(),
  onSubscribeProduct: vi.fn(),
  onSubscribeDomain: vi.fn(),
  onSubscribeContext: vi.fn()
};

const mockStateHandlers: HierarchyTreeStateHandlers = {
  toggleExpanded: vi.fn(),
  toggleAllDescendants: vi.fn(),
  setContextMenu: vi.fn()
};

describe('HierarchyTreeHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContextMenuHandler', () => {
    it('should create a context menu handler that calls setContextMenu', () => {
      const handler = createContextMenuHandler(mockStateHandlers.setContextMenu);
      const mockEvent = { 
        preventDefault: vi.fn(), 
        clientX: 100, 
        clientY: 200 
      } as unknown as React.MouseEvent;

      handler(mockEvent, 'product', 'product-1');

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockStateHandlers.setContextMenu).toHaveBeenCalledWith({
        type: 'product',
        id: 'product-1',
        x: 100,
        y: 200
      });
    });
  });

  describe('Menu Item Builders', () => {
    describe('createProductMenuItems', () => {
      it('should create product menu items with correct handlers', () => {
        const items = createProductMenuItems(mockProduct, mockHandlers);
        
        expect(items).toHaveLength(4);
        expect(items[0].label).toBe('Edit');
        expect(items[1].label).toBe('New Domain');
        expect(items[2].label).toBe('Pin');
        expect(items[3].label).toBe('Subscribe');

        // Test handlers
        items[0].onClick();
        expect(mockHandlers.onEditProduct).toHaveBeenCalledWith(mockProduct);

        items[1].onClick();
        expect(mockHandlers.onCreateDomain).toHaveBeenCalledWith(mockProduct.id);

        items[2].onClick();
        expect(mockHandlers.onPinProduct).toHaveBeenCalledWith(mockProduct);

        items[3].onClick();
        expect(mockHandlers.onSubscribeProduct).toHaveBeenCalledWith(mockProduct);
      });
    });

    describe('createDomainMenuItems', () => {
      it('should create domain menu items with correct handlers', () => {
        const items = createDomainMenuItems(mockDomain, mockHandlers);
        
        expect(items).toHaveLength(4);
        expect(items[0].label).toBe('Edit');
        expect(items[1].label).toBe('New Context');
        expect(items[2].label).toBe('Pin');
        expect(items[3].label).toBe('Subscribe');

        // Test handlers
        items[0].onClick();
        expect(mockHandlers.onEditDomain).toHaveBeenCalledWith(mockDomain);

        items[1].onClick();
        expect(mockHandlers.onCreateContext).toHaveBeenCalledWith(mockDomain.id);

        items[2].onClick();
        expect(mockHandlers.onPinDomain).toHaveBeenCalledWith(mockDomain);

        items[3].onClick();
        expect(mockHandlers.onSubscribeDomain).toHaveBeenCalledWith(mockDomain);
      });
    });

    describe('createContextMenuItems', () => {
      it('should create context menu items with correct handlers', () => {
        const items = createContextMenuItems(mockContext, mockHandlers);

        expect(items).toHaveLength(5);
        expect(items[0].label).toBe('Edit');
        expect(items[1].label).toBe('New Schema');
        expect(items[2].label).toBe('Generate');
        expect(items[3].label).toBe('Pin');
        expect(items[4].label).toBe('Subscribe');

        // Test handlers
        items[0].onClick();
        expect(mockHandlers.onEditContext).toHaveBeenCalledWith(mockContext);

        items[1].onClick();
        expect(mockHandlers.onCreateSchema).toHaveBeenCalledWith(mockContext.id);

        items[3].onClick();
        expect(mockHandlers.onPinContext).toHaveBeenCalledWith(mockContext);

        items[4].onClick();
        expect(mockHandlers.onSubscribeContext).toHaveBeenCalledWith(mockContext);
      });
    });

    describe('createSchemaMenuItems', () => {
      it('should create schema menu items with correct handlers', () => {
        const items = createSchemaMenuItems(mockSchema, mockHandlers);
        
        expect(items).toHaveLength(2);
        expect(items[0].label).toBe('Edit');
        expect(items[1].label).toBe('New Version');

        // Test handlers
        items[0].onClick();
        expect(mockHandlers.onEditSchema).toHaveBeenCalledWith(mockSchema);

        items[1].onClick();
        expect(mockHandlers.onCreateSchemaVersion).toHaveBeenCalledWith(mockSchema);
      });
    });

    describe('createSchemaVersionMenuItems', () => {
      it('should create schema version menu items with correct handlers', () => {
        const items = createSchemaVersionMenuItems(mockSchema, mockVersion, mockHandlers);
        
        expect(items).toHaveLength(2);
        expect(items[0].label).toBe('Edit');
        expect(items[1].label).toBe('New Version');

        // Test handlers
        items[0].onClick();
        expect(mockHandlers.onEditSchemaVersion).toHaveBeenCalledWith(mockSchema, mockVersion);

        items[1].onClick();
        expect(mockHandlers.onCreateSchemaVersion).toHaveBeenCalledWith(mockSchema);
      });
    });

    describe('createCategoryMenuItems', () => {
      it('should create category menu items with correct handlers', () => {
        const items = createCategoryMenuItems('context-1', SchemaTypeCategory.Events, mockHandlers);
        
        expect(items).toHaveLength(1);
        expect(items[0].label).toBe('New Schema');

        // Test handler
        items[0].onClick();
        expect(mockHandlers.onCreateSchema).toHaveBeenCalledWith('context-1', SchemaTypeCategory.Events);
      });
    });
  });

  describe('Click Handlers', () => {
    describe('createProductClickHandler', () => {
      it('should handle product click without shift key', () => {
        const handler = createProductClickHandler(mockProduct, mockHandlers, mockStateHandlers, false);
        const mockEvent = { 
          defaultPrevented: false, 
          shiftKey: false 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('product', mockProduct.id);
        expect(mockStateHandlers.toggleExpanded).toHaveBeenCalledWith(mockProduct.id);
      });

      it('should handle product click with shift key', () => {
        const handler = createProductClickHandler(mockProduct, mockHandlers, mockStateHandlers, true);
        const mockEvent = { 
          defaultPrevented: false, 
          shiftKey: true 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('product', mockProduct.id);
        expect(mockStateHandlers.toggleAllDescendants).toHaveBeenCalledWith(mockProduct.id, 'product', true);
      });

      it('should not toggle when event is prevented', () => {
        const handler = createProductClickHandler(mockProduct, mockHandlers, mockStateHandlers, false);
        const mockEvent = { 
          defaultPrevented: true, 
          shiftKey: false 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('product', mockProduct.id);
        expect(mockStateHandlers.toggleExpanded).not.toHaveBeenCalled();
      });
    });

    describe('createDomainClickHandler', () => {
      it('should handle domain click correctly', () => {
        const handler = createDomainClickHandler(mockDomain, mockHandlers, mockStateHandlers, false);
        const mockEvent = { 
          defaultPrevented: false, 
          shiftKey: false 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('domain', mockDomain.id);
        expect(mockStateHandlers.toggleExpanded).toHaveBeenCalledWith(mockDomain.id);
      });
    });

    describe('createContextClickHandler', () => {
      it('should handle context click correctly', () => {
        const handler = createContextClickHandler(mockContext, mockHandlers, mockStateHandlers, false);
        const mockEvent = { 
          defaultPrevented: false, 
          shiftKey: false 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('context', mockContext.id);
        expect(mockStateHandlers.toggleExpanded).toHaveBeenCalledWith(mockContext.id);
      });
    });

    describe('createSchemaClickHandler', () => {
      it('should handle schema click correctly', () => {
        const handler = createSchemaClickHandler(mockSchema, mockHandlers, mockStateHandlers);
        const mockEvent = { 
          defaultPrevented: false 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockHandlers.onItemSelect).toHaveBeenCalledWith('schema', mockSchema.id);
        expect(mockStateHandlers.toggleExpanded).toHaveBeenCalledWith(mockSchema.id);
      });
    });

    describe('createSchemaVersionClickHandler', () => {
      it('should handle schema version click correctly', () => {
        const handler = createSchemaVersionClickHandler(mockSchema, mockVersion, mockHandlers);
        const mockEvent = { 
          stopPropagation: vi.fn() 
        } as unknown as React.MouseEvent;

        handler(mockEvent);

        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(mockHandlers.onSchemaSelect).toHaveBeenCalledWith(mockSchema, mockVersion);
      });
    });
  });

  describe('createRightClickContextMenuItems', () => {
    const mockProducts: Product[] = [
      {
        id: 'product-1',
        name: 'Test Product',
        domains: [
          {
            id: 'domain-1', 
            name: 'Test Domain',
            contexts: [
              {
                id: 'context-1',
                name: 'Test Context',
                schemas: [
                  {
                    id: 'schema-1',
                    name: 'Test Schema',
                    schemaTypeCategory: SchemaTypeCategory.Events,
                    versions: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    it('should return empty array when no context menu', () => {
      const items = createRightClickContextMenuItems(null, mockProducts, mockHandlers);
      expect(items).toEqual([]);
    });

    it('should create product context menu items', () => {
      const items = createRightClickContextMenuItems(
        { type: 'product', id: 'product-1' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('Edit');
      
      items[0].onClick();
      expect(mockHandlers.onEditProduct).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('should create domain context menu items', () => {
      const items = createRightClickContextMenuItems(
        { type: 'domain', id: 'domain-1' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('Edit');
      
      items[0].onClick();
      expect(mockHandlers.onEditDomain).toHaveBeenCalledWith(mockProducts[0].domains[0]);
    });

    it('should create context context menu items', () => {
      const items = createRightClickContextMenuItems(
        { type: 'context', id: 'context-1' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('Edit');
      
      items[0].onClick();
      expect(mockHandlers.onEditContext).toHaveBeenCalledWith(mockProducts[0].domains[0].contexts[0]);
    });

    it('should create schema context menu items', () => {
      const items = createRightClickContextMenuItems(
        { type: 'schema', id: 'schema-1' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe('Edit');
      
      items[0].onClick();
      expect(mockHandlers.onEditSchema).toHaveBeenCalledWith(mockProducts[0].domains[0].contexts[0].schemas[0]);
    });

    it('should return empty array for unknown type', () => {
      const items = createRightClickContextMenuItems(
        { type: 'unknown', id: 'unknown-1' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toEqual([]);
    });

    it('should return empty array when entity not found', () => {
      const items = createRightClickContextMenuItems(
        { type: 'product', id: 'non-existent' },
        mockProducts,
        mockHandlers
      );
      
      expect(items).toEqual([]);
    });
  });
});