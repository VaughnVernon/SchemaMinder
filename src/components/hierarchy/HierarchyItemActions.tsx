import React from 'react';
import { Pin, PinOff } from 'lucide-react';
import { DropdownMenu, MenuItem } from '../DropdownMenu';

export interface HierarchyItemActionsProps {
  menuItems?: MenuItem[];
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  showPin?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const HierarchyItemActions: React.FC<HierarchyItemActionsProps> = ({
  menuItems,
  isPinned = false,
  onPin,
  onUnpin,
  showPin = false,
  className = '',
  style
}) => {
  const hasPinActions = showPin && (onPin || onUnpin);
  const hasMenuItems = menuItems && menuItems.length > 0;

  if (!hasPinActions && !hasMenuItems) {
    return null;
  }

  return (
    <div className={`hierarchy-item-actions ${className}`} style={style}>
      {hasMenuItems && (
        <DropdownMenu items={menuItems} />
      )}
      {hasPinActions && (
        <button
          className="dropdown-trigger"
          onClick={(e) => {
            // Allow Shift+Click to propagate for expand/collapse all functionality
            if (!e.shiftKey) {
              e.stopPropagation();
            }
            (isPinned ? onUnpin : onPin)?.();
          }}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      )}
    </div>
  );
};