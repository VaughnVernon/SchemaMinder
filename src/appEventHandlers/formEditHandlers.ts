import {
  FormEditHandlers,
  CreateFormEditHandlers
} from './types';

/**
 * Creates form edit handler functions
 * These handlers manage updates to existing entities in the registry
 */
export const createFormEditHandlers: CreateFormEditHandlers = (deps) => {
  const {
    // Registry operations
    updateProduct,
    updateDomain,
    updateContext,
    updateSchema,
    updateSchemaVersion,
    registry,

    // Real-time messaging
    sendMessage,

    // State setters
    setViewMode,

    // Editing state
    editingProduct,
    editingDomain,
    editingContext,
    editingSchema,
    editingVersion,
    selectedSchema,

    // Hierarchy state
    hierarchyState,

    // Toast notifications
    showToastSuccess,
    showToastError
  } = deps;


  const handleProductEditSubmit: FormEditHandlers['handleProductEditSubmit'] = async (updates) => {
    // Now all edit flows use editingProduct state for consistency
    if (editingProduct) {
      try {
        await updateProduct(editingProduct.id, updates);

        // Send real-time update message
        sendMessage({
          type: 'product_updated',
          entityId: editingProduct.id,
          entityType: 'product',
          data: updates,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });

        // Show success toast
        showToastSuccess('Product Updated', `"${updates.name || editingProduct.name}" has been updated successfully`);
      } catch (err) {
        console.error('Failed to update product:', err);
        showToastError('Update Failed', `Failed to update product "${editingProduct.name}"`);
        // Don't rethrow - handle error gracefully
      }
    } else {
      throw new Error('No product selected for editing');
    }
  };

  const handleDomainEditSubmit: FormEditHandlers['handleDomainEditSubmit'] = async (updates) => {
    // Now all edit flows use editingDomain state for consistency
    if (editingDomain) {
      try {
        await updateDomain(editingDomain.id, updates);

        // Send real-time update message
        sendMessage({
          type: 'domain_updated',
          entityId: editingDomain.id,
          entityType: 'domain',
          data: updates,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });

        // Show success toast
        showToastSuccess('Domain Updated', `"${updates.name || editingDomain.name}" has been updated successfully`);
      } catch (err) {
        console.error('Failed to update domain:', err);
        showToastError('Update Failed', `Failed to update domain "${editingDomain.name}"`);
        // Don't rethrow - handle error gracefully
      }
    } else {
      throw new Error('No domain selected for editing');
    }
  };

  const handleContextEditSubmit: FormEditHandlers['handleContextEditSubmit'] = async (updates) => {
    // Now all edit flows use editingContext state for consistency
    if (editingContext) {
      try {
        await updateContext(editingContext.id, updates);

        // Send real-time update message
        sendMessage({
          type: 'context_updated',
          entityId: editingContext.id,
          entityType: 'context',
          data: updates,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });

        // Show success toast
        showToastSuccess('Context Updated', `"${updates.name || editingContext.name}" has been updated successfully`);
      } catch (err) {
        console.error('Failed to update context:', err);
        showToastError('Update Failed', `Failed to update context "${editingContext.name}"`);
        // Don't rethrow - handle error gracefully
      }
    } else {
      throw new Error('No context selected for editing');
    }
  };

  const handleSchemaEditSubmit: FormEditHandlers['handleSchemaEditSubmit'] = async (schemaData) => {
    // Now all edit flows use editingSchema state for consistency
    if (editingSchema) {
      try {
        // Prepare the update payload
        const updates: any = {
          name: schemaData.name,
          description: schemaData.description,
          schemaTypeCategory: schemaData.schemaTypeCategory,
          scope: schemaData.scope
        };

        // Check if versions were updated (Rule 2: schema name change)
        if (schemaData.versions && schemaData.versions.length > 0) {
          updates.versions = schemaData.versions.map(version => ({
            versionId: version.id,
            specification: version.specification,
            semanticVersion: version.semanticVersion,
            description: version.description,
            status: version.status
          }));
        }

        await updateSchema(editingSchema.id, updates);

        // Send real-time update message
        sendMessage({
          type: 'schema_updated',
          entityId: editingSchema.id,
          entityType: 'schema',
          data: schemaData,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });

        // Show success toast
        showToastSuccess('Schema Updated', `"${schemaData.name || editingSchema.name}" has been updated successfully`);
      } catch (err) {
        console.error('Failed to update schema:', err);
        showToastError('Update Failed', `Failed to update schema "${editingSchema.name}"`);
        // Don't rethrow - handle error gracefully
      }
    } else {
      throw new Error('No schema selected for editing');
    }
  };

  const handleSchemaVersionEditSubmit: FormEditHandlers['handleSchemaVersionEditSubmit'] = async (updates) => {
    if (editingVersion && selectedSchema) {
      try {
        await updateSchemaVersion(selectedSchema.id, editingVersion.id, updates);

        // Send real-time update message
        sendMessage({
          type: 'schema_version_updated',
          entityId: editingVersion.id,
          entityType: 'schema_version',
          data: updates,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });

        // Show success toast
        showToastSuccess('Version Updated', `Version ${editingVersion.semanticVersion} has been updated successfully`);
      } catch (err) {
        console.error('Failed to update schema version:', err);
        showToastError('Update Failed', `Failed to update version ${editingVersion.semanticVersion}`);
        // Don't rethrow - handle error gracefully
      }
    } else {
      throw new Error('No schema version selected for editing');
    }
  };

  return {
    handleProductEditSubmit,
    handleDomainEditSubmit,
    handleContextEditSubmit,
    handleSchemaEditSubmit,
    handleSchemaVersionEditSubmit
  };
};