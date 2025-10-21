import {
  FormSubmissionHandlers,
  CreateFormSubmissionHandlers
} from './types';

/**
 * Creates form submission handler functions
 * These handlers manage the creation of new entities in the registry
 */
export const createFormSubmissionHandlers: CreateFormSubmissionHandlers = (deps) => {
  const {
    // Registry operations
    addProduct,
    addDomain,
    addContext,
    addSchema,
    addSchemaVersion,
    sortedRegistry,
    registry,

    // Real-time messaging
    sendMessage,

    // State setters
    setViewMode,
    setPreselectedCategory,
    setSelectedSchema,
    setSelectedVersion,

    // Current state values
    currentProductId,
    currentDomainId,
    currentContextId,
    selectedSchema,

    // Hierarchy actions
    hierarchyActions,

    // Toast notifications
    showToastSuccess,
    showToastError
  } = deps;

  const handleProductSubmit: FormSubmissionHandlers['handleProductSubmit'] = async (data) => {
    try {
      const newProductId = await addProduct(data.name, data.description);

      // Send real-time creation message
      sendMessage({
        type: 'product_created',
        entityId: newProductId,
        entityType: 'product',
        data: data,
        timestamp: new Date().toISOString(),
        userId: 'current-user'
      });

      // Expand the new product in the tree
      hierarchyActions.setExpandedItems(prev => new Set([...prev, newProductId]));
      setViewMode('tree');

      // Show success toast
      showToastSuccess('Product Created', `"${data.name}" has been created successfully`);
    } catch (err) {
      console.error('Failed to create product:', err);
      showToastError('Creation Failed', `Failed to create product "${data.name}"`);
      // Don't rethrow - handle error gracefully
    }
  };

  const handleDomainSubmit: FormSubmissionHandlers['handleDomainSubmit'] = async (data) => {
    try {
      const newDomainId = await addDomain(currentProductId, data.name, data.description);

      // Send real-time creation message
      sendMessage({
        type: 'domain_created',
        entityId: newDomainId,
        entityType: 'domain',
        data: data,
        timestamp: new Date().toISOString(),
        userId: 'current-user'
      });

      // Expand product and new domain in the tree
      hierarchyActions.setExpandedItems(prev =>
        new Set([...prev, currentProductId, newDomainId])
      );
      setViewMode('tree');

      // Show success toast
      showToastSuccess('Domain Created', `"${data.name}" has been created successfully`);
    } catch (err) {
      console.error('Failed to create domain:', err);
      showToastError('Creation Failed', `Failed to create domain "${data.name}"`);
      // Don't rethrow - handle error gracefully
    }
  };

  const handleContextSubmit: FormSubmissionHandlers['handleContextSubmit'] = async (data) => {
    try {
      const newContextId = await addContext(currentDomainId, data.name, data.namespace, data.description);

      // Send real-time creation message
      sendMessage({
        type: 'context_created',
        entityId: newContextId,
        entityType: 'context',
        data: data,
        timestamp: new Date().toISOString(),
        userId: 'current-user'
      });

      // Find and expand the parent product as well
      let parentProductId = '';
      for (const product of sortedRegistry.products) {
        if (product.domains.some(d => d.id === currentDomainId)) {
          parentProductId = product.id;
          break;
        }
      }

      hierarchyActions.setExpandedItems(prev =>
        new Set([...prev, parentProductId, currentDomainId, newContextId])
      );
      setViewMode('tree');

      // Show success toast
      showToastSuccess('Context Created', `"${data.name}" has been created successfully`);
    } catch (err) {
      console.error('Failed to create context:', err);
      showToastError('Creation Failed', `Failed to create context "${data.name}"`);
      // Don't rethrow - handle error gracefully
    }
  };

  const handleSchemaSubmit: FormSubmissionHandlers['handleSchemaSubmit'] = async (schema) => {
    try {
      const newSchemaId = await addSchema(currentContextId, schema);

      // Send real-time creation message
      sendMessage({
        type: 'schema_created',
        entityId: newSchemaId,
        entityType: 'schema',
        data: schema,
        timestamp: new Date().toISOString(),
        userId: 'current-user'
      });

      // Find parent IDs to expand
      let parentProductId = '';
      let parentDomainId = '';
      for (const product of sortedRegistry.products) {
        for (const domain of product.domains) {
          if (domain.contexts.some(c => c.id === currentContextId)) {
            parentProductId = product.id;
            parentDomainId = domain.id;
            break;
          }
        }
        if (parentProductId) break;
      }

      const categoryId = `${currentContextId}-${schema.schemaTypeCategory}`;
      hierarchyActions.setExpandedItems(prev =>
        new Set([...prev, parentProductId, parentDomainId, currentContextId, categoryId, newSchemaId])
      );
      setPreselectedCategory(undefined);
      setViewMode('tree');

      // Show success toast
      showToastSuccess('Schema Created', `"${schema.name}" has been created successfully`);
    } catch (err) {
      console.error('Failed to create schema:', err);
      showToastError('Creation Failed', `Failed to create schema "${schema.name}"`);
      // Don't rethrow - handle error gracefully
    }
  };

  const handleVersionSubmit: FormSubmissionHandlers['handleVersionSubmit'] = async (version) => {
    if (!selectedSchema) {
      console.error('No schema selected for version creation');
      return;
    }

    try {
      await addSchemaVersion(selectedSchema.id, version);

      // Send real-time creation message
      sendMessage({
        type: 'schema_version_created',
        entityId: selectedSchema.id,
        entityType: 'schema_version',
        data: version,
        timestamp: new Date().toISOString(),
        userId: 'current-user'
      });

      // Re-fetch the schema to get the new version
      const updatedSchema = registry.products.flatMap(product =>
        product.domains.flatMap(domain =>
          domain.contexts.flatMap(context => context.schemas)
        )
      ).find(s => s.id === selectedSchema.id);

      if (updatedSchema) {
        // Find the newly created version (should be the one with matching semanticVersion)
        const newVersion = updatedSchema.versions.find(v =>
          v.semanticVersion === version.semanticVersion
        );
        if (newVersion) {
          setSelectedVersion(newVersion);
        }
        setSelectedSchema(updatedSchema);
      }

      // Expand to show the schema with new version
      let parentProductId = '';
      let parentDomainId = '';
      let parentContextId = '';
      for (const product of sortedRegistry.products) {
        for (const domain of product.domains) {
          for (const context of domain.contexts) {
            if (context.schemas.some(s => s.id === selectedSchema.id)) {
              parentProductId = product.id;
              parentDomainId = domain.id;
              parentContextId = context.id;
              break;
            }
          }
          if (parentContextId) break;
        }
        if (parentProductId) break;
      }

      const categoryId = `${parentContextId}-${selectedSchema.schemaTypeCategory}`;
      hierarchyActions.setExpandedItems(prev =>
        new Set([...prev, parentProductId, parentDomainId, parentContextId, categoryId, selectedSchema.id])
      );
      setViewMode('tree');

      // Show success toast
      showToastSuccess('Version Created', `Version ${version.semanticVersion} has been created successfully`);
    } catch (err) {
      console.error('Failed to create schema version:', err);
      showToastError('Creation Failed', `Failed to create version ${version.semanticVersion}`);
      // Don't rethrow - handle error gracefully
    }
  };

  return {
    handleProductSubmit,
    handleDomainSubmit,
    handleContextSubmit,
    handleSchemaSubmit,
    handleVersionSubmit
  };
};