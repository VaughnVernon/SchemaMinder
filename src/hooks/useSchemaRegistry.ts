import { useState, useEffect } from 'react';
import { 
  Context, 
  Schema, 
  SchemaVersion, 
  SchemaRegistry,
  SchemaScope,
  SchemaStatus
} from '../types/schema';
import { apiClient } from '../services/apiClient';

export const useSchemaRegistry = () => {
  const [registry, setRegistry] = useState<SchemaRegistry>({ products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API
  const loadRegistry = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { products } = await apiClient.getProducts();
      setRegistry({ products });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registry');
      console.error('Failed to load registry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load registry on mount
  useEffect(() => {
    loadRegistry();
  }, []);

  const addProduct = async (name: string, description?: string): Promise<string> => {
    try {
      const newProduct = await apiClient.createProduct({ name, description });
      await loadRegistry(); // Reload to get full hierarchy
      return newProduct.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      throw err;
    }
  };

  const addDomain = async (productId: string, name: string, description?: string): Promise<string> => {
    try {
      const newDomain = await apiClient.createDomain({ name, description, productId });
      await loadRegistry(); // Reload to get updated hierarchy
      return newDomain.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create domain');
      throw err;
    }
  };

  const addContext = async (domainId: string, name: string, namespace?: string, description?: string): Promise<string> => {
    try {
      const newContext = await apiClient.createContext({ name, namespace, description, domainId });
      await loadRegistry(); // Reload to get updated hierarchy
      return newContext.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create context');
      throw err;
    }
  };

  const addSchema = async (
    contextId: string, 
    schema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      // Create the schema first
      const newSchema = await apiClient.createSchema({
        name: schema.name,
        description: schema.description,
        schemaTypeCategory: schema.schemaTypeCategory,
        scope: schema.scope,
        contextId
      });
      
      // If the schema has an initial version, create it
      if (schema.versions && schema.versions.length > 0) {
        const initialVersion = schema.versions[0];
        await apiClient.createSchemaVersion({
          specification: initialVersion.specification,
          semanticVersion: initialVersion.semanticVersion,
          description: initialVersion.description,
          status: initialVersion.status,
          schemaId: newSchema.id
        });
      }
      
      await loadRegistry(); // Reload to get updated hierarchy
      return newSchema.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schema');
      throw err;
    }
  };

  const addSchemaVersion = async (
    schemaId: string, 
    version: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      const newVersion = await apiClient.createSchemaVersion({
        specification: version.specification,
        semanticVersion: version.semanticVersion,
        description: version.description,
        status: version.status,
        schemaId
      });
      await loadRegistry(); // Reload to get updated hierarchy
      return newVersion.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schema version');
      throw err;
    }
  };

  const updateProduct = async (productId: string, updates: { name?: string; description?: string }) => {
    try {
      await apiClient.updateProduct(productId, updates);
      await loadRegistry(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      throw err;
    }
  };

  const updateDomain = async (domainId: string, updates: { name?: string; description?: string }) => {
    try {
      await apiClient.updateDomain(domainId, updates);
      await loadRegistry(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update domain');
      throw err;
    }
  };

  const updateContext = async (contextId: string, updates: { name?: string; namespace?: string; description?: string }) => {
    try {
      await apiClient.updateContext(contextId, updates);
      await loadRegistry(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update context');
      throw err;
    }
  };

  const updateSchema = async (schemaId: string, updates: { 
    name?: string;
    description?: string; 
    schemaTypeCategory?: string;
    scope?: SchemaScope;
    versions?: Array<{
      versionId: string;
      specification: string;
      semanticVersion: string;
      description: string | null;
      status: string;
    }>;
  }) => {
    try {
      await apiClient.updateSchema(schemaId, updates);
      await loadRegistry(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schema');
      throw err;
    }
  };

  const updateSchemaVersion = async (
    _schemaId: string, 
    versionId: string, 
    updates: { description?: string; status?: SchemaStatus }
  ) => {
    try {
      await apiClient.updateSchemaVersion(versionId, updates);
      await loadRegistry(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schema version');
      throw err;
    }
  };

  // Helper functions for finding items in the hierarchy
  const findSchema = (schemaId: string): Schema | undefined => {
    for (const product of registry.products) {
      for (const domain of product.domains) {
        for (const context of domain.contexts) {
          const schema = context.schemas.find(s => s.id === schemaId);
          if (schema) return schema;
        }
      }
    }
    return undefined;
  };

  const findContext = (contextId: string): Context | undefined => {
    for (const product of registry.products) {
      for (const domain of product.domains) {
        const context = domain.contexts.find(c => c.id === contextId);
        if (context) return context;
      }
    }
    return undefined;
  };

  // Clear error helper
  const clearError = () => setError(null);

  // Get tenant info
  const tenantInfo = apiClient.getTenantInfo();

  return {
    registry,
    loading,
    error,
    tenantInfo,
    addProduct,
    addDomain,
    addContext,
    addSchema,
    addSchemaVersion,
    updateProduct,
    updateDomain,
    updateContext,
    updateSchema,
    updateSchemaVersion,
    findSchema,
    findContext,
    clearError,
    reload: loadRegistry
  };
};