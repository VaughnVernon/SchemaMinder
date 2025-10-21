/**
 * Component for displaying a single change notification item in the list
 */

import React from 'react';
import { ChangeNotificationService } from '../../services/changeNotificationService';
import { formatDate } from '../../services/dateTimeService';

interface ChangeListItemProps {
  change: any;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (changeId: string) => void;
  onClick: (change: any) => void;
  service: ChangeNotificationService;
}

export const ChangeListItem: React.FC<ChangeListItemProps> = ({
  change,
  isSelected,
  isChecked,
  onSelect,
  onClick,
  service
}) => {
  const entityInfo = service.getEntityInfo(change);

  return (
    <div
      className={`notification-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(change)}
    >
      <label className="notification-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onSelect(change.id)}
        />
      </label>
      <div className="notification-details">
        <div className="notification-title">
          {service.formatChangeType(change.entityType, change.changeType)}
          {change.isBreakingChange && (
            <span className="breaking-change-badge">Breaking Change</span>
          )}
        </div>
        <div className="notification-entity-info" style={{ fontSize: '0.85em' }}>
          <div className="entity-type-name">
            <strong>Type:</strong> {entityInfo.type}
          </div>
          <div className="entity-type-name">
            <strong>Name:</strong> {entityInfo.name}
            {change.entityType === 'schema_version' && (
              <span>
                <br />
                <strong>Version:</strong> {change.changeData?.after?.semanticVersion || change.changeData?.before?.semanticVersion || change.changeData?.semanticVersion}
              </span>
            )}
          </div>
        </div>
        <div className="notification-meta" style={{ fontSize: '0.8em' }}>
          <span className="notification-date">{formatDate(change.createdAt)}</span>
          {change.changedByUserName && (
            <span className="notification-user">by {change.changedByUserName}</span>
          )}
        </div>
      </div>
    </div>
  );
};
