import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { MenuItem } from '../DropdownMenu';
import { HierarchyItemActions } from './HierarchyItemActions';

export interface HierarchyItemBaseProps {
  level: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onToggleExpand?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  label: string;
  menuItems?: MenuItem[];
  children?: React.ReactNode;
  className?: string;
  hasChildren?: boolean;
  // Pin-related props
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  showPin?: boolean;
}

export const HierarchyItemBase: React.FC<HierarchyItemBaseProps> = ({
  level,
  isExpanded = false,
  isSelected = false,
  onClick,
  onToggleExpand,
  onContextMenu,
  icon,
  label,
  menuItems,
  children,
  className = '',
  hasChildren = false,
  isPinned = false,
  onPin,
  onUnpin,
  showPin = false
}) => {
  const expandableClass = hasChildren ? 'expandable' : '';
  const expandedClass = isExpanded ? 'expanded' : '';
  const selectedClass = isSelected ? 'selected' : '';
  
  // Handle double-click to toggle expand/collapse
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggleExpand) {
      onToggleExpand(e);
    }
  };
  
  // Handle arrow click to toggle expand/collapse
  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(e);
    }
  };
  
  return (
    <div>
      <div 
        className={`hierarchy-item ${expandableClass} ${expandedClass} ${selectedClass} ${className}`}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className="hierarchy-item-content">
          <div 
            className="hierarchy-item-text" 
            style={{ 
              marginLeft: `${level * 20}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {hasChildren && (
              <button
                className="hierarchy-expand-arrow"
                onClick={handleArrowClick}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px'
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {!hasChildren && <div style={{ width: '20px' }} />}
            {icon}
            {label}
          </div>
          <HierarchyItemActions
            menuItems={menuItems}
            isPinned={isPinned}
            onPin={onPin}
            onUnpin={onUnpin}
            showPin={showPin}
          />
        </div>
      </div>
      {isExpanded && children && (
        <div>{children}</div>
      )}
    </div>
  );
};