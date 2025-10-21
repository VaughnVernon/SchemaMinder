import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../../src/components/LoginForm';

// Mock dependencies
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/services/authClient', () => ({
  AuthClient: vi.fn().mockImplementation(() => ({
    validateEmail: vi.fn()
  }))
}));

import { useAuth } from '../../src/contexts/AuthContext';
import { AuthClient } from '../../src/services/authClient';

describe('LoginForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnSwitchToRegister = vi.fn();
  const mockLogin = vi.fn();
  const mockValidateEmail = vi.fn();

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      authState: { isLoading: false }
    });

    (AuthClient as any).mockImplementation(() => ({
      validateEmail: mockValidateEmail
    }));

    // Default email validation - valid
    mockValidateEmail.mockReturnValue({ isValid: true, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginForm = (props = {}) => {
    const defaultProps = {
      onSuccess: mockOnSuccess,
      onCancel: mockOnCancel,
      onSwitchToRegister: mockOnSwitchToRegister
    };

    return render(<LoginForm {...defaultProps} {...props} />);
  };

  describe('Component Rendering', () => {
    it('should render login form with all elements', () => {
      renderLoginForm();

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address:')).toBeInTheDocument();
      expect(screen.getByLabelText('Password:')).toBeInTheDocument();
      expect(screen.getByLabelText('Remember me for 30 days')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /need an account\? sign up/i })).toBeInTheDocument();
    });

    it('should render without optional buttons when props not provided', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address:')).toBeInTheDocument();
      expect(screen.getByLabelText('Password:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /need an account\? sign up/i })).not.toBeInTheDocument();
    });

    it('should have proper form attributes and accessibility', () => {
      renderLoginForm();

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const emailInput = screen.getByLabelText('Email Address:');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');

      const passwordInput = screen.getByLabelText('Password:');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');

      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      expect(rememberCheckbox).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Form Input Handling', () => {
    it('should update email field when user types', async () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field when user types', async () => {
      renderLoginForm();

      const passwordInput = screen.getByLabelText('Password:');
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle remember me checkbox', async () => {
      renderLoginForm();

      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).not.toBeChecked();
    });

    it('should update form fields when user types', async () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('Form Validation', () => {
    it('should call validation methods on submit', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockValidateEmail).toHaveBeenCalledWith('test@example.com');
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data on successful validation', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          emailAddress: 'test@example.com',
          password: 'password123',
          rememberMe: true
        });
      });
    });

    it('should trim email address before submission', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, '  test@example.com  ');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          emailAddress: 'test@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should call onSuccess on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear form fields on successful login', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
        expect(rememberCheckbox).not.toBeChecked();
      });
    });

    it('should show loading state during submission', async () => {
      // Mock a delayed response
      mockLogin.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toHaveTextContent('Signing In...');
      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Sign In');
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should prevent double submission', async () => {
      // Mock a slow response
      mockLogin.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // First submission
      await user.click(submitButton);
      expect(submitButton).toBeDisabled();

      // Try to submit again
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display backend error messages', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'INVALID_CREDENTIALS' });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address or password')).toBeInTheDocument();
      });
    });

    it('should handle USER_NOT_FOUND error correctly', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'USER_NOT_FOUND' });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('No account found with this email address')).toBeInTheDocument();
      });
    });

    it('should handle NETWORK_ERROR correctly', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'NETWORK_ERROR' });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
      });
    });

    it('should handle unexpected errors during login', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLogin.mockRejectedValue(new Error('Network error'));

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form with Ctrl+S', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          emailAddress: 'test@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should call onCancel with Escape key', async () => {
      renderLoginForm();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior for keyboard shortcuts', async () => {
      renderLoginForm();

      const ctrlSEvent = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      const preventDefaultSpyCtrlS = vi.spyOn(ctrlSEvent, 'preventDefault');
      const preventDefaultSpyEscape = vi.spyOn(escapeEvent, 'preventDefault');

      fireEvent(window, ctrlSEvent);
      fireEvent(window, escapeEvent);

      expect(preventDefaultSpyCtrlS).toHaveBeenCalled();
      expect(preventDefaultSpyEscape).toHaveBeenCalled();
    });

    it('should not submit with Ctrl+S during submission', async () => {
      // Mock a slow response
      mockLogin.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Start submission
      await user.click(submitButton);

      // Try keyboard shortcut during submission
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Button Interactions', () => {
    it('should call onCancel when Cancel button is clicked', async () => {
      renderLoginForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onSwitchToRegister when Sign Up button is clicked', async () => {
      renderLoginForm();

      const signUpButton = screen.getByRole('button', { name: /need an account\? sign up/i });
      await user.click(signUpButton);

      expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
    });

    it('should disable all buttons during submission', async () => {
      // Mock a slow response
      mockLogin.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderLoginForm();

      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const signUpButton = screen.getByRole('button', { name: /need an account\? sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(signUpButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
        expect(signUpButton).not.toBeDisabled();
      });
    });

    it('should disable submit button when auth state is loading', () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        authState: { isLoading: true }
      });

      renderLoginForm();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up keyboard event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderLoginForm();
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});