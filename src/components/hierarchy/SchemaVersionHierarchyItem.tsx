import React from 'react';
import { Schema, SchemaVersion } from '../../types/schema';
import {
  HierarchyTreeHandlers,
  HierarchyTreeStateHandlers,
  createSchemaVersionMenuItems,
  createSchemaVersionClickHandler
} from '../eventHandlers/HierarchyTreeHandlers';
import { DropdownMenu } from '../DropdownMenu';

interface SchemaVersionHierarchyItemProps {
  version: SchemaVersion;
  schema: Schema;
  level: number;
  isSelected: boolean;
  handlers: HierarchyTreeHandlers;
  stateHandlers: HierarchyTreeStateHandlers;
}

export const SchemaVersionHierarchyItem: React.FC<SchemaVersionHierarchyItemProps> = ({
  version,
  schema,
  level,
  isSelected,
  handlers,
  stateHandlers
}) => {
  const menuItems = createSchemaVersionMenuItems(schema, version, handlers);
  const handleClick = createSchemaVersionClickHandler(schema, version, handlers);
  const selectedClass = isSelected ? 'selected' : '';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Use schema:version format for version ID to match strategy expectations
    stateHandlers.setContextMenu?.({
      type: 'version',
      id: `${schema.id}:${version.id}`,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div
      className={`hierarchy-item ${selectedClass}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="hierarchy-item-content">
        <div className="hierarchy-item-text" style={{ marginLeft: `${level * 20}px` }}>
          v{version.semanticVersion}
          <span className={`schema-status status-${version.status.toLowerCase()}`}>
            {version.status}
          </span>
        </div>
        <div className="hierarchy-item-actions">
          <DropdownMenu items={menuItems} />
        </div>
      </div>
    </div>
  );
};