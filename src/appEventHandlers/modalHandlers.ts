import { 
  ModalHandlers,
  CreateModalHandlers 
} from './types';
import { apiClient } from '../services/apiClient';

/**
 * Creates modal handler functions
 * These handlers manage Find and Filter modal interactions
 */
export const createModalHandlers: CreateModalHandlers = (deps) => {
  const {
    // State
    registry,
    hierarchyState,
    setViewMode,
    setSelectedSchema,
    setEditingVersion,
    setStatusFilter,
    
    // Hierarchy actions
    hierarchyActions
  } = deps;

  const handleFindQuery: ModalHandlers['handleFindQuery'] = async (query) => {
    try {
      const data = await apiClient.find(query);
      return data.results || [];
    } catch (error) {
      console.error('Find error:', error);
      return [];
    }
  };

  const handleFindSelect: ModalHandlers['handleFindSelect'] = (result) => {
    // Navigate to the result and expand the tree
    const { type, parentIds } = result;
    
    // Build the expansion path
    const expansionsToAdd = new Set(hierarchyState.expandedItems);
    
    if (parentIds.productId) {
      expansionsToAdd.add(parentIds.productId);
    }
    if (parentIds.domainId) {
      expansionsToAdd.add(parentIds.domainId);
    }
    if (parentIds.contextId) {
      expansionsToAdd.add(parentIds.contextId);
      
      // Add category expansion for schemas
      if (type === 'schema' || type === 'version') {
        // Find the schema to get its category
        const schema = registry.products
          .flatMap(p => p.domains)
          .flatMap(d => d.contexts)
          .flatMap(c => c.schemas)
          .find(s => s.id === (type === 'schema' ? result.entityId : parentIds.schemaId));
        
        if (schema) {
          const categoryId = `${parentIds.contextId}-${schema.schemaTypeCategory}`;
          expansionsToAdd.add(categoryId);
        }
      }
    }
    if (type === 'version' && parentIds.schemaId) {
      expansionsToAdd.add(parentIds.schemaId);
    }
    
    hierarchyActions.setExpandedItems(expansionsToAdd);
    
    // Set the selected item based on the find result type
    hierarchyActions.setSelectedItem({ type: type as any, id: result.entityId });
    setViewMode('tree');
    
    // If it's a schema version, select it for viewing
    if (type === 'version' && parentIds.schemaId) {
      const schema = registry.products
        .flatMap(p => p.domains)
        .flatMap(d => d.contexts)
        .flatMap(c => c.schemas)
        .find(s => s.id === parentIds.schemaId);
      
      const version = schema?.versions.find(v => v.id === result.entityId);
      
      if (schema && version) {
        setSelectedSchema(schema);
        setEditingVersion(version);
        setViewMode('edit-version');
      }
    }
  };

  const handleFilterApply: ModalHandlers['handleFilterApply'] = (filter) => {
    setStatusFilter(filter);
  };

  return {
    handleFindQuery,
    handleFindSelect,
    handleFilterApply
  };
};