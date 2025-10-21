import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register';

interface FormData {
  fullName: string;
  emailAddress: string;
  password: string;
  rememberMe: boolean;
}

const initialFormData: FormData = {
  fullName: '',
  emailAddress: '',
  password: '',
  rememberMe: false
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
      setShowPassword(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setFormData(initialFormData);
    setErrors({});
    setSubmitError(null);
  }, [mode]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Email validation
    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'register') {
      const password = formData.password;
      if (password.length < 15) {
        newErrors.password = 'Password must be at least 15 characters long';
      } else {
        const hasAlpha = /[a-zA-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        const spaceCount = (password.match(/ /g) || []).length;

        if (!hasAlpha) {
          newErrors.password = 'Password must contain at least one alphabetic character';
        } else if (!hasDigit) {
          newErrors.password = 'Password must contain at least one digit';
        } else if (spaceCount < 2) {
          newErrors.password = 'Password must contain at least 2 spaces';
        } else if (!hasSpecial) {
          newErrors.password = 'Password must contain at least one special character';
        }
      }
    }

    // Full name validation (only for registration)
    if (mode === 'register') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      } else if (formData.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name must be at least 2 characters long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === 'login') {
        await login({
          emailAddress: formData.emailAddress,
          password: formData.password,
          rememberMe: formData.rememberMe
        });
      } else {
        await register({
          fullName: formData.fullName.trim(),
          emailAddress: formData.emailAddress,
          password: formData.password,
          rememberMe: formData.rememberMe
        });
      }

      // Success - modal will close via auth state change
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content auth-modal">
        <div className="modal-header">
          <h2>{mode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
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
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('register')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange('fullName')}
                  className={errors.fullName ? 'error' : ''}
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <span className="error-message">{errors.fullName}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="emailAddress">Email Address</label>
              <input
                id="emailAddress"
                type="email"
                value={formData.emailAddress}
                onChange={handleInputChange('emailAddress')}
                className={errors.emailAddress ? 'error' : ''}
                placeholder="Enter your email address"
                disabled={isSubmitting}
              />
              {errors.emailAddress && (
                <span className="error-message">{errors.emailAddress}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={errors.password ? 'error' : ''}
                  placeholder={mode === 'register'
                    ? 'At least 15 chars with 1 digit, 2 spaces, 1 special char'
                    : 'Enter your password'
                  }
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div className="form-group form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange('rememberMe')}
                  disabled={isSubmitting}
                />
                <span className="checkbox-text">Remember me</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  className="link-button forgot-password"
                  onClick={() => {
                    // This will be handled by parent component
                    if ((window as any).handleForgotPassword) {
                      (window as any).handleForgotPassword();
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              )}
            </div>

            {submitError && (
              <div className="error-message submit-error">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              className="button primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (mode === 'login' ? 'Signing in...' : 'Signing up...')
                : (mode === 'login' ? 'Sign In' : 'Sign Up')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};