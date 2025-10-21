import React, { useState, useEffect } from 'react';
import { X, User, Mail, Calendar, Lock, Save, AlertCircle } from 'lucide-react';
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext';
import { User as UserType } from '../types/user';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  fullName: string;
  emailAddress: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type TabType = 'profile' | 'password';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { authState, updateProfile, changePassword } = useEnhancedAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    fullName: '',
    emailAddress: ''
  });
  const [profileErrors, setProfileErrors] = useState<Partial<ProfileFormData>>({});

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordChangeData>>({});

  // Initialize form with user data
  useEffect(() => {
    if (isOpen && authState.user) {
      setProfileData({
        fullName: authState.user.fullName,
        emailAddress: authState.user.emailAddress
      });
    }
  }, [isOpen, authState.user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setProfileErrors({});
      setPasswordErrors({});
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !authState.user) return null;

  const validateProfile = (): boolean => {
    const errors: Partial<ProfileFormData> = {};

    if (!profileData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (profileData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    if (!profileData.emailAddress.trim()) {
      errors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.emailAddress)) {
      errors.emailAddress = 'Please enter a valid email address';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = (): boolean => {
    const errors: Partial<PasswordChangeData> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 15) {
      errors.newPassword = 'Password must be at least 15 characters long';
    } else {
      const hasAlpha = /[a-zA-Z]/.test(passwordData.newPassword);
      const hasDigit = /\d/.test(passwordData.newPassword);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword);
      const spaceCount = (passwordData.newPassword.match(/ /g) || []).length;
      
      if (!hasAlpha) {
        errors.newPassword = 'Password must contain at least one alphabetic character';
      } else if (!hasDigit) {
        errors.newPassword = 'Password must contain at least one digit';
      } else if (spaceCount < 2) {
        errors.newPassword = 'Password must contain at least 2 spaces';
      } else if (!hasSpecial) {
        errors.newPassword = 'Password must contain at least one special character';
      }
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await updateProfile({
        fullName: profileData.fullName.trim(),
        emailAddress: profileData.emailAddress
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);

      if (result.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileInputChange = (field: keyof ProfileFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProfileData(prev => ({ ...prev, [field]: e.target.value }));
    
    if (profileErrors[field]) {
      setProfileErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    if (message) {
      setMessage(null);
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordData(prev => ({ ...prev, [field]: e.target.value }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    if (message) {
      setMessage(null);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content user-profile-modal">
        <div className="modal-header">
          <h2>User Profile</h2>
          <button 
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* User Info Display */}
          <div className="user-info-display">
            <div className="user-avatar">
              <User size={24} />
            </div>
            <div className="user-details">
              <h3>{authState.user.fullName}</h3>
              <div className="user-meta">
                <span className="user-email">
                  <Mail size={14} />
                  {authState.user.emailAddress}
                </span>
                <span className="user-joined">
                  <Calendar size={14} />
                  Joined {formatDate(authState.user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="profile-tabs">
            <button
              type="button"
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              Profile Information
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <Lock size={16} />
              Change Password
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`profile-message ${message.type}`}>
              <AlertCircle size={16} />
              {message.text}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={profileData.fullName}
                  onChange={handleProfileInputChange('fullName')}
                  className={profileErrors.fullName ? 'error' : ''}
                  disabled={isLoading}
                />
                {profileErrors.fullName && (
                  <span className="error-message">{profileErrors.fullName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="emailAddress">Email Address</label>
                <input
                  id="emailAddress"
                  type="email"
                  value={profileData.emailAddress}
                  onChange={handleProfileInputChange('emailAddress')}
                  className={profileErrors.emailAddress ? 'error' : ''}
                  disabled={isLoading}
                />
                {profileErrors.emailAddress && (
                  <span className="error-message">{profileErrors.emailAddress}</span>
                )}
              </div>

              <button
                type="submit"
                className="button primary"
                disabled={isLoading}
              >
                <Save size={16} />
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange('currentPassword')}
                  className={passwordErrors.currentPassword ? 'error' : ''}
                  disabled={isLoading}
                />
                {passwordErrors.currentPassword && (
                  <span className="error-message">{passwordErrors.currentPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange('newPassword')}
                  className={passwordErrors.newPassword ? 'error' : ''}
                  placeholder="At least 15 chars with 1 digit, 2 spaces, 1 special char"
                  disabled={isLoading}
                />
                {passwordErrors.newPassword && (
                  <span className="error-message">{passwordErrors.newPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange('confirmPassword')}
                  className={passwordErrors.confirmPassword ? 'error' : ''}
                  disabled={isLoading}
                />
                {passwordErrors.confirmPassword && (
                  <span className="error-message">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <button
                type="submit"
                className="button primary"
                disabled={isLoading}
              >
                <Lock size={16} />
                {isLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};