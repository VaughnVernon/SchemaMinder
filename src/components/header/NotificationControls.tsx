/**
 * Component for notification list controls (select all, dismiss)
 */

import React from 'react';

interface NotificationControlsProps {
  totalCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onDismiss: () => void;
}

export const NotificationControls: React.FC<NotificationControlsProps> = ({
  totalCount,
  selectedCount,
  isAllSelected,
  onSelectAll,
  onDismiss
}) => {
  return (
    <div className="notification-controls">
      <label className="select-all-checkbox">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={onSelectAll}
        />
        Select All ({totalCount})
      </label>
      <button
        className="dismiss-button"
        onClick={onDismiss}
        disabled={selectedCount === 0}
      >
        Dismiss Selected ({selectedCount})
      </button>
    </div>
  );
};
