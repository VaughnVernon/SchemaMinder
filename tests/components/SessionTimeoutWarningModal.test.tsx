import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimeoutWarningModal } from '../../src/components/SessionTimeoutWarningModal';

describe('SessionTimeoutWarningModal', () => {
  const user = userEvent.setup();
  const mockOnExtendSession = vi.fn();
  const mockOnLogout = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      timeRemaining: 300, // 5 minutes
      onExtendSession: mockOnExtendSession,
      onLogout: mockOnLogout,
      onClose: mockOnClose,
      ...props
    };
    return render(<SessionTimeoutWarningModal {...defaultProps} />);
  };

  describe('Component Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SessionTimeoutWarningModal
          isOpen={false}
          timeRemaining={300}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderModal();

      expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('Your session will expire in')).toBeInTheDocument();
      expect(screen.getByText(/For your security, you will be automatically logged out due to inactivity/)).toBeInTheDocument();
      expect(screen.getByText(/Would you like to extend your session/)).toBeInTheDocument();
      expect(screen.getByText('Stay Logged In')).toBeInTheDocument();
      expect(screen.getByText('Logout Now')).toBeInTheDocument();
    });

    it('should display warning icon', () => {
      renderModal();

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should have correct CSS classes', () => {
      renderModal();

      expect(document.querySelector('.modal-overlay.session-timeout-overlay')).toBeInTheDocument();
      expect(document.querySelector('.modal-content.session-timeout-modal')).toBeInTheDocument();
      expect(document.querySelector('.session-warning-content')).toBeInTheDocument();
      expect(document.querySelector('.session-timeout-actions')).toBeInTheDocument();
    });
  });

  describe('Time Display and Formatting', () => {
    it('should display initial time correctly (5 minutes)', () => {
      renderModal({ timeRemaining: 300 });

      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should display time correctly for 1 minute 30 seconds', () => {
      renderModal({ timeRemaining: 90 });

      expect(screen.getByText('1:30')).toBeInTheDocument();
    });

    it('should display time correctly for less than 1 minute', () => {
      renderModal({ timeRemaining: 45 });

      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should display time correctly for single digit seconds', () => {
      renderModal({ timeRemaining: 65 });

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should display 0:00 when time is zero', () => {
      renderModal({ timeRemaining: 0 });

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle large time values correctly', () => {
      renderModal({ timeRemaining: 3661 }); // 1 hour, 1 minute, 1 second

      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });

  describe('Countdown Timer Functionality', () => {
    it('should countdown from initial time', async () => {
      renderModal({ timeRemaining: 3 });

      expect(screen.getByText('0:03')).toBeInTheDocument();

      // Wait for countdown
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(screen.getByText('0:02')).toBeInTheDocument();

      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(screen.getByText('0:01')).toBeInTheDocument();
    });

    it('should call onLogout when countdown reaches zero', async () => {
      renderModal({ timeRemaining: 1 });

      expect(screen.getByText('0:01')).toBeInTheDocument();

      // Wait for countdown to complete
      await new Promise(resolve => setTimeout(resolve, 1100));

      await waitFor(() => {
        expect(mockOnLogout).toHaveBeenCalledTimes(1);
      });
    });

    it('should stop countdown when component unmounts', async () => {
      const { unmount } = renderModal({ timeRemaining: 5 });

      expect(screen.getByText('0:05')).toBeInTheDocument();

      unmount();

      // Wait and verify countdown doesn't continue
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(mockOnLogout).not.toHaveBeenCalled();
    });

    it('should reset countdown when timeRemaining prop changes', async () => {
      const { rerender } = renderModal({ timeRemaining: 5 });

      expect(screen.getByText('0:05')).toBeInTheDocument();

      // Wait for one tick
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(screen.getByText('0:04')).toBeInTheDocument();

      // Change the timeRemaining prop
      rerender(
        <SessionTimeoutWarningModal
          isOpen={true}
          timeRemaining={10}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();
    });

    it('should not start countdown when isOpen is false', async () => {
      renderModal({ isOpen: false, timeRemaining: 3 });

      // Wait for potential countdown
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockOnLogout).not.toHaveBeenCalled();
    });

    it('should not start countdown when timeRemaining is zero or negative', async () => {
      renderModal({ timeRemaining: 0 });

      // Wait for potential countdown
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockOnLogout).not.toHaveBeenCalled();
    });
  });

  describe('Button Interactions', () => {
    it('should call onExtendSession and onClose when Stay Logged In is clicked', async () => {
      renderModal();

      const stayLoggedInButton = screen.getByText('Stay Logged In');
      await user.click(stayLoggedInButton);

      expect(mockOnExtendSession).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onLogout and onClose when Logout Now is clicked', async () => {
      renderModal();

      const logoutButton = screen.getByText('Logout Now');
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button (X) is clicked', async () => {
      renderModal();

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnExtendSession).not.toHaveBeenCalled();
      expect(mockOnLogout).not.toHaveBeenCalled();
    });

    it('should have correct button types', () => {
      renderModal();

      const stayLoggedInButton = screen.getByText('Stay Logged In');
      const logoutButton = screen.getByText('Logout Now');
      const closeButton = screen.getByLabelText('Close');

      expect(stayLoggedInButton).toHaveAttribute('type', 'button');
      expect(logoutButton).toHaveAttribute('type', 'button');
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should have correct CSS classes for buttons', () => {
      renderModal();

      const stayLoggedInButton = screen.getByText('Stay Logged In');
      const logoutButton = screen.getByText('Logout Now');

      expect(stayLoggedInButton).toHaveClass('button', 'primary');
      expect(logoutButton).toHaveClass('button', 'secondary');
    });

    it('should call onExtendSession before onClose', async () => {
      const callOrder: string[] = [];
      const mockOnExtend = vi.fn(() => callOrder.push('extend'));
      const mockOnCloseOrder = vi.fn(() => callOrder.push('close'));

      renderModal({
        onExtendSession: mockOnExtend,
        onClose: mockOnCloseOrder
      });

      const stayLoggedInButton = screen.getByText('Stay Logged In');
      await user.click(stayLoggedInButton);

      expect(callOrder).toEqual(['extend', 'close']);
    });

    it('should call onLogout before onClose', async () => {
      const callOrder: string[] = [];
      const mockOnLogoutOrder = vi.fn(() => callOrder.push('logout'));
      const mockOnCloseOrder = vi.fn(() => callOrder.push('close'));

      renderModal({
        onLogout: mockOnLogoutOrder,
        onClose: mockOnCloseOrder
      });

      const logoutButton = screen.getByText('Logout Now');
      await user.click(logoutButton);

      expect(callOrder).toEqual(['logout', 'close']);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', () => {
      renderModal();

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('should have proper heading structure', () => {
      renderModal();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Session Expiring Soon');
    });

    it('should have proper button roles', () => {
      renderModal();

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3); // Stay Logged In, Logout Now, Close
    });

    it('should have meaningful button text', () => {
      renderModal();

      expect(screen.getByRole('button', { name: 'Stay Logged In' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout Now' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative timeRemaining gracefully', () => {
      renderModal({ timeRemaining: -10 });

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle very large timeRemaining values', () => {
      renderModal({ timeRemaining: 999999 });

      expect(screen.getByText('16666:39')).toBeInTheDocument();
    });

    it('should handle callback functions being undefined', async () => {
      const { rerender } = renderModal();

      rerender(
        <SessionTimeoutWarningModal
          isOpen={true}
          timeRemaining={300}
          onExtendSession={undefined as any}
          onLogout={undefined as any}
          onClose={undefined as any}
        />
      );

      const stayLoggedInButton = screen.getByText('Stay Logged In');
      const logoutButton = screen.getByText('Logout Now');

      // Should not throw errors
      await user.click(stayLoggedInButton);
      await user.click(logoutButton);
    });

    it('should clear timer when modal is closed and reopened', async () => {
      const { rerender } = renderModal({ timeRemaining: 5 });

      expect(screen.getByText('0:05')).toBeInTheDocument();

      // Close modal
      rerender(
        <SessionTimeoutWarningModal
          isOpen={false}
          timeRemaining={5}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
          onClose={mockOnClose}
        />
      );

      // Wait for potential countdown
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Reopen modal with new time
      rerender(
        <SessionTimeoutWarningModal
          isOpen={true}
          timeRemaining={10}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();
      expect(mockOnLogout).not.toHaveBeenCalled();
    });

    it('should handle rapid prop changes without memory leaks', async () => {
      const { rerender } = renderModal({ timeRemaining: 5 });

      // Rapidly change props
      for (let i = 0; i < 5; i++) {
        rerender(
          <SessionTimeoutWarningModal
            isOpen={true}
            timeRemaining={i + 1}
            onExtendSession={mockOnExtendSession}
            onLogout={mockOnLogout}
            onClose={mockOnClose}
          />
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should show the latest value
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should not leak timers on unmount', async () => {
      const { unmount } = renderModal({ timeRemaining: 10 });

      expect(screen.getByText('0:10')).toBeInTheDocument();

      unmount();

      // Wait longer than countdown would take
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should not have called onLogout
      expect(mockOnLogout).not.toHaveBeenCalled();
    });

    it('should handle multiple instances without interference', async () => {
      const mockOnLogout1 = vi.fn();
      const mockOnLogout2 = vi.fn();

      const { container: container1 } = render(
        <SessionTimeoutWarningModal
          isOpen={true}
          timeRemaining={2}
          onExtendSession={vi.fn()}
          onLogout={mockOnLogout1}
          onClose={vi.fn()}
        />
      );

      const { container: container2 } = render(
        <SessionTimeoutWarningModal
          isOpen={true}
          timeRemaining={3}
          onExtendSession={vi.fn()}
          onLogout={mockOnLogout2}
          onClose={vi.fn()}
        />
      );

      // Wait for first timer to complete
      await new Promise(resolve => setTimeout(resolve, 2100));

      await waitFor(() => {
        expect(mockOnLogout1).toHaveBeenCalledTimes(1);
      });

      // Second timer should still be running
      expect(mockOnLogout2).not.toHaveBeenCalled();

      // Wait for second timer
      await new Promise(resolve => setTimeout(resolve, 1000));

      await waitFor(() => {
        expect(mockOnLogout2).toHaveBeenCalledTimes(1);
      });
    });
  });
});