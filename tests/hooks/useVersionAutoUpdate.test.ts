import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useVersionAutoUpdate } from '../../src/hooks/useVersionAutoUpdate';
import { SchemaRegistry, Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

describe('useVersionAutoUpdate', () => {
  const mockSetEditingVersion = vi.fn();
  const mockSetSelectedSchema = vi.fn();
  
  const mockVersion: SchemaVersion = {
    id: 'version-1',
    semanticVersion: '1.0.0',
    specification: 'original spec',
    status: SchemaStatus.Draft
  };

  const mockSchema: Schema = {
    id: 'schema-1',
    name: 'Test Schema',
    schemaTypeCategory: SchemaTypeCategory.Events,
    versions: [mockVersion]
  };

  const mockRegistry: SchemaRegistry = {
    products: [
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
                schemas: [mockSchema]
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('should not update when not in edit-version mode', () => {
    renderHook(() => 
      useVersionAutoUpdate({
        registry: mockRegistry,
        viewMode: 'tree',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should not update when no editing version', () => {
    renderHook(() => 
      useVersionAutoUpdate({
        registry: mockRegistry,
        viewMode: 'edit-version',
        editingVersion: null,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should not update when no selected schema', () => {
    renderHook(() => 
      useVersionAutoUpdate({
        registry: mockRegistry,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: null,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should update when registry data changes for current version', () => {
    const updatedVersion: SchemaVersion = {
      ...mockVersion,
      specification: 'updated spec'
    };

    const updatedSchema: Schema = {
      ...mockSchema,
      versions: [updatedVersion]
    };

    const updatedRegistry: SchemaRegistry = {
      products: [
        {
          ...mockRegistry.products[0],
          domains: [
            {
              ...mockRegistry.products[0].domains[0],
              contexts: [
                {
                  ...mockRegistry.products[0].domains[0].contexts[0],
                  schemas: [updatedSchema]
                }
              ]
            }
          ]
        }
      ]
    };

    renderHook(() => 
      useVersionAutoUpdate({
        registry: updatedRegistry,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).toHaveBeenCalledWith(updatedVersion);
    expect(mockSetSelectedSchema).toHaveBeenCalledWith(updatedSchema);
    expect(console.log).toHaveBeenCalledWith('Auto-updating form with latest schema version data');
  });

  it('should not update when data has not changed', () => {
    renderHook(() => 
      useVersionAutoUpdate({
        registry: mockRegistry,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should not update when schema is not found in registry', () => {
    const emptyRegistry: SchemaRegistry = {
      products: []
    };

    renderHook(() => 
      useVersionAutoUpdate({
        registry: emptyRegistry,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should not update when version is not found in updated schema', () => {
    const schemaWithoutVersion: Schema = {
      ...mockSchema,
      versions: []
    };

    const registryWithoutVersion: SchemaRegistry = {
      products: [
        {
          ...mockRegistry.products[0],
          domains: [
            {
              ...mockRegistry.products[0].domains[0],
              contexts: [
                {
                  ...mockRegistry.products[0].domains[0].contexts[0],
                  schemas: [schemaWithoutVersion]
                }
              ]
            }
          ]
        }
      ]
    };

    renderHook(() => 
      useVersionAutoUpdate({
        registry: registryWithoutVersion,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).not.toHaveBeenCalled();
    expect(mockSetSelectedSchema).not.toHaveBeenCalled();
  });

  it('should update only schema when version is same but schema changed', () => {
    const updatedSchema: Schema = {
      ...mockSchema,
      name: 'Updated Schema Name',
      versions: [mockVersion] // Same version
    };

    const updatedRegistry: SchemaRegistry = {
      products: [
        {
          ...mockRegistry.products[0],
          domains: [
            {
              ...mockRegistry.products[0].domains[0],
              contexts: [
                {
                  ...mockRegistry.products[0].domains[0].contexts[0],
                  schemas: [updatedSchema]
                }
              ]
            }
          ]
        }
      ]
    };

    renderHook(() => 
      useVersionAutoUpdate({
        registry: updatedRegistry,
        viewMode: 'edit-version',
        editingVersion: mockVersion,
        selectedSchema: mockSchema,
        setEditingVersion: mockSetEditingVersion,
        setSelectedSchema: mockSetSelectedSchema
      })
    );

    expect(mockSetEditingVersion).toHaveBeenCalledWith(mockVersion);
    expect(mockSetSelectedSchema).toHaveBeenCalledWith(updatedSchema);
  });
});