/**
 * Component for displaying detailed view of a selected change
 */

import React from 'react';
import { ChangeNotificationService } from '../../services/changeNotificationService';
import { formatDate } from '../../services/dateTimeService';
import { ChangeDataViewer } from './ChangeDataViewer';

interface ChangeDetailViewProps {
  change: any | null;
  service: ChangeNotificationService;
}

export const ChangeDetailView: React.FC<ChangeDetailViewProps> = ({
  change,
  service
}) => {
  if (!change) {
    return (
      <div className="detail-placeholder">
        <p>Select a change from the list to view details</p>
      </div>
    );
  }

  return (
    <div className="notification-detail-view">
      <div className="detail-header">
        <h4 style={{ fontSize: '0.9em', margin: '0 0 4px 0' }}>Change Details</h4>
        <div className="detail-breadcrumb" style={{ fontSize: '0.8em', color: '#666' }}>
          {service.getEntityPath(change)}
        </div>
      </div>

      <div className="detail-metadata" style={{ fontSize: '0.75em' }}>
        <div className="detail-row" style={{ marginBottom: '2px' }}>
          <strong>Type:</strong> {service.formatChangeType(change.entityType, change.changeType)}
        </div>
        <div className="detail-row" style={{ marginBottom: '2px' }}>
          <strong>Date:</strong> {formatDate(change.createdAt)}
        </div>
        {change.changedByUserName && (
          <div className="detail-row" style={{ marginBottom: '2px' }}>
            <strong>Changed by:</strong> {change.changedByUserName}
            {change.changedByUserEmail && ` (${change.changedByUserEmail})`}
          </div>
        )}
        {change.isBreakingChange && (
          <div className="detail-row breaking-change" style={{ marginBottom: '2px' }}>
            <strong>⚠️ Breaking Change</strong>
          </div>
        )}
      </div>

      <div className="detail-data">
        <h5 style={{ fontSize: '0.85em', margin: '3px 0 3px 0' }}>Change Data:</h5>
        <ChangeDataViewer
          changeData={change.changeData}
          entityType={change.entityType}
          service={service}
        />
      </div>
    </div>
  );
};
