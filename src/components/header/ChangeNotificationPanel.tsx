import React, { useState, useEffect, useMemo } from 'react';
import { useChangeNotifications } from '../../hooks/useChangeNotifications';
import { SchemaRegistry } from '../../types/schema';
import { ChangeNotificationService } from '../../services/changeNotificationService';
import { NotificationControls } from './NotificationControls';
import { ChangeListItem } from './ChangeListItem';
import { ChangeDetailView } from './ChangeDetailView';

interface ChangeNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  registry: SchemaRegistry;
  onChangesUpdate?: () => void;
}

export const ChangeNotificationPanel: React.FC<ChangeNotificationPanelProps> = ({
  isOpen,
  onClose,
  registry,
  onChangesUpdate
}) => {
  const {
    detailedChanges,
    isLoading,
    error,
    fetchAllDetailedChanges,
    markChangesAsSeen
  } = useChangeNotifications();

  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [selectedChangeForDetail, setSelectedChangeForDetail] = useState<any>(null);

  // Create service instance
  const service = useMemo(() => new ChangeNotificationService(registry), [registry]);

  useEffect(() => {
    if (isOpen) {
      fetchAllDetailedChanges();
    }
  }, [isOpen, fetchAllDetailedChanges]);

  const handleSelectAll = () => {
    if (selectedChanges.size === detailedChanges.length) {
      setSelectedChanges(new Set());
    } else {
      setSelectedChanges(new Set(detailedChanges.map(change => change.id)));
    }
  };

  const handleSelectChange = (changeId: string) => {
    const newSelected = new Set(selectedChanges);
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId);
    } else {
      newSelected.add(changeId);
    }
    setSelectedChanges(newSelected);
  };

  const handleChangeClick = (change: any) => {
    setSelectedChangeForDetail(change);
  };

  const handleDismissSelected = async () => {
    if (selectedChanges.size === 0) return;

    const success = await markChangesAsSeen(Array.from(selectedChanges));
    if (success) {
      setSelectedChanges(new Set());
      // Clear detail view if the selected change was dismissed
      if (selectedChangeForDetail && selectedChanges.has(selectedChangeForDetail.id)) {
        setSelectedChangeForDetail(null);
      }
      // Notify the Header to refresh its change count
      if (onChangesUpdate) {
        onChangesUpdate();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-panel-header">
          <h3>Recent Changes</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="notification-panel-body">
          {/* Left Column - Change List */}
          <div className="notification-list-column">
            {/* Fixed controls section */}
            <div className="notification-controls-fixed">
              {!isLoading && !error && detailedChanges.length > 0 && (
                <NotificationControls
                  totalCount={detailedChanges.length}
                  selectedCount={selectedChanges.size}
                  isAllSelected={selectedChanges.size === detailedChanges.length}
                  onSelectAll={handleSelectAll}
                  onDismiss={handleDismissSelected}
                />
              )}
            </div>

            {/* Scrollable content section */}
            <div className="notification-panel-content">
              {isLoading && <p>Loading changes...</p>}
              {error && <p className="error">Error: {error}</p>}

              {!isLoading && !error && detailedChanges.length === 0 && (
                <p>No recent changes to display</p>
              )}

              {!isLoading && !error && detailedChanges.length > 0 && (
                <div className="notification-list">
                  {detailedChanges.map((change) => (
                    <ChangeListItem
                      key={change.id}
                      change={change}
                      isSelected={selectedChangeForDetail?.id === change.id}
                      isChecked={selectedChanges.has(change.id)}
                      onSelect={handleSelectChange}
                      onClick={handleChangeClick}
                      service={service}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Detail View */}
          <div className="notification-detail-column">
            <ChangeDetailView
              change={selectedChangeForDetail}
              service={service}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
