import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationsBellProps {
  changeCount: number;
  onClick: () => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  changeCount,
  onClick
}) => {
  return (
    <button
      className="notification-button"
      title="Notifications"
      onClick={onClick}
    >
      <Bell size={20} />
      {changeCount > 0 && (
        <span className="notification-badge">{changeCount}</span>
      )}
    </button>
  );
};