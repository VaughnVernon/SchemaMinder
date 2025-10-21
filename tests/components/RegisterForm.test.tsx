import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../../src/components/RegisterForm';

// Mock dependencies
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/services/authClient', () => ({
  AuthClient: vi.fn().mockImplementation(() => ({
    validateEmail: vi.fn(),
    validatePassword: vi.fn(),
    validateFullName: vi.fn()
  }))
}));

import { useAuth } from '../../src/contexts/AuthContext';
import { AuthClient } from '../../src/services/authClient';

describe('RegisterForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnSwitchToLogin = vi.fn();
  const mockRegister = vi.fn();
  const mockValidateEmail = vi.fn();
  const mockValidatePassword = vi.fn();
  const mockValidateFullName = vi.fn();

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useAuth as any).mockReturnValue({
      register: mockRegister,
      authState: { isLoading: false }
    });

    (AuthClient as any).mockImplementation(() => ({
      validateEmail: mockValidateEmail,
      validatePassword: mockValidatePassword,
      validateFullName: mockValidateFullName
    }));

    // Default validations - all valid
    mockValidateEmail.mockReturnValue({ isValid: true, error: null });
    mockValidatePassword.mockReturnValue({ isValid: true, errors: [] });
    mockValidateFullName.mockReturnValue({ isValid: true, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderRegisterForm = (props = {}) => {
    const defaultProps = {
      onSuccess: mockOnSuccess,
      onCancel: mockOnCancel,
      onSwitchToLogin: mockOnSwitchToLogin
    };

    return render(<RegisterForm {...defaultProps} {...props} />);
  };

  describe('Component Rendering', () => {
    it('should render register form with all elements', () => {
      renderRegisterForm();

      expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name:')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address:')).toBeInTheDocument();
      expect(screen.getByLabelText('Password:')).toBeInTheDocument();
      expect(screen.getByLabelText('Remember me for 30 days')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /already have an account\? sign in/i })).toBeInTheDocument();
    });

    it('should render without optional buttons when props not provided', () => {
      render(<RegisterForm />);

      expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name:')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address:')).toBeInTheDocument();
      expect(screen.getByLabelText('Password:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /already have an account\? sign in/i })).not.toBeInTheDocument();
    });

    it('should have proper form attributes and accessibility', () => {
      renderRegisterForm();

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const fullNameInput = screen.getByLabelText('Full Name:');
      expect(fullNameInput).toHaveAttribute('type', 'text');
      expect(fullNameInput).toHaveAttribute('required');
      expect(fullNameInput).toHaveAttribute('placeholder', 'Enter your full name');

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
    it('should update all form fields when user types', () => {
      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');

      fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(fullNameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle remember me checkbox', async () => {
      renderRegisterForm();

      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).not.toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('should call validation methods and proceed with registration when valid', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'John Doe',
          emailAddress: 'john@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should create AuthClient instance for validation', () => {
      renderRegisterForm();
      expect(AuthClient).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data on successful validation', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'John Doe',
          emailAddress: 'john@example.com',
          password: 'password123',
          rememberMe: true
        });
      });
    });

    it('should trim full name and email before submission', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, '  John Doe  ');
      await user.type(emailInput, '  john@example.com  ');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'John Doe',
          emailAddress: 'john@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should call onSuccess on successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear form fields on successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(fullNameInput).toHaveValue('');
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
        expect(rememberCheckbox).not.toBeChecked();
      });
    });

    it('should prevent double submission', async () => {
      // Mock a slow response
      mockRegister.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');

      // First submission
      await user.click(submitButton);
      expect(submitButton).toBeDisabled();

      // Try to submit again
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display backend error messages', async () => {
      mockRegister.mockResolvedValue({ success: false, error: 'Email already exists' });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors during registration', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRegister.mockRejectedValue(new Error('Network error'));

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
      expect(mockOnSuccess).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle registration failure without error message', async () => {
      mockRegister.mockResolvedValue({ success: false });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should preserve form data when registration fails', async () => {
      mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const rememberCheckbox = screen.getByLabelText('Remember me for 30 days');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(fullNameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(passwordInput).toHaveValue('password123');
      expect(rememberCheckbox).toBeChecked();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form with Ctrl+S', async () => {
      mockRegister.mockResolvedValue({ success: true });

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'John Doe',
          emailAddress: 'john@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should call onCancel with Escape key', async () => {
      renderRegisterForm();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not submit with Ctrl+S during submission', async () => {
      // Mock a slow response
      mockRegister.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');

      // Start submission
      await user.click(submitButton);

      // Try keyboard shortcut during submission
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Button Interactions', () => {
    it('should call onCancel when Cancel button is clicked', async () => {
      renderRegisterForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onSwitchToLogin when Sign In button is clicked', async () => {
      renderRegisterForm();

      const signInButton = screen.getByRole('button', { name: /already have an account\? sign in/i });
      await user.click(signInButton);

      expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
    });

    it('should disable all buttons during submission', async () => {
      // Mock a slow response
      mockRegister.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      ));

      renderRegisterForm();

      const fullNameInput = screen.getByLabelText('Full Name:');
      const emailInput = screen.getByLabelText('Email Address:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const signInButton = screen.getByRole('button', { name: /already have an account\? sign in/i });

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(signInButton).toBeDisabled();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
        expect(signInButton).not.toBeDisabled();
      });
    });

    it('should disable submit button when auth state is loading', () => {
      (useAuth as any).mockReturnValue({
        register: mockRegister,
        authState: { isLoading: true }
      });

      renderRegisterForm();

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up keyboard event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderRegisterForm();
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});