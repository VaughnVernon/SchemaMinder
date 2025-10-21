import React, { useEffect } from 'react';
import { Product, Domain, Context, SchemaTypeCategory } from '../../types/schema';
import { DomainHierarchyItem } from './DomainHierarchyItem';
import { ContextHierarchyItem } from './ContextHierarchyItem';
import { SchemaCategoryGroup } from './SchemaCategoryGroup';
import { HierarchyItemActions } from './HierarchyItemActions';
import { HierarchyTreeHandlers, HierarchyTreeStateHandlers } from '../eventHandlers/HierarchyTreeHandlers';

type PinnedItem = 
  | { type: 'product'; item: Product }
  | { type: 'domain'; item: Domain }
  | { type: 'context'; item: Context }
  | null;

interface PinnedHierarchyViewProps {
  pinnedItem: PinnedItem;
  products: Product[];
  expandedItems: Set<string>;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  renderDomain: (domain: Domain, level: number) => React.ReactNode;
  renderContext: (context: Context, level: number) => React.ReactNode;
  renderSchemaTypeCategory: (category: SchemaTypeCategory, schemas: any[], contextId: string, level: number) => React.ReactNode;
}

export const PinnedHierarchyView: React.FC<PinnedHierarchyViewProps> = ({
  pinnedItem,
  products,
  expandedItems,
  handlers,
  stateHandlers,
  renderDomain,
  renderContext,
  renderSchemaTypeCategory
}) => {
  if (!pinnedItem) return null;

  // Get current live data for pinned item
  const getCurrentPinnedItemData = () => {
    switch (pinnedItem.type) {
      case 'product': {
        const currentProduct = products.find(p => p.id === pinnedItem.item.id);
        return currentProduct ? { type: 'product' as const, item: currentProduct } : null;
      }
      case 'domain': {
        for (const product of products) {
          const currentDomain = product.domains.find(d => d.id === pinnedItem.item.id);
          if (currentDomain) {
            return { type: 'domain' as const, item: currentDomain };
          }
        }
        return null;
      }
      case 'context': {
        for (const product of products) {
          for (const domain of product.domains) {
            const currentContext = domain.contexts.find(c => c.id === pinnedItem.item.id);
            if (currentContext) {
              return { type: 'context' as const, item: currentContext };
            }
          }
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Get pinned item details for header
  const getPinnedItemPath = () => {
    switch (pinnedItem.type) {
      case 'product':
        return pinnedItem.item.name;
      case 'domain': {
        // Find the parent product for this domain
        for (const product of products) {
          if (product.domains.some(d => d.id === pinnedItem.item.id)) {
            return `${product.name}/${pinnedItem.item.name}`;
          }
        }
        return pinnedItem.item.name;
      }
      case 'context': {
        // Find the parent product and domain for this context
        for (const product of products) {
          for (const domain of product.domains) {
            if (domain.contexts.some(c => c.id === pinnedItem.item.id)) {
              return `${product.name}/${domain.name}/${pinnedItem.item.name}`;
            }
          }
        }
        return pinnedItem.item.name;
      }
      default:
        return null;
    }
  };

  const currentPinnedData = getCurrentPinnedItemData();
  
  // If the pinned item no longer exists, unpin it after render completes
  useEffect(() => {
    if (!currentPinnedData) {
      handlers.onUnpin?.();
    }
  }, [currentPinnedData, handlers.onUnpin]);
  
  // Return early if no pinned data, but let useEffect handle the unpin
  if (!currentPinnedData) {
    return null;
  }

  return (
    <div className="hierarchy">
      <div className="hierarchy-root">
        <div className="hierarchy-item-content">
          <div className="hierarchy-item-text">
            {getPinnedItemPath()}
          </div>
          <HierarchyItemActions
            isPinned={true}
            onUnpin={handlers.onUnpin}
            showPin={true}
            className="pinned-actions"
            style={{ opacity: 1 }}
          />
        </div>
      </div>
      {/* Render pinned content based on type using current live data */}
      {currentPinnedData.type === 'product' && (
        currentPinnedData.item.domains.map(domain => renderDomain(domain, 0))
      )}
      {currentPinnedData.type === 'domain' && (
        currentPinnedData.item.contexts.map(context => renderContext(context, 0))
      )}
      {currentPinnedData.type === 'context' && (
        Object.values(SchemaTypeCategory).map(category =>
          renderSchemaTypeCategory(category, currentPinnedData.item.schemas, currentPinnedData.item.id, 0)
        )
      )}
    </div>
  );
};