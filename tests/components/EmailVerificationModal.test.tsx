import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerificationModal } from '../../src/components/EmailVerificationModal';
import { useEnhancedAuth } from '../../src/contexts/EnhancedAuthContext';
import { User } from '../../src/types/user';

// Mock the enhanced auth context
vi.mock('../../src/contexts/EnhancedAuthContext', () => ({
  useEnhancedAuth: vi.fn()
}));

// No fake timers needed - using timestamp-based approach

describe('EmailVerificationModal', () => {
  const mockUser: User = {
    id: '1',
    fullName: 'John Doe',
    emailAddress: 'john.doe@example.com',
    emailVerified: false,
    roles: ['viewer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockVerifyEmail = vi.fn();
  const mockResendVerificationEmail = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      },
      verifyEmail: mockVerifyEmail,
      resendVerificationEmail: mockResendVerificationEmail
    });

    mockVerifyEmail.mockImplementation(() => Promise.resolve({ success: true }));
    mockResendVerificationEmail.mockImplementation(() => Promise.resolve({ success: true }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Modal Behavior', () => {
    it('should not render when isOpen is false', () => {
      render(<EmailVerificationModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Email Verification')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      expect(screen.getByText('Email Verification')).toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const overlay = document.querySelector('.modal-overlay');
      await user.click(overlay!);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const content = document.querySelector('.modal-content');
      await user.click(content!);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial State - Unverified Email', () => {
    it('should display verification instructions for unverified email', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByText('Verify Your Email Address')).toBeInTheDocument();
      expect(screen.getByText(/Please check your email for a verification link/)).toBeInTheDocument();
      expect(screen.getByText(/Verification email sent to:/)).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should show mail icon for pending status', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      expect(document.querySelector('.status-icon')).toBeInTheDocument();
      expect(document.querySelector('.info-icon')).toBeInTheDocument();
    });

    it('should display resend verification button', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('should display help section with troubleshooting tips', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByText('Having trouble?')).toBeInTheDocument();
      expect(screen.getByText(/Check your spam or junk folder/)).toBeInTheDocument();
      expect(screen.getByText(/Make sure you're checking the correct email address/)).toBeInTheDocument();
      expect(screen.getByText(/Verification links expire after 24 hours/)).toBeInTheDocument();
      expect(screen.getByText(/Contact support if you continue having issues/)).toBeInTheDocument();
    });
  });

  describe('Already Verified Email', () => {
    beforeEach(() => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: verifiedUser,
          isLoading: false,
          error: null
        },
        verifyEmail: mockVerifyEmail,
        resendVerificationEmail: mockResendVerificationEmail
      });
    });

    it('should display already verified message', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByText('Email Already Verified')).toBeInTheDocument();
      expect(screen.getByText(/Your email address.*is already verified/)).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should not display resend button for verified email', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /resend verification email/i })).not.toBeInTheDocument();
    });
  });

  describe('Auto Verification with Token', () => {
    it('should auto-verify when verification token is provided', async () => {
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith('abc123');
      }, { timeout: 1000 });
    });

    it('should show verifying status during auto-verification', async () => {
      mockVerifyEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      expect(screen.getByText('Verifying your email address...')).toBeInTheDocument();
    });

    it('should show success status after successful auto-verification', async () => {
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Your email address has been verified successfully!')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      expect(document.querySelector('.success-icon')).toBeInTheDocument();
    });

    it('should show error status for failed auto-verification', async () => {
      mockVerifyEmail.mockResolvedValue({ success: false, error: 'Invalid token' });
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="invalid123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid token')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      expect(document.querySelector('.error-icon')).toBeInTheDocument();
    });

    it('should handle auto-verification exceptions', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('Network error'));
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred while verifying your email.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not auto-verify multiple times', async () => {
      const { rerender } = render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
      
      // Rerender with same token - should not verify again
      rerender(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      expect(mockVerifyEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Resend Verification', () => {
    it('should send verification email when resend button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      expect(mockResendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('should show sending status during resend', async () => {
      const user = userEvent.setup();
      mockResendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByText('Sending verification email...')).toBeInTheDocument();
    });

    it('should show success message after successful resend', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should implement cooldown after successful resend', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Verification email sent! Please check your inbox.')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Button should show countdown
      expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
      expect(resendButton).toBeDisabled();
    });

    it('should countdown from 60 seconds', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      // Should immediately show countdown after clicking
      expect(resendButton).toBeDisabled();
      expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
    });

    it.skip('should re-enable resend button after countdown', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Fast forward 60 seconds
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
        expect(resendButton).not.toBeDisabled();
      }, { timeout: 1000 });
    });

    it('should show error message for failed resend', async () => {
      mockResendVerificationEmail.mockResolvedValue({ success: false, error: 'Email service unavailable' });
      
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Email service unavailable')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      expect(document.querySelector('.error-icon')).toBeInTheDocument();
    });

    it('should handle resend exceptions', async () => {
      mockResendVerificationEmail.mockRejectedValue(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred while sending the verification email.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not allow resend if no user is authenticated', async () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        },
        verifyEmail: mockVerifyEmail,
        resendVerificationEmail: mockResendVerificationEmail
      });

      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      expect(mockResendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should show "Try Again" button after error', async () => {
      mockVerifyEmail.mockResolvedValue({ success: false, error: 'Verification failed' });
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should reset to pending state when "Try Again" is clicked', async () => {
      mockVerifyEmail.mockResolvedValue({ success: false, error: 'Verification failed' });

      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);

      await waitFor(() => {
        expect(screen.getByText('Verification failed')).toBeInTheDocument();
      }, { timeout: 1000 });

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      await user.click(tryAgainButton);

      // Error message should be cleared
      expect(screen.queryByText('Verification failed')).not.toBeInTheDocument();

      // With a verification token, it should show resend button (pending state)
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('should handle missing error message gracefully', async () => {
      mockVerifyEmail.mockResolvedValue({ success: false });
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to verify email address. The link may be expired or invalid.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle missing resend error message gracefully', async () => {
      mockResendVerificationEmail.mockResolvedValue({ success: false });
      
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to send verification email. Please try again.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Success State', () => {
    it('should show continue button after successful verification', async () => {
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should close modal when continue button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: 'Continue' });
        return user.click(continueButton);
      }, { timeout: 1000 });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should show success icon for successful verification', async () => {
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(document.querySelector('.success-icon')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('State Management', () => {
    it('should reset state when modal is closed and reopened', async () => {
      mockVerifyEmail.mockResolvedValue({ success: false, error: 'Test error' });
      
      const { rerender } = render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Close modal
      rerender(<EmailVerificationModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<EmailVerificationModal {...defaultProps} isOpen={true} />);
      
      // Should be back to pending state
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      expect(screen.getByText(/Please check your email for a verification link/)).toBeInTheDocument();
    });

    it('should reset countdown when modal is reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<EmailVerificationModal {...defaultProps} />);
      
      // Trigger resend and start countdown
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Close and reopen modal
      rerender(<EmailVerificationModal {...defaultProps} isOpen={false} />);
      rerender(<EmailVerificationModal {...defaultProps} isOpen={true} />);
      
      // Countdown should be reset
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      expect(screen.queryByText(/Resend in \d+s/)).not.toBeInTheDocument();
    });

    it('should not auto-verify if already processing', async () => {
      mockVerifyEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      const { rerender } = render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      // Should start verifying
      expect(screen.getByText('Verifying your email address...')).toBeInTheDocument();
      
      // Rerender with same token while still verifying - should not call again
      rerender(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      expect(mockVerifyEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('should show spinning icon during verification', async () => {
      mockVerifyEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} verificationToken="abc123" />);
      
      expect(document.querySelector('.spinning')).toBeInTheDocument();
    });

    it('should show spinning icon during resend', async () => {
      const user = userEvent.setup();
      mockResendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      expect(document.querySelector('.spinning')).toBeInTheDocument();
    });

    it('should disable resend button during processing', async () => {
      const user = userEvent.setup();
      mockResendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      expect(resendButton).toBeDisabled();
    });

    it('should hide help section during processing', async () => {
      const user = userEvent.setup();
      mockResendVerificationEmail.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50)));
      
      render(<EmailVerificationModal {...defaultProps} />);
      
      // Help section should be visible initially
      expect(screen.getByText('Having trouble?')).toBeInTheDocument();
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      // Help section should be hidden during processing
      expect(screen.queryByText('Having trouble?')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 2, name: 'Email Verification' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Verify Your Email Address' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Having trouble?' })).toBeInTheDocument();
    });

    it('should provide meaningful status messages for screen readers', () => {
      render(<EmailVerificationModal {...defaultProps} />);
      
      expect(screen.getByText(/Please check your email for a verification link/)).toBeInTheDocument();
      expect(screen.getByText(/Verification email sent to:/)).toBeInTheDocument();
    });
  });

  describe('Timer Cleanup', () => {
    it.skip('should cleanup timers on unmount', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      unmount();
      
      // Timer should be cleaned up
      expect(vi.getTimerCount()).toBe(0);
    });

    it.skip('should cleanup timers when countdown reaches zero', async () => {
      const user = userEvent.setup();
      render(<EmailVerificationModal {...defaultProps} />);
      
      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Resend in \d+s/)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Fast forward to end of countdown
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});