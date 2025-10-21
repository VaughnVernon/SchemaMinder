import React from 'react';
import { SchemaForm } from './SchemaForm';
import { SchemaVersionForm } from './SchemaVersionForm';
import { ProductForm } from './ProductForm';
import { DomainForm } from './DomainForm';
import { ContextForm } from './ContextForm';
import { Schema, SchemaVersion, Product, Domain, Context, SchemaRegistry } from '../types/schema';
import { DialogMode } from '../types/dialogMode';
import { getCurrentVersionString, getSuggestedNextVersion, getPreviousSpecification } from '../services/schemaTypeSpecification';
import { SchemaTypeCategory } from '../types/schema';
import { SelectedItem } from '../hooks/useHierarchyTree';

type ViewMode = 'tree' | 'create-product' | 'create-domain' | 'create-context' | 'create-schema' | 'create-version' | 'edit-product' | 'edit-domain' | 'edit-context' | 'edit-schema' | 'edit-version';

interface ContentPanelProps {
  viewMode: ViewMode;
  selectedItem: SelectedItem | undefined;
  registry: SchemaRegistry;
  
  // Selected/Editing states
  selectedSchema: Schema | null;
  selectedVersion: SchemaVersion | null;
  editingProduct: Product | null;
  editingDomain: Domain | null;
  editingContext: Context | null;
  editingSchema: Schema | null;
  editingVersion: SchemaVersion | null;
  
  // Current IDs and names
  currentProductId: string;
  currentDomainId: string;
  currentContextId: string;
  currentProductName: string;
  currentDomainName: string;
  preselectedCategory: SchemaTypeCategory | undefined;
  
  // Handlers
  handlers: {
    handleProductSubmit: any;
    handleDomainSubmit: any;
    handleContextSubmit: any;
    handleSchemaSubmit: any;
    handleVersionSubmit: any;
    handleProductEditSubmit: any;
    handleDomainEditSubmit: any;
    handleContextEditSubmit: any;
    handleSchemaEditSubmit: any;
    handleSchemaVersionEditSubmit: any;
  };
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setPreselectedCategory: (category: SchemaTypeCategory | undefined) => void;
  setSelectedItem: (item: SelectedItem) => void;
}

/**
 * ContentPanel component that handles all form rendering logic.
 * This component consolidates the complex conditional rendering from App.tsx
 * to reduce McCabe complexity while maintaining all functionality.
 */
export const ContentPanel: React.FC<ContentPanelProps> = ({
  viewMode,
  selectedItem,
  registry,
  selectedSchema,
  selectedVersion,
  editingProduct,
  editingDomain,
  editingContext,
  editingSchema,
  editingVersion,
  currentProductId,
  currentDomainId,
  currentContextId,
  currentProductName,
  currentDomainName,
  preselectedCategory,
  handlers,
  setViewMode,
  setPreselectedCategory,
  setSelectedItem
}) => {
  // Create/Edit form rendering
  if (viewMode === 'create-product') {
    return (
      <ProductForm
        mode={DialogMode.New}
        onSubmit={handlers.handleProductSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'create-domain') {
    return (
      <DomainForm
        mode={DialogMode.New}
        productId={currentProductId}
        productName={currentProductName}
        onSubmit={handlers.handleDomainSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'create-context') {
    return (
      <ContextForm
        mode={DialogMode.New}
        domainId={currentDomainId}
        domainName={currentDomainName}
        onSubmit={handlers.handleContextSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'create-schema') {
    return (
      <SchemaForm
        mode={DialogMode.New}
        contextId={currentContextId}
        preselectedCategory={preselectedCategory}
        onSubmit={handlers.handleSchemaSubmit}
        onCancel={() => {
          setPreselectedCategory(undefined);
          setViewMode('tree');
        }}
      />
    );
  }

  if (viewMode === 'create-version' && selectedSchema) {
    return (
      <SchemaVersionForm
        mode={DialogMode.New}
        schemaId={selectedSchema.id}
        currentVersion={getCurrentVersionString(selectedSchema, selectedVersion)}
        suggestedVersion={getSuggestedNextVersion(selectedSchema, selectedVersion)}
        previousSpecification={getPreviousSpecification(selectedSchema, selectedVersion)}
        schemaName={selectedSchema.name}
        schemaCategory={selectedSchema.schemaTypeCategory}
        onSubmit={handlers.handleVersionSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'edit-product' && editingProduct) {
    return (
      <ProductForm
        mode={DialogMode.Edit}
        product={editingProduct}
        onSubmit={handlers.handleProductEditSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'edit-domain' && editingDomain) {
    return (
      <DomainForm
        mode={DialogMode.Edit}
        domain={editingDomain}
        onSubmit={handlers.handleDomainEditSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'edit-context' && editingContext) {
    return (
      <ContextForm
        mode={DialogMode.Edit}
        context={editingContext}
        onSubmit={handlers.handleContextEditSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'edit-schema' && editingSchema) {
    return (
      <SchemaForm
        mode={DialogMode.Edit}
        schema={editingSchema}
        onSubmit={handlers.handleSchemaEditSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  if (viewMode === 'edit-version' && editingVersion && selectedSchema) {
    return (
      <SchemaVersionForm
        mode={DialogMode.Edit}
        schemaVersion={editingVersion}
        schemaName={selectedSchema.name}
        schemaCategory={selectedSchema.schemaTypeCategory}
        onSubmit={handlers.handleSchemaVersionEditSubmit}
        onCancel={() => setViewMode('tree')}
      />
    );
  }

  // Tree mode rendering
  if (viewMode === 'tree') {
    if (!selectedItem) {
      return (
        <div className="welcome-message">
          <p>Select an item on the left to view details here.</p>
        </div>
      );
    }

    // Note: Product, Domain, Context, and Schema now use direct edit mode handlers
    // instead of tree mode selectedItem handlers for consistent single Esc behavior
  }

  // Default fallback
  return null;
};