import React from 'react';
import { Product } from '../../types/schema';
import { Box } from 'lucide-react';
import { HierarchyItemBase } from './HierarchyItemBase';
import {
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createProductMenuItems,
  createProductClickHandler,
  SubscriptionStateChecker
} from '../eventHandlers/HierarchyTreeHandlers';

interface ProductHierarchyItemProps {
  product: Product;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  subscriptionState?: SubscriptionStateChecker;
  children?: React.ReactNode;
}

export const ProductHierarchyItem: React.FC<ProductHierarchyItemProps> = ({
  product,
  level,
  isExpanded,
  isSelected,
  handlers,
  stateHandlers,
  subscriptionState,
  children
}) => {
  const menuItems = createProductMenuItems(product, handlers, subscriptionState);
  const hasChildren = product.domains && product.domains.length > 0;
  
  // Single-click: only select the item and open form
  const handleClick = (e: React.MouseEvent) => {
    handlers.onItemSelect?.('product', product.id, product);
    // Shift+Click still works for expand all descendants
    if (e.shiftKey && hasChildren) {
      stateHandlers.toggleAllDescendants(product.id, 'product', isExpanded);
    }
  };
  
  // Toggle expand/collapse (for arrow click or double-click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      stateHandlers.toggleAllDescendants(product.id, 'product', isExpanded);
    } else {
      stateHandlers.toggleExpanded(product.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    stateHandlers.setContextMenu?.({
      type: 'product',
      id: product.id,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <HierarchyItemBase
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onClick={handleClick}
      onToggleExpand={handleToggleExpand}
      onContextMenu={handleContextMenu}
      icon={<Box size={16} />}
      label={product.name}
      menuItems={menuItems}
      hasChildren={hasChildren}
    >
      {children}
    </HierarchyItemBase>
  );
};