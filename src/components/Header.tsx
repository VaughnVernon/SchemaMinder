import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChangeNotifications } from '../hooks/useChangeNotifications';
import { AdminInterface } from './AdminInterface';
import { UserSettingsModal } from './UserSettingsModal';
import { SchemaRegistry } from '../types/schema';
import {
  HeaderLogo,
  NotificationsBell,
  UserMenu,
  ChangeNotificationPanel
} from './header';

interface HeaderProps {
  registry: SchemaRegistry;
}

export const Header: React.FC<HeaderProps> = ({ registry }) => {
  const { authState } = useAuth();
  const { totalChangeCount, refresh } = useChangeNotifications();
  const [showAdminInterface, setShowAdminInterface] = useState(false);
  const [showChangePanel, setShowChangePanel] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);

  // Only show change count for authenticated users
  const displayChangeCount = authState.isAuthenticated ? totalChangeCount : 0;

  const handleNotificationClick = () => {
    setShowChangePanel(true);
  };

  const handleCloseChangePanel = () => {
    setShowChangePanel(false);
  };

  const handleSettingsClick = () => {
    setShowUserSettings(true);
  };

  const handleAdminClick = () => {
    setShowAdminInterface(true);
  };

  const handleCloseAdminInterface = () => {
    setShowAdminInterface(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo */}
        <HeaderLogo />

        {/* Right side: Authentication and User Menu */}
        <div className="header-right">
          {authState.isAuthenticated ? (
            <>
              {/* Notifications Bell - only show when authenticated */}
              <NotificationsBell
                changeCount={displayChangeCount}
                onClick={handleNotificationClick}
              />

              {/* User Menu - authenticated */}
              <UserMenu
                onSettingsClick={handleSettingsClick}
                onAdminClick={handleAdminClick}
              />
            </>
          ) : null /* No Sign In button - authentication modal will be shown automatically */}
        </div>
      </div>

      {/* Admin Interface Modal */}
      {showAdminInterface && (
        <AdminInterface onClose={handleCloseAdminInterface} />
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <UserSettingsModal
          isOpen={showUserSettings}
          onClose={() => setShowUserSettings(false)}
        />
      )}

      {/* Change Notification Panel */}
      {showChangePanel && (
        <ChangeNotificationPanel
          isOpen={showChangePanel}
          onClose={handleCloseChangePanel}
          registry={registry}
          onChangesUpdate={refresh}
        />
      )}
    </header>
  );
};