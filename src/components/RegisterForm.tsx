import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthClient } from '../services/authClient';

interface RegisterFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onCancel,
  onSwitchToLogin
}) => {
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, authState } = useAuth();
  const authClient = new AuthClient();

  // Clear errors when form fields change
  useEffect(() => {
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [fullName, emailAddress, password]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for register
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (!isSubmitting) {
          handleSubmit();
        }
      }

      // Escape to cancel
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, fullName, emailAddress, password, rememberMe]);

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // Validate full name
    const nameValidation = authClient.validateFullName(fullName);
    if (!nameValidation.isValid && nameValidation.error) {
      validationErrors.push(nameValidation.error);
    }

    // Validate email
    const emailValidation = authClient.validateEmail(emailAddress);
    if (!emailValidation.isValid && emailValidation.error) {
      validationErrors.push(emailValidation.error);
    }

    // Validate password
    const passwordValidation = authClient.validatePassword(password);
    if (!passwordValidation.isValid) {
      validationErrors.push(...passwordValidation.errors);
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        fullName: fullName.trim(),
        emailAddress: emailAddress.trim(),
        password,
        rememberMe
      });

      if (result.success) {
        setFullName('');
        setEmailAddress('');
        setPassword('');
        setRememberMe(false);
        onSuccess?.();
      } else if (result.error) {
        setErrors([result.error]);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors(['An unexpected error occurred. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UserPlus size={20} />
        Sign Up
      </h3>

      {errors.length > 0 && (
        <div className="form-errors" style={{
          color: '#d73a49',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="register-fullname">Full Name:</label>
        <input
          type="text"
          id="register-fullname"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="register-email">Email Address:</label>
        <input
          type="email"
          id="register-email"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="register-password">Password:</label>
        <input
          type="password"
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isSubmitting}
        />
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          Password must be at least 15 characters long and contain:
          <br />• Alphabetic characters
          <br />• At least 1 digit
          <br />• At least 2 spaces
          <br />• At least 1 special character
        </div>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isSubmitting}
          />
          Remember me for 30 days
        </label>
      </div>

      <div>
        <button
          type="submit"
          className="button"
          disabled={isSubmitting || authState.isLoading}
        >
          {isSubmitting ? 'Creating Account...' : 'Sign Up'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="button secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}

        {onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="button secondary"
            disabled={isSubmitting}
          >
            Already have an account? Sign In
          </button>
        )}
      </div>
    </form>
  );
};