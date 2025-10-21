import React from 'react';
import { SchemaStatus } from '../../types/schema';
import { STATUS_MESSAGES, NOTICE_STYLES } from './constants';

interface SchemaVersionStatusNoticeProps {
  status: SchemaStatus;
  isEditMode: boolean;
}

/**
 * Component to display status-based editing restrictions notice
 * Extracted from SchemaVersionForm to reduce complexity
 */
export const SchemaVersionStatusNotice: React.FC<SchemaVersionStatusNoticeProps> = ({
  status,
  isEditMode
}) => {
  // Only show notice for edit mode and restricted statuses
  const showNotice = isEditMode && (
    status === SchemaStatus.Published || 
    status === SchemaStatus.Deprecated || 
    status === SchemaStatus.Removed
  );

  if (!showNotice) {
    return null;
  }

  const statusMessage = STATUS_MESSAGES[status];
  
  return (
    <div style={NOTICE_STYLES}>
      <span>
        {statusMessage.icon} <strong>{statusMessage.title}</strong> {statusMessage.message}
      </span>
    </div>
  );
};