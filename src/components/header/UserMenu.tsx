import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface UserMenuProps {
  onSettingsClick: () => void;
  onAdminClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onSettingsClick,
  onAdminClick
}) => {
  const { authState, logout } = useAuth();
  const { is } = usePermissions();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user information from auth state
  const userName = authState.user?.fullName || 'Guest';
  const userInitial = userName.charAt(0).toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMenuItemClick = async (action: string) => {
    console.log(`${action} clicked`);
    setIsDropdownOpen(false);

    // Handle menu actions
    switch (action) {
      case 'Profile':
        // Navigate to profile
        break;
      case 'Settings':
        onSettingsClick();
        break;
      case 'Admin':
        onAdminClick();
        break;
      case 'Sign Out':
        await logout();
        break;
      default:
        break;
    }
  };

  return (
    <div className="user-menu" ref={dropdownRef}>
      <button
        className="user-menu-button"
        onClick={handleDropdownToggle}
        aria-expanded={isDropdownOpen}
      >
        {/* Avatar */}
        <div className="user-avatar">
          <span className="avatar-initial">{userInitial}</span>
        </div>

        {/* Username */}
        <span className="user-name">{userName}</span>

        {/* Dropdown Arrow */}
        <svg
          className={`dropdown-arrow ${isDropdownOpen ? 'dropdown-arrow-open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="user-dropdown">
          <button
            className="dropdown-menu-item"
            onClick={() => handleMenuItemClick('Profile')}
          >
            Profile
          </button>
          <button
            className="dropdown-menu-item"
            onClick={() => handleMenuItemClick('Settings')}
          >
            Settings
          </button>
          {/* Show Admin option only for admin users */}
          {is.admin && (
            <>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-menu-item"
                onClick={() => handleMenuItemClick('Admin')}
              >
                Admin
              </button>
            </>
          )}
          <div className="dropdown-divider"></div>
          <button
            className="dropdown-menu-item"
            onClick={() => handleMenuItemClick('Sign Out')}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};