import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageModal, MessageType } from '../../src/components/MessageModal';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="alert-triangle-icon" data-size={size} className={className}>AlertTriangle</div>
  ),
  Info: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="info-icon" data-size={size} className={className}>Info</div>
  ),
  XCircle: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="x-circle-icon" data-size={size} className={className}>XCircle</div>
  ),
  X: ({ size }: { size: number }) => (
    <div data-testid="x-icon" data-size={size}>X</div>
  )
}));

const defaultProps = {
  isOpen: true,
  type: 'info' as MessageType,
  title: 'Test Title',
  message: 'Test message',
  onClose: vi.fn()
};

describe('MessageModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<MessageModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<MessageModal {...defaultProps} />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument(); // Default confirm text
    });

    it('should render with custom confirm text', () => {
      render(<MessageModal {...defaultProps} confirmText="Save" />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.queryByText('OK')).not.toBeInTheDocument();
    });

    it('should render cancel button when showCancel is true', () => {
      render(<MessageModal {...defaultProps} showCancel={true} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render with custom cancel text', () => {
      render(<MessageModal {...defaultProps} showCancel={true} cancelText="Dismiss" />);
      
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should render details when provided', () => {
      const details = 'Additional details about the message';
      render(<MessageModal {...defaultProps} details={details} />);
      
      expect(screen.getByText(details)).toBeInTheDocument();
      
      const detailsElement = screen.getByText(details);
      expect(detailsElement.closest('.message-modal-details')).toBeInTheDocument();
    });

    it('should not render details section when details is not provided', () => {
      render(<MessageModal {...defaultProps} />);
      
      expect(document.querySelector('.message-modal-details')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<MessageModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('message-modal-close');
    });
  });

  describe('Message Types and Icons', () => {
    it('should render info icon for info type', () => {
      render(<MessageModal {...defaultProps} type="info" />);
      
      const icon = screen.getByTestId('info-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('message-modal-icon', 'info');
      expect(icon).toHaveAttribute('data-size', '24');
    });

    it('should render warning icon for warning type', () => {
      render(<MessageModal {...defaultProps} type="warning" />);
      
      const icon = screen.getByTestId('alert-triangle-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('message-modal-icon', 'warning');
      expect(icon).toHaveAttribute('data-size', '24');
    });

    it('should render error icon for error type', () => {
      render(<MessageModal {...defaultProps} type="error" />);
      
      const icon = screen.getByTestId('x-circle-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('message-modal-icon', 'error');
      expect(icon).toHaveAttribute('data-size', '24');
    });
  });

  describe('Event Handlers', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when confirm button is clicked without onConfirm', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      const confirmButton = screen.getByText('OK');
      fireEvent.click(confirmButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is clicked with onConfirm', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} onConfirm={onConfirm} />);
      
      const confirmButton = screen.getByText('OK');
      fireEvent.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} showCancel={true} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      const overlay = document.querySelector('.message-modal-overlay');
      fireEvent.click(overlay!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      const modal = document.querySelector('.message-modal');
      fireEvent.click(modal!);
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose on Escape when modal is closed', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} isOpen={false} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should prevent default on Escape key press', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not respond to other keys', () => {
      const onClose = vi.fn();
      render(<MessageModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<MessageModal {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should not add event listener when modal is closed', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      render(<MessageModal {...defaultProps} isOpen={false} />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      addEventListenerSpy.mockRestore();
    });

    it('should handle event listener cleanup when isOpen changes', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<MessageModal {...defaultProps} isOpen={true} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      
      // Change to closed
      rerender(<MessageModal {...defaultProps} isOpen={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('CSS Classes and Structure', () => {
    it('should have correct CSS structure', () => {
      render(<MessageModal {...defaultProps} />);
      
      expect(document.querySelector('.message-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.message-modal')).toBeInTheDocument();
      expect(document.querySelector('.message-modal-header')).toBeInTheDocument();
      expect(document.querySelector('.message-modal-title')).toBeInTheDocument();
      expect(document.querySelector('.message-modal-content')).toBeInTheDocument();
      expect(document.querySelector('.message-modal-message')).toBeInTheDocument();
      expect(document.querySelector('.message-modal-actions')).toBeInTheDocument();
    });

    it('should have proper button classes', () => {
      render(<MessageModal {...defaultProps} showCancel={true} />);
      
      const confirmButton = screen.getByText('OK');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toHaveClass('button');
      expect(cancelButton).toHaveClass('button', 'secondary');
    });

    it('should have details section when details provided', () => {
      render(<MessageModal {...defaultProps} details="Test details" />);
      
      expect(document.querySelector('.message-modal-details')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<MessageModal {...defaultProps} showCancel={true} />);
      
      const confirmButton = screen.getByRole('button', { name: 'OK' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      
      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(closeButton).toBeInTheDocument();
    });

    it('should have aria-label on close button', () => {
      render(<MessageModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });

    it('should have proper button types', () => {
      render(<MessageModal {...defaultProps} showCancel={true} />);
      
      const confirmButton = screen.getByText('OK');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      render(<MessageModal {...defaultProps} title="" />);
      
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveTextContent('');
    });

    it('should handle empty message', () => {
      render(<MessageModal {...defaultProps} message="" />);
      
      const messageElement = document.querySelector('.message-modal-message');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveTextContent('');
    });

    it('should handle empty details', () => {
      render(<MessageModal {...defaultProps} details="" />);
      
      const detailsSection = document.querySelector('.message-modal-details');
      expect(detailsSection).toBeInTheDocument();
      
      const detailsText = detailsSection?.querySelector('p');
      expect(detailsText).toHaveTextContent('');
    });
  });
});