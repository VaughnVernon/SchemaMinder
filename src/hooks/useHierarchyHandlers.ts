import { useMemo } from 'react';
import { Schema, SchemaVersion, Product, Domain, Context } from '../types/schema';
import { HierarchyTreeHandlers } from '../components/eventHandlers/HierarchyTreeHandlers';

type ViewMode = 'tree' | 'create-product' | 'create-domain' | 'create-context' | 'create-schema' | 'create-version' | 'edit-product' | 'edit-domain' | 'edit-context' | 'edit-schema' | 'edit-version';

interface UseHierarchyHandlersProps {
  handlers: {
    handleEditProduct: any;
    handleEditDomain: any;
    handleEditContext: any;
    handleEditSchema: any;
    handleCreateDomain: any;
    handleCreateContext: any;
    handleCreateSchema: any;
    handleCreateSchemaVersion: any;
    handleSubscribeProduct: any;
    handleSubscribeDomain: any;
    handleSubscribeContext: any;
    handleUnsubscribeProduct: any;
    handleUnsubscribeDomain: any;
    handleUnsubscribeContext: any;
    handleGenerateCode?: (context: Context) => void;
  };
  hierarchyActions: {
    setSelectedItem: (item: { type: string; id: string } | null) => void;
    setPinnedItem: (item: any) => void;
  };
  setViewMode: (mode: ViewMode) => void;
  setSelectedSchema: (schema: Schema) => void;
  setEditingVersion: (version: SchemaVersion) => void;
}

/**
 * Custom hook to create hierarchy handlers object for the HierarchyTree component.
 * This consolidates all the handler creation logic to reduce complexity in App.tsx.
 */
export const useHierarchyHandlers = ({
  handlers,
  hierarchyActions,
  setViewMode,
  setSelectedSchema,
  setEditingVersion
}: UseHierarchyHandlersProps): HierarchyTreeHandlers => {
  // Handler function for schema selection (edit version)
  const handleSchemaSelect = useMemo(() => (schema: Schema, version: SchemaVersion) => {
    setSelectedSchema(schema);
    setEditingVersion(version);
    hierarchyActions.setSelectedItem({ type: 'version', id: version.id });
    setViewMode('edit-version');
  }, [setSelectedSchema, setEditingVersion, hierarchyActions, setViewMode]);

  // Create handlers object for HierarchyTree using extracted handlers
  return useMemo(() => ({
    onItemSelect: (type: 'product' | 'domain' | 'context' | 'schema', id: string, item?: any) => {
      console.log('onItemSelect called:', { type, id });

      // For all types, use the direct edit handler instead of tree mode selectedItem
      // This ensures consistent behavior with single Esc press for all forms
      switch (type) {
        case 'product':
          if (item) handlers.handleEditProduct(item);
          break;
        case 'domain':
          if (item) handlers.handleEditDomain(item);
          break;
        case 'context':
          if (item) handlers.handleEditContext(item);
          break;
        case 'schema':
          if (item) handlers.handleEditSchema(item);
          break;
      }

      console.log('Direct edit handler called for:', type);
    },
    onEditProduct: handlers.handleEditProduct,
    onEditDomain: handlers.handleEditDomain,
    onEditContext: handlers.handleEditContext,
    onEditSchema: handlers.handleEditSchema,
    onEditSchemaVersion: (schema: Schema, version: SchemaVersion) => {
      setSelectedSchema(schema);
      setEditingVersion(version);
      hierarchyActions.setSelectedItem({ type: 'version', id: version.id });
      setViewMode('edit-version');
    },
    onCreateProduct: () => setViewMode('create-product'),
    onCreateDomain: handlers.handleCreateDomain,
    onCreateContext: handlers.handleCreateContext,
    onCreateSchema: handlers.handleCreateSchema,
    onCreateSchemaVersion: handlers.handleCreateSchemaVersion,
    onPinProduct: (product) => hierarchyActions.setPinnedItem({ type: 'product', item: product }),
    onPinDomain: (domain) => hierarchyActions.setPinnedItem({ type: 'domain', item: domain }),
    onPinContext: (context) => hierarchyActions.setPinnedItem({ type: 'context', item: context }),
    onUnpin: () => hierarchyActions.setPinnedItem(null),
    onSchemaSelect: handleSchemaSelect,
    onSubscribeProduct: handlers.handleSubscribeProduct,
    onSubscribeDomain: handlers.handleSubscribeDomain,
    onSubscribeContext: handlers.handleSubscribeContext,
    onUnsubscribeProduct: handlers.handleUnsubscribeProduct,
    onUnsubscribeDomain: handlers.handleUnsubscribeDomain,
    onUnsubscribeContext: handlers.handleUnsubscribeContext,
    onGenerateCode: handlers.handleGenerateCode
  }), [handlers, hierarchyActions, handleSchemaSelect, setSelectedSchema, setEditingVersion, setViewMode]);
};