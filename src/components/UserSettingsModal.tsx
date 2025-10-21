import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

export interface UserNotificationPreferences {
  retentionDays: number;
  showBreakingChangesOnly: boolean;
  emailDigestFrequency: 'never' | 'daily' | 'weekly';
  realTimeNotifications: boolean;
}

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultPreferences: UserNotificationPreferences = {
  retentionDays: 30,
  showBreakingChangesOnly: false,
  emailDigestFrequency: 'weekly',
  realTimeNotifications: true
};

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { authState } = useAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load user preferences when modal opens
  useEffect(() => {
    if (isOpen && authState.isAuthenticated) {
      loadUserPreferences();
    }
  }, [isOpen, authState.isAuthenticated]);

  // Reset messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, preferences]);

  const loadUserPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userPrefs = await apiClient.getUserNotificationPreferences();
      setPreferences(userPrefs);
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      // Keep default preferences on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authState.isAuthenticated) {
      setError('You must be logged in to save preferences');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await apiClient.updateUserNotificationPreferences(preferences);
      setSuccessMessage('Settings saved successfully!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving user preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFieldChange = (field: keyof UserNotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user makes changes
    setError(null);
    setSuccessMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content user-settings-modal">
        <div className="modal-header">
          <h2>User Settings</h2>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-message">Loading preferences...</div>
          ) : (
            <>
              {/* Change Tracking Section */}
              <div className="settings-section">
                <h3>Change Tracking</h3>

                <div className="form-group">
                  <label htmlFor="retention-days">Days Retention</label>
                  <select
                    id="retention-days"
                    value={preferences.retentionDays}
                    onChange={(e) => handleFieldChange('retentionDays', parseInt(e.target.value))}
                    disabled={isSaving}
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>365 days</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.showBreakingChangesOnly}
                      onChange={(e) => handleFieldChange('showBreakingChangesOnly', e.target.checked)}
                      disabled={isSaving}
                    />
                    &nbsp;Show breaking changes only
                  </label>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="settings-section">
                <h3>Notifications</h3>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.realTimeNotifications}
                      onChange={(e) => handleFieldChange('realTimeNotifications', e.target.checked)}
                      disabled={isSaving}
                    />
                    &nbsp;Real-time notifications
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="email-frequency">Email Digest Frequency</label>
                  <select
                    id="email-frequency"
                    value={preferences.emailDigestFrequency}
                    onChange={(e) => handleFieldChange('emailDigestFrequency', e.target.value as 'never' | 'daily' | 'weekly')}
                    disabled={isSaving}
                  >
                    <option value="never">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="success-message">
                  {successMessage}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};