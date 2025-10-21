import React from 'react';
import { Context } from '../../types/schema';
import { Circle } from 'lucide-react';
import { HierarchyItemBase } from './HierarchyItemBase';
import {
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createContextMenuItems,
  createContextClickHandler,
  createContextMenuHandler,
  SubscriptionStateChecker
} from '../eventHandlers/HierarchyTreeHandlers';

interface ContextHierarchyItemProps {
  context: Context;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  subscriptionState?: SubscriptionStateChecker;
  children?: React.ReactNode;
}

export const ContextHierarchyItem: React.FC<ContextHierarchyItemProps> = ({
  context,
  level,
  isExpanded,
  isSelected,
  handlers,
  stateHandlers,
  subscriptionState,
  children
}) => {
  const menuItems = createContextMenuItems(context, handlers, subscriptionState);
  const handleContextMenu = createContextMenuHandler(stateHandlers.setContextMenu);
  const hasChildren = context.schemas && context.schemas.length > 0;
  
  // Single-click: only select the item and open form
  const handleClick = (e: React.MouseEvent) => {
    handlers.onItemSelect?.('context', context.id, context);
    // Shift+Click still works for expand all descendants
    if (e.shiftKey && hasChildren) {
      stateHandlers.toggleAllDescendants(context.id, 'context', isExpanded);
    }
  };
  
  // Toggle expand/collapse (for arrow click or double-click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      stateHandlers.toggleAllDescendants(context.id, 'context', isExpanded);
    } else {
      stateHandlers.toggleExpanded(context.id);
    }
  };

  return (
    <HierarchyItemBase
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onClick={handleClick}
      onToggleExpand={handleToggleExpand}
      onContextMenu={(e) => handleContextMenu(e, 'context', context.id)}
      icon={<Circle size={16} />}
      label={context.name}
      menuItems={menuItems}
      hasChildren={hasChildren}
    >
      {children}
    </HierarchyItemBase>
  );
};