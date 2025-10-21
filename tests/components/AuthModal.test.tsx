import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthModal } from '../../src/components/AuthModal';

// Mock the AuthContext
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister
  })
}));

describe('AuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any global window properties
    delete (window as any).handleForgotPassword;
  });

  describe('Modal Behavior', () => {
    it('should render when isOpen is true', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AuthModal {...defaultProps} isOpen={false} />);
      expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AuthModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AuthModal {...defaultProps} onClose={onClose} />);

      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        await user.click(overlay as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Tab Navigation', () => {
    it('should start with login tab active', () => {
      render(<AuthModal {...defaultProps} />);

      // Get tab buttons specifically (first occurrence of each)
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });

      const loginTab = signInButtons[0]; // First is the tab button
      const registerTab = signUpButtons[0]; // First is the tab button

      expect(loginTab).toHaveClass('active');
      expect(registerTab).not.toHaveClass('active');
    });

    it('should switch to register tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Get tab button specifically (first occurrence)
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
      const registerTab = signUpButtons[0]; // First is the tab button

      await user.click(registerTab);

      expect(registerTab).toHaveClass('active');
      expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
    });

    it('should show full name field only in register mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Login mode - no full name field
      expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

      // Switch to register mode
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
      const registerTab = signUpButtons[0]; // First is the tab button
      await user.click(registerTab);

      // Register mode - full name field present
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    it('should reset form when switching tabs', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      // Switch to register tab and back
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });

      const registerTab = signUpButtons[0]; // First is the tab button
      const loginTab = signInButtons[0]; // First is the tab button

      await user.click(registerTab);
      await user.click(loginTab);

      // Form should be reset
      expect(emailInput).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    describe('Email Validation', () => {
      it('should show error for empty email', async () => {
        const user = userEvent.setup();
        render(<AuthModal {...defaultProps} />);

        // Get submit button (second button with "Sign In" text)
        const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
        const submitButton = signInButtons[1]; // Second is the submit button

        if (submitButton) await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
        });
      });

      it('should show error for invalid email format', async () => {
        const user = userEvent.setup();
        render(<AuthModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, 'invalid-email');

        // Submit the form directly
        const form = document.querySelector('form.auth-form');
        if (form) {
          fireEvent.submit(form);
        } else {
          // Fallback to button click
          const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
          const submitButton = signInButtons[1]; // Second is the submit button
          if (submitButton) await user.click(submitButton);
        }

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        });
      });

      it('should accept valid email format', async () => {
        const user = userEvent.setup();
        render(<AuthModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(emailInput, 'valid@example.com');
        await user.type(passwordInput, 'password123');

        // Get submit button (second button with "Sign In" text)
        const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
        const submitButton = signInButtons[1]; // Second is the submit button
        if (submitButton) await user.click(submitButton);

        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });

    describe('Password Validation', () => {
      it('should show error for empty password', async () => {
        const user = userEvent.setup();
        render(<AuthModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, 'test@example.com');

        // Submit the form directly
        const form = document.querySelector('form.auth-form');
        if (form) {
          fireEvent.submit(form);
        } else {
          // Fallback to button click
          const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
          const submitButton = signInButtons[1]; // Second is the submit button
          if (submitButton) await user.click(submitButton);
        }

        await waitFor(() => {
          expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
      });

      describe('Registration Password Requirements', () => {
        beforeEach(async () => {
          const user = userEvent.setup();
          render(<AuthModal {...defaultProps} />);

          // Switch to register tab
          const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
          const registerTab = signUpButtons[0]; // First is the tab button
          await user.click(registerTab);
        });

        it('should require minimum 15 characters', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'short');

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/password must be at least 15 characters long/i)).toBeInTheDocument();
          });
        });

        it('should require alphabetic character', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, '123456789012345'); // 15 digits, no alpha

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/password must contain at least one alphabetic character/i)).toBeInTheDocument();
          });
        });

        it('should require digit', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'abcdefghijklmnop'); // 16 letters, no digit

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/password must contain at least one digit/i)).toBeInTheDocument();
          });
        });

        it('should require at least 2 spaces', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'password1 space'); // Only 1 space

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/password must contain at least 2 spaces/i)).toBeInTheDocument();
          });
        });

        it('should require special character', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'password1 with spaces'); // No special char

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument();
          });
        });

        it('should accept valid password with all requirements', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);
          const fullNameInput = screen.getByLabelText(/full name/i);

          await user.type(fullNameInput, 'Test User');
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'valid password 123!'); // All requirements met

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          expect(screen.queryByText(/password must/i)).not.toBeInTheDocument();
        });
      });

      describe('Full Name Validation (Registration)', () => {
        beforeEach(async () => {
          const user = userEvent.setup();
          render(<AuthModal {...defaultProps} />);

          // Switch to register tab
          const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
          const registerTab = signUpButtons[0]; // First is the tab button
          await user.click(registerTab);
        });

        it('should require full name', async () => {
          const user = userEvent.setup();

          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);

          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'valid password 123!');

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
          });
        });

        it('should require minimum 2 characters for full name', async () => {
          const user = userEvent.setup();

          const fullNameInput = screen.getByLabelText(/full name/i);
          const emailInput = screen.getByLabelText(/email address/i);
          const passwordInput = screen.getByLabelText(/^password$/i);

          await user.type(fullNameInput, 'A'); // Only 1 character
          await user.type(emailInput, 'test@example.com');
          await user.type(passwordInput, 'valid password 123!');

          // Submit the form directly
          const form = document.querySelector('form.auth-form');
          if (form) {
            fireEvent.submit(form);
          } else {
            // Fallback to button click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) await user.click(submitButton);
          }

          await waitFor(() => {
            expect(screen.getByText(/full name must be at least 2 characters long/i)).toBeInTheDocument();
          });
        });
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

      // Click toggle to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    });
  });

  describe('Remember Me Functionality', () => {
    it('should have remember me checkbox unchecked by default', () => {
      render(<AuthModal {...defaultProps} />);

      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      expect(rememberMeCheckbox).not.toBeChecked();
    });

    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox).toBeChecked();

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox).not.toBeChecked();
    });
  });

  describe('Forgot Password Link', () => {
    it('should show forgot password link only in login mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Login mode - should show forgot password
      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();

      // Switch to register mode
      // Get tab button (first button with "Sign Up" text)
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
      const registerTab = signUpButtons[0]; // First is the tab button
      await user.click(registerTab);

      // Register mode - should not show forgot password
      expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
    });

    it('should call global handleForgotPassword when clicked', async () => {
      const user = userEvent.setup();
      const mockHandleForgotPassword = vi.fn();
      (window as any).handleForgotPassword = mockHandleForgotPassword;

      render(<AuthModal {...defaultProps} />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotPasswordButton);

      expect(mockHandleForgotPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    describe('Login Submission', () => {
      it('should call login function with correct parameters', async () => {
        const user = userEvent.setup();
        mockLogin.mockResolvedValueOnce({ success: true });

        render(<AuthModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(rememberMeCheckbox);

        // Get submit button (second button with "Sign In" text)
        const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
        const submitButton = signInButtons[1]; // Second is the submit button
        if (submitButton) await user.click(submitButton);

        expect(mockLogin).toHaveBeenCalledWith({
          emailAddress: 'test@example.com',
          password: 'password123',
          rememberMe: true
        });
      });

      it('should close modal on successful login', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        mockLogin.mockResolvedValueOnce({ success: true });

        render(<AuthModal {...defaultProps} onClose={onClose} />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');

        // Get submit button (second button with "Sign In" text)
        const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
        const submitButton = signInButtons[1]; // Second is the submit button
        if (submitButton) await user.click(submitButton);

        await waitFor(() => {
          expect(onClose).toHaveBeenCalledTimes(1);
        });
      });

      it('should show error message on login failure', async () => {
        const user = userEvent.setup();
        mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

        render(<AuthModal {...defaultProps} />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'wrongpassword');

        // Get submit button (second button with "Sign In" text)
        const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
        const submitButton = signInButtons[1]; // Second is the submit button
        if (submitButton) await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
      });
    });

    describe('Registration Submission', () => {
      beforeEach(async () => {
        const user = userEvent.setup();
        render(<AuthModal {...defaultProps} />);

        // Switch to register tab
        // Get tab button (first button with "Sign Up" text)
      const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
      const registerTab = signUpButtons[0]; // First is the tab button
        await user.click(registerTab);
      });

      it('should call register function with correct parameters', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValueOnce({ success: true });

        const fullNameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

        await user.type(fullNameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'valid password 123!');
        await user.click(rememberMeCheckbox);

        // Get submit button (we're already in register mode from beforeEach)
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) await user.click(submitButton);

        expect(mockRegister).toHaveBeenCalledWith({
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          password: 'valid password 123!',
          rememberMe: true
        });
      });

      it('should close modal on successful registration', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValueOnce({ success: true });

        const fullNameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(fullNameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'valid password 123!');

        // Submit the form directly
        const form = document.querySelector('form.auth-form');
        if (form) {
          fireEvent.submit(form);
        } else {
          // Fallback to button click
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton) await user.click(submitButton);
        }

        // Check if register was called with correct parameters
        await waitFor(() => {
          expect(mockRegister).toHaveBeenCalledWith({
            fullName: 'Test User',
            emailAddress: 'test@example.com',
            password: 'valid password 123!',
            rememberMe: false
          });
        });

        // Check if onClose from defaultProps was called
        await waitFor(() => {
          expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
      });

      it('should show error message on registration failure', async () => {
        const user = userEvent.setup();
        mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

        const fullNameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(fullNameInput, 'Test User');
        await user.type(emailInput, 'existing@example.com');
        await user.type(passwordInput, 'valid password 123!');

        // Get submit button (we're already in register mode from beforeEach)
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login submission', async () => {
      const user = userEvent.setup();
      // Create a promise that we can control
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValueOnce(loginPromise);

      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Get submit button (second button with "Sign In" text)
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
      const submitButton = signInButtons[1]; // Second is the submit button
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();

      // Resolve the promise
      resolveLogin!({ success: true });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument();
      });
    });

    it('should disable form inputs during submission', async () => {
      const user = userEvent.setup();
      // Create a promise that we can control
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValueOnce(loginPromise);

      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Get submit button (second button with "Sign In" text)
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
      const submitButton = signInButtons[1]; // Second is the submit button
      await user.click(submitButton);

      // Form inputs should be disabled
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      // Resolve the promise
      resolveLogin!({ success: true });

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Trigger validation error
      // Get submit button (second button with "Sign In" text)
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
      const submitButton = signInButtons[1]; // Second is the submit button
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 't');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email address is required/i)).not.toBeInTheDocument();
      });
    });

    it('should clear submit error when user makes changes', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Get submit button (second button with "Sign In" text)
      const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
      const submitButton = signInButtons[1]; // Second is the submit button
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Make a change to clear the error
      await user.type(emailInput, 'x');

      await waitFor(() => {
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form when modal closes and reopens', async () => {
      const { rerender } = render(<AuthModal {...defaultProps} />);
      const user = userEvent.setup();

      // Fill in form
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      // Close modal
      rerender(<AuthModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<AuthModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      const newEmailInput = screen.getByLabelText(/email address/i);
      expect(newEmailInput).toHaveValue('');
    });
  });
});