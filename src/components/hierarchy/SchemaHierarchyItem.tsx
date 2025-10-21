import React from 'react';
import { Schema } from '../../types/schema';
import { HierarchyItemBase } from './HierarchyItemBase';
import { 
  HierarchyTreeHandlers, 
  HierarchyTreeStateHandlers,
  createSchemaMenuItems,
  createSchemaClickHandler,
  createContextMenuHandler
} from '../eventHandlers/HierarchyTreeHandlers';

interface SchemaHierarchyItemProps {
  schema: Schema;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  children?: React.ReactNode;
}

export const SchemaHierarchyItem: React.FC<SchemaHierarchyItemProps> = ({
  schema,
  level,
  isExpanded,
  isSelected,
  handlers,
  stateHandlers,
  children
}) => {
  const menuItems = createSchemaMenuItems(schema, handlers);
  const handleContextMenu = createContextMenuHandler(stateHandlers.setContextMenu);
  const hasChildren = schema.versions && schema.versions.length > 0;
  
  // Single-click: only select the item and open form
  const handleClick = (e: React.MouseEvent) => {
    handlers.onItemSelect?.('schema', schema.id, schema);
  };
  
  // Toggle expand/collapse (for arrow click or double-click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    stateHandlers.toggleExpanded(schema.id);
  };

  return (
    <HierarchyItemBase
      level={level}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onClick={handleClick}
      onToggleExpand={handleToggleExpand}
      onContextMenu={(e) => handleContextMenu(e, 'schema', schema.id)}
      label={schema.name}
      menuItems={menuItems}
      hasChildren={hasChildren}
    >
      {children}
    </HierarchyItemBase>
  );
};