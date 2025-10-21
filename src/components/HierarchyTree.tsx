import React from 'react';
import { Product, Domain, Context, Schema, SchemaVersion, SchemaTypeCategory } from '../types/schema';
import { DropdownMenu } from './DropdownMenu';
import { ContextMenu } from './ContextMenu';
import { StatusFilter } from './FilterModal';
import { SemanticVersion } from '../services/semanticVersion';
import { ContextMenuStrategyManager } from './hierarchy/tools/contextMenuStrategies';
import { 
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { 
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createContextMenuHandler
} from './eventHandlers/HierarchyTreeHandlers';
import { SelectedItem, PinnedItem } from '../hooks/useHierarchyTree';
import { SubscriptionStateChecker } from './eventHandlers/HierarchyTreeHandlers';

// Import hierarchy components
import { ProductHierarchyItem } from './hierarchy/ProductHierarchyItem';
import { DomainHierarchyItem } from './hierarchy/DomainHierarchyItem';
import { ContextHierarchyItem } from './hierarchy/ContextHierarchyItem';
import { SchemaHierarchyItem } from './hierarchy/SchemaHierarchyItem';
import { SchemaVersionHierarchyItem } from './hierarchy/SchemaVersionHierarchyItem';
import { SchemaCategoryGroup } from './hierarchy/SchemaCategoryGroup';
import { PinnedHierarchyView } from './hierarchy/PinnedHierarchyView';


interface HierarchyTreeState {
  products: Product[];
  expandedItems: Set<string>;
  selectedItem: SelectedItem;
  pinnedItem: PinnedItem;
  statusFilter: StatusFilter | undefined;
}

interface HierarchyTreeCallbacks {
  onFind?: () => void;
  onFilter?: (mousePosition: { x: number; y: number }) => void;
}

interface HierarchyTreeProps {
  state: HierarchyTreeState;
  callbacks: HierarchyTreeCallbacks;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  subscriptionState?: SubscriptionStateChecker;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  state,
  callbacks,
  handlers,
  stateHandlers,
  subscriptionState
}) => {
  const { products, expandedItems, selectedItem, pinnedItem, statusFilter } = state;
  const { onFind, onFilter } = callbacks;
  const { 
    onCreateProduct, 
    onCreateDomain, 
    onCreateContext, 
    onCreateSchema,
    onCreateSchemaVersion,
    onEditProduct,
    onEditDomain,
    onEditContext,
    onEditSchema,
    onEditSchemaVersion,
    onItemSelect,
    onSchemaSelect,
    onPinProduct,
    onPinDomain,
    onPinContext,
    onUnpin
  } = handlers;
  const [contextMenu, setContextMenu] = React.useState<{ type: string; id: string; x: number; y: number } | null>(null);
  
  // Create enhanced state handlers that include local context menu
  const enhancedStateHandlers: HierarchyTreeStateHandlers = {
    ...stateHandlers,
    setContextMenu
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextMenu = createContextMenuHandler(enhancedStateHandlers.setContextMenu);


  const getContextMenuItems = () => ContextMenuStrategyManager.createContextMenuItems(contextMenu, products, handlers, subscriptionState);

  const isSelected = (type: string, id: string): boolean => {
    return selectedItem?.type === type && selectedItem?.id === id;
  };


  const renderSchemaVersion = (version: SchemaVersion, schema: Schema, level: number) => {
    // Apply status filter - hide version if its status is filtered out
    if (statusFilter && !statusFilter[version.status]) {
      return null;
    }

    return (
      <SchemaVersionHierarchyItem
        key={version.id}
        version={version}
        schema={schema}
        level={level}
        isSelected={isSelected('version', version.id)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
      />
    );
  };

  const renderSchema = (schema: Schema, level: number) => {
    // Check if any versions are visible based on the filter
    const visibleVersions = statusFilter 
      ? schema.versions.filter(v => statusFilter[v.status])
      : schema.versions;
    
    // Hide schema if it has versions AND all its versions are filtered out
    if (statusFilter && schema.versions.length > 0 && visibleVersions.length === 0) {
      return null;
    }
    
    return (
      <SchemaHierarchyItem
        key={schema.id}
        schema={schema}
        level={level}
        isExpanded={expandedItems.has(schema.id)}
        isSelected={isSelected('schema', schema.id)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
      >
        {/* Sort versions using semantic version comparison */}
        {SemanticVersion.sort(schema.versions)
          .map(version => renderSchemaVersion(version, schema, level + 1))}
      </SchemaHierarchyItem>
    );
  };

  const renderSchemaTypeCategory = (category: SchemaTypeCategory, schemas: Schema[], contextId: string, level: number) => {
    const categorySchemas = schemas.filter(s => s.schemaTypeCategory === category);
    if (categorySchemas.length === 0) return null;
    
    const categoryId = `${contextId}-${category}`;
    
    return (
      <SchemaCategoryGroup
        key={categoryId}
        category={category}
        schemas={schemas}
        contextId={contextId}
        level={level}
        isExpanded={expandedItems.has(categoryId)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
      >
        {categorySchemas.map(schema => renderSchema(schema, level + 1))}
      </SchemaCategoryGroup>
    );
  };

  const renderContext = (context: Context, level: number) => {
    return (
      <ContextHierarchyItem
        key={context.id}
        context={context}
        level={level}
        isExpanded={expandedItems.has(context.id)}
        isSelected={isSelected('context', context.id)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
        subscriptionState={subscriptionState}
      >
        {Object.values(SchemaTypeCategory).map(category =>
          renderSchemaTypeCategory(category, context.schemas, context.id, level + 1)
        )}
      </ContextHierarchyItem>
    );
  };

  const renderDomain = (domain: Domain, level: number) => {
    return (
      <DomainHierarchyItem
        key={domain.id}
        domain={domain}
        level={level}
        isExpanded={expandedItems.has(domain.id)}
        isSelected={isSelected('domain', domain.id)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
        subscriptionState={subscriptionState}
      >
        {domain.contexts.map(context => renderContext(context, level + 1))}
      </DomainHierarchyItem>
    );
  };

  const renderProduct = (product: Product, level: number) => {
    return (
      <ProductHierarchyItem
        key={product.id}
        product={product}
        level={level}
        isExpanded={expandedItems.has(product.id)}
        isSelected={isSelected('product', product.id)}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
        subscriptionState={subscriptionState}
      >
        {product.domains.map(domain => renderDomain(domain, level + 1))}
      </ProductHierarchyItem>
    );
  };


  // Render pinned view or full hierarchy
  if (pinnedItem) {
    return (
      <PinnedHierarchyView
        pinnedItem={pinnedItem}
        products={products}
        expandedItems={expandedItems}
        handlers={handlers}
        stateHandlers={enhancedStateHandlers}
        renderDomain={renderDomain}
        renderContext={renderContext}
        renderSchemaTypeCategory={renderSchemaTypeCategory}
      />
    );
  }

  return (
    <div className="hierarchy">
      <div className="hierarchy-root">
        <div className="hierarchy-item-content">
          <div className="hierarchy-item-text">
            Products
          </div>
          <div className="hierarchy-item-actions" style={{ opacity: 1 }}>
            <DropdownMenu items={[
              {
                icon: <Filter size={16} />,
                label: 'Filter',
                tooltip: 'Filter Schema Versions by Status',
                onClick: (event) => {
                  if (event) {
                    onFilter?.({ x: event.clientX, y: event.clientY });
                  }
                }
              },
              {
                icon: <Search size={16} />,
                label: 'Find',
                tooltip: 'Find',
                onClick: () => onFind?.()
              },
              {
                icon: <Plus size={16} />,
                label: 'New Product',
                tooltip: 'New Product',
                onClick: () => onCreateProduct?.()
              }
            ]} />
          </div>
        </div>
      </div>
      {products.map(product => renderProduct(product, 0))}
      
      <ContextMenu
        isOpen={!!contextMenu}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        items={getContextMenuItems()}
        onClose={closeContextMenu}
      />
    </div>
  );
};