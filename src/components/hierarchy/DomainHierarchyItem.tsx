import React from 'react';
import { Domain } from '../../types/schema';
import { Waypoints } from 'lucide-react';
import { HierarchyItemBase } from './HierarchyItemBase';
import {
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createDomainMenuItems,
  createDomainClickHandler,
  createContextMenuHandler,
  SubscriptionStateChecker
} from '../eventHandlers/HierarchyTreeHandlers';

interface DomainHierarchyItemProps {
  domain: Domain;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  subscriptionState?: SubscriptionStateChecker;
  children?: React.ReactNode;
}

export const DomainHierarchyItem: React.FC<DomainHierarchyItemProps> = ({
  domain,
  level,
  isExpanded,
  isSelected,
  handlers,
  stateHandlers,
  subscriptionState,
  children
}) => {
  const menuItems = createDomainMenuItems(domain, handlers, subscriptionState);
  const handleContextMenu = createContextMenuHandler(stateHandlers.setContextMenu);
  const hasChildren = domain.contexts && domain.contexts.length > 0;
  
  // Single-click: only select the item and open form
  const handleClick = (e: React.MouseEvent) => {
    handlers.onItemSelect?.('domain', domain.id, domain);
    // Shift+Click still works for expand all descendants
    if (e.shiftKey && hasChildren) {
      stateHandlers.toggleAllDescendants(domain.id, 'domain', isExpanded);
    }
  };
  
  // Toggle expand/collapse (for arrow click or double-click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      stateHandlers.toggleAllDescendants(domain.id, 'domain', isExpanded);
    } else {
      stateHandlers.toggleExpanded(domain.id);
    }
  };

  return (
    <HierarchyItemBase
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onClick={handleClick}
      onToggleExpand={handleToggleExpand}
      onContextMenu={(e) => handleContextMenu(e, 'domain', domain.id)}
      icon={<Waypoints size={16} />}
      label={domain.name}
      menuItems={menuItems}
      hasChildren={hasChildren}
    >
      {children}
    </HierarchyItemBase>
  );
};