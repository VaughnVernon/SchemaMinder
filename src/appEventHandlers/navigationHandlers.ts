import { 
  NavigationHandlers,
  CreateNavigationHandlers 
} from './types';
import { HierarchyFinder } from '../components/hierarchy/tools/hierarchyFinder';

/**
 * Creates navigation handler functions
 * These handlers manage navigation between different views and entity selection
 */
export const createNavigationHandlers: CreateNavigationHandlers = (deps) => {
  const {
    // State setters
    setViewMode,
    setSelectedSchema,
    setEditingVersion,
    setSelectedVersion,
    setCurrentProductId,
    setCurrentProductName,
    setCurrentDomainId,
    setCurrentDomainName,
    setCurrentContextId,
    setPreselectedCategory,
    setEditingProduct,
    setEditingDomain,
    setEditingContext,
    setEditingSchema,
    
    // Registry data
    sortedRegistry,
    
    // Hierarchy actions
    hierarchyActions
  } = deps;

  const handleSchemaSelect: NavigationHandlers['handleSchemaSelect'] = (schema, version) => {
    setSelectedSchema(schema);
    setEditingVersion(version);
    hierarchyActions.setSelectedItem({ type: 'version', id: version.id });
    setViewMode('edit-version');
  };

  const handleCreateDomain: NavigationHandlers['handleCreateDomain'] = (productId) => {
    const product = sortedRegistry.products.find(p => p.id === productId);
    setCurrentProductId(productId);
    setCurrentProductName(product?.name || '');
    setViewMode('create-domain');
  };

  const handleCreateContext: NavigationHandlers['handleCreateContext'] = (domainId) => {
    // Find domain and its parent product
    const domain = HierarchyFinder.findDomain(sortedRegistry.products, domainId);
    const parentProduct = HierarchyFinder.findProductByDomainId(sortedRegistry.products, domainId);
    
    setCurrentDomainId(domainId);
    setCurrentDomainName(domain?.name || '');
    setCurrentProductName(parentProduct?.name || '');
    setViewMode('create-context');
  };

  const handleCreateSchema: NavigationHandlers['handleCreateSchema'] = (contextId, category) => {
    setCurrentContextId(contextId);
    setPreselectedCategory(category);
    setViewMode('create-schema');
  };

  const handleCreateSchemaVersion: NavigationHandlers['handleCreateSchemaVersion'] = (schema) => {
    setSelectedSchema(schema);
    setSelectedVersion(null); // No base version for new creation
    setViewMode('create-version');
  };

  const handleEditProduct: NavigationHandlers['handleEditProduct'] = (product) => {
    setEditingProduct(product);
    setViewMode('edit-product');
  };

  const handleEditDomain: NavigationHandlers['handleEditDomain'] = (domain) => {
    setEditingDomain(domain);
    setViewMode('edit-domain');
  };

  const handleEditContext: NavigationHandlers['handleEditContext'] = (context) => {
    setEditingContext(context);
    setViewMode('edit-context');
  };

  const handleEditSchema: NavigationHandlers['handleEditSchema'] = (schema) => {
    setEditingSchema(schema);
    setViewMode('edit-schema');
  };

  return {
    handleSchemaSelect,
    handleCreateDomain,
    handleCreateContext,
    handleCreateSchema,
    handleCreateSchemaVersion,
    handleEditProduct,
    handleEditDomain,
    handleEditContext,
    handleEditSchema
  };
};