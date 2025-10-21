/**
 * Component for displaying before/after change data
 */

import React from 'react';
import { ChangeNotificationService } from '../../services/changeNotificationService';

interface ChangeDataViewerProps {
  changeData: any;
  entityType: string;
  service: ChangeNotificationService;
}

export const ChangeDataViewer: React.FC<ChangeDataViewerProps> = ({
  changeData,
  entityType,
  service
}) => {
  if (!changeData) {
    return <div>No change data available</div>;
  }

  const before = changeData.before || {};
  const after = changeData.after || {};

  // Get relevant fields for this entity type
  const fieldsToShow = service.getRelevantFields(entityType);

  // Extract only fields that actually changed
  const { beforeData, afterData } = service.extractChangedFields(before, after, fieldsToShow);

  return (
    <div className="change-data-viewer" style={{ fontSize: '0.85em', marginTop: '0', paddingTop: '4px' }}>
      {Object.keys(beforeData).length > 0 && (
        <div className="change-section" style={{ marginTop: '2px', paddingTop: '0' }}>
          <h4 style={{ fontSize: '0.9em', margin: '0 0 2px 0' }}>Before:</h4>
          <div className="change-fields">
            {Object.entries(beforeData).map(([key, value]) => (
              <div key={`before-${key}`} className="change-field" style={{ fontSize: '0.85em', marginBottom: '4px' }}>
                <strong>{key}:</strong> {service.formatValue(key, value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(afterData).length > 0 && (
        <div className="change-section" style={{ marginTop: Object.keys(beforeData).length > 0 ? '12px' : '0', paddingTop: '0' }}>
          <h4 style={{ fontSize: '0.9em', margin: '0 0 2px 0' }}>After:</h4>
          <div className="change-fields">
            {Object.entries(afterData).map(([key, value]) => (
              <div key={`after-${key}`} className="change-field" style={{ fontSize: '0.85em', marginBottom: '4px' }}>
                <strong>{key}:</strong> {service.formatValue(key, value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(beforeData).length === 0 && Object.keys(afterData).length === 0 && (
        <div className="no-relevant-changes" style={{ fontSize: '0.85em', marginTop: '0', paddingTop: '0' }}>
          No relevant field changes to display
        </div>
      )}
    </div>
  );
};
