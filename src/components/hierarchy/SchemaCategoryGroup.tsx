import React from 'react';
import { Schema, SchemaTypeCategory, SCHEMA_TYPE_CATEGORIES } from '../../types/schema';
import { 
  CircleAlert,
  Binary,
  FileText,
  Mail,
  Zap,
  CircleHelp
} from 'lucide-react';
import { HierarchyItemBase } from './HierarchyItemBase';
import { 
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createCategoryMenuItems
} from '../eventHandlers/HierarchyTreeHandlers';

interface SchemaCategoryGroupProps {
  category: SchemaTypeCategory;
  schemas: Schema[];
  contextId: string;
  level: number;
  isExpanded: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
  children?: React.ReactNode;
}

const getCategoryIcon = (category: SchemaTypeCategory): React.ReactNode => {
  switch (category) {
    case SchemaTypeCategory.Commands:
      return <CircleAlert size={16} />;
    case SchemaTypeCategory.Data:
      return <Binary size={16} />;
    case SchemaTypeCategory.Documents:
      return <FileText size={16} />;
    case SchemaTypeCategory.Envelopes:
      return <Mail size={16} />;
    case SchemaTypeCategory.Events:
      return <Zap size={16} />;
    case SchemaTypeCategory.Queries:
      return <CircleHelp size={16} />;
    default:
      return null;
  }
};

const getCategoryPluralName = (category: SchemaTypeCategory): string => {
  const categoryConfig = SCHEMA_TYPE_CATEGORIES[category];
  return categoryConfig?.categoryName || category;
};

export const SchemaCategoryGroup: React.FC<SchemaCategoryGroupProps> = ({
  category,
  schemas,
  contextId,
  level,
  isExpanded,
  handlers,
  stateHandlers,
  children
}) => {
  const categorySchemas = schemas.filter(s => s.schemaTypeCategory === category);
  if (categorySchemas.length === 0) return null;
  
  const categoryId = `${contextId}-${category}`;
  const menuItems = createCategoryMenuItems(contextId, category, handlers);
  const hasChildren = categorySchemas.length > 0;
  
  // Category groups don't have a separate click handler for selection
  // They only toggle expansion - clicking them doesn't select anything
  const handleClick = (e: React.MouseEvent) => {
    // For categories, single-click still toggles (no selection behavior)
    if (e.shiftKey) {
      stateHandlers.toggleAllDescendants(categoryId, 'category', isExpanded);
    } else {
      stateHandlers.toggleExpanded(categoryId);
    }
  };
  
  // Toggle expand/collapse (for arrow click or double-click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      stateHandlers.toggleAllDescendants(categoryId, 'category', isExpanded);
    } else {
      stateHandlers.toggleExpanded(categoryId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    stateHandlers.setContextMenu?.({
      type: 'category',
      id: categoryId,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <HierarchyItemBase
      level={level}
      isExpanded={isExpanded}
      isSelected={false}
      onClick={handleClick}
      onToggleExpand={handleToggleExpand}
      onContextMenu={handleContextMenu}
      icon={getCategoryIcon(category)}
      label={getCategoryPluralName(category)}
      menuItems={menuItems}
      hasChildren={hasChildren}
    >
      {children}
    </HierarchyItemBase>
  );
};