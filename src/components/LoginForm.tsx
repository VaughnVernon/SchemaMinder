import React, { useState, useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthClient } from '../services/authClient';

interface LoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  onCancel,
  onSwitchToRegister 
}) => {
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, authState } = useAuth();
  const authClient = new AuthClient();

  // Clear errors when form fields change
  useEffect(() => {
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [emailAddress, password]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for login
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
  }, [isSubmitting, emailAddress, password, rememberMe]);

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // Validate email
    const emailValidation = authClient.validateEmail(emailAddress);
    if (!emailValidation.isValid && emailValidation.error) {
      validationErrors.push(emailValidation.error);
    }

    // Validate password (basic check - not empty)
    if (!password.trim()) {
      validationErrors.push('Password is required');
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
      const result = await login({
        emailAddress: emailAddress.trim(),
        password,
        rememberMe
      });

      if (result.success) {
        setEmailAddress('');
        setPassword('');
        setRememberMe(false);
        onSuccess?.();
      } else if (result.error) {
        // Map backend errors to user-friendly messages
        const errorMessage = getErrorMessage(result.error);
        setErrors([errorMessage]);
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors(['An unexpected error occurred. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email address or password';
      case 'USER_NOT_FOUND':
        return 'No account found with this email address';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      case 'INTERNAL_ERROR':
        return 'Server error. Please try again later.';
      default:
        return error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" role="form">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LogIn size={20} />
        Sign In
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
        <label htmlFor="login-email">Email Address:</label>
        <input
          type="email"
          id="login-email"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="login-password">Password:</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isSubmitting}
        />
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
          {isSubmitting ? 'Signing In...' : 'Sign In'}
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
        
        {onSwitchToRegister && (
          <button 
            type="button" 
            onClick={onSwitchToRegister} 
            className="button secondary"
            disabled={isSubmitting}
          >
            Need an account? Sign Up
          </button>
        )}
      </div>
    </form>
  );
};