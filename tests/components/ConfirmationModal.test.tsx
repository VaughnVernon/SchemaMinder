/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ConfirmationModal } from '../../src/components/ConfirmationModal';

const defaultProps = {
  isOpen: true,
  title: 'Confirm Action',
  description: 'Are you sure you want to proceed with this action?',
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
  onConfirm: vi.fn(),
  onClose: vi.fn()
};

describe('ConfirmationModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      
      expect(document.querySelector('.find-modal-overlay')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
    });

    it('should render title, description, and buttons with correct text', () => {
      const customProps = {
        ...defaultProps,
        title: 'Delete Item',
        description: 'This action cannot be undone. Are you sure?',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Keep'
      };
      
      render(<ConfirmationModal {...customProps} />);
      
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone. Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });

    it('should render with custom styling', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const modal = document.querySelector('.find-modal') as HTMLElement;
      expect(modal).toHaveStyle({
        width: 'auto',
        minWidth: '300px',
        padding: '20px'
      });
    });

    it('should auto-focus the confirm button', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveFocus();
    });
  });

  describe('Button Interactions', () => {
    it('should call onConfirm with true and onClose when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with false and onClose when cancel button is clicked', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should work with custom button text', async () => {
      const onConfirm = vi.fn();
      const customProps = {
        ...defaultProps,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'No, Keep',
        onConfirm
      };
      
      render(<ConfirmationModal {...customProps} />);
      
      const confirmButton = screen.getByText('Yes, Delete');
      const cancelButton = screen.getByText('No, Keep');
      
      await user.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledWith(true);
      
      vi.clearAllMocks();
      await user.click(cancelButton);
      expect(onConfirm).toHaveBeenCalledWith(false);
    });
  });

  describe('Keyboard Events', () => {
    it('should call onConfirm with true and onClose when Enter key is pressed', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(onConfirm).toHaveBeenCalledWith(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with false and onClose when Escape key is pressed', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on Enter and Escape keys', () => {
      const preventDefaultSpy = vi.spyOn(Event.prototype, 'preventDefault');
      
      render(<ConfirmationModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(preventDefaultSpy).toHaveBeenCalledTimes(2);
      
      preventDefaultSpy.mockRestore();
    });

    it('should not respond to keyboard events when modal is closed', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} isOpen={false} onConfirm={onConfirm} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    it('should call onConfirm with false and onClose when overlay is clicked', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const overlay = document.querySelector('.find-modal-overlay');
      await user.click(overlay!);
      
      expect(onConfirm).toHaveBeenCalledWith(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when modal content is clicked', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const modal = document.querySelector('.find-modal');
      await user.click(modal!);
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking on title or description', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const title = screen.getByText('Confirm Action');
      const description = screen.getByText('Are you sure you want to proceed with this action?');
      
      await user.click(title);
      await user.click(description);
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<ConfirmationModal {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should manage event listeners based on isOpen state', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      rerender(<ConfirmationModal {...defaultProps} isOpen={true} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      rerender(<ConfirmationModal {...defaultProps} isOpen={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('CSS Structure and Styling', () => {
    it('should have correct CSS classes', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
    });

    it('should have correct button classes', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toHaveClass('button');
      expect(cancelButton).toHaveClass('button', 'secondary');
    });

    it('should have correct title styling', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const title = screen.getByText('Confirm Action');
      
      expect(title.tagName).toBe('H3');
      expect(title.style.margin).toBe('0px 0px 16px 0px');
      expect(title.style.fontSize).toBe('18px');
      expect(title.style.fontWeight).toBe('600');
    });

    it('should have correct description styling', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const description = screen.getByText('Are you sure you want to proceed with this action?');
      
      expect(description.tagName).toBe('P');
      expect(description.style.margin).toBe('0px 0px 24px 0px');
      expect(description.style.fontSize).toBe('14px');
      expect(description.style.lineHeight).toBe('1.5');
      expect(description.style.color).toBe('rgb(102, 102, 102)');
    });

    it('should have correct button container styling', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const buttonContainer = document.querySelector('div[style*="display: flex"]') as HTMLElement;
      
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer.style.display).toBe('flex');
      expect(buttonContainer.style.justifyContent).toBe('flex-end');
      expect(buttonContainer.style.gap).toBe('12px');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('should focus confirm button by default', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveFocus();
    });

    it('should have appropriate heading structure', () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Confirm Action');
    });

    it('should be keyboard navigable', async () => {
      render(<ConfirmationModal {...defaultProps} />);
      
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toHaveFocus();
      
      // Test that buttons are tabbable
      expect(confirmButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
      
      // Focus the cancel button manually to test tab order exists
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
      
      // Focus back to confirm button
      confirmButton.focus();
      expect(confirmButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings for title and description', () => {
      render(<ConfirmationModal {...defaultProps} title="" description="" />);
      
      const title = screen.getByRole('heading', { level: 3 });
      const description = document.querySelector('p');
      
      expect(title).toHaveTextContent('');
      expect(description).toHaveTextContent('');
    });

    it('should handle long text content', () => {
      const longTitle = 'This is a very long title that should still render correctly even when it contains a lot of text';
      const longDescription = 'This is a very long description that should wrap properly and maintain good readability even when it contains multiple sentences and a lot of text content that users might need to read carefully before making their decision.';
      
      render(<ConfirmationModal {...defaultProps} title={longTitle} description={longDescription} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      const specialTitle = 'Confirm "Delete" Action & Continue?';
      const specialDescription = 'This will delete <important> data & can\'t be undone!';
      
      render(<ConfirmationModal {...defaultProps} title={specialTitle} description={specialDescription} />);
      
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
      expect(screen.getByText(specialDescription)).toBeInTheDocument();
    });

    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      
      for (let i = 0; i < 5; i++) {
        rerender(<ConfirmationModal {...defaultProps} isOpen={true} />);
        rerender(<ConfirmationModal {...defaultProps} isOpen={false} />);
      }
      
      expect(document.querySelector('.find-modal-overlay')).not.toBeInTheDocument();
    });

    it('should handle concurrent button clicks', async () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
      
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      
      // Rapid clicks should only trigger once each
      await user.click(confirmButton);
      await user.click(cancelButton);
      
      // onConfirm should be called twice (once true, once false)
      expect(onConfirm).toHaveBeenCalledTimes(2);
      expect(onConfirm).toHaveBeenNthCalledWith(1, true);
      expect(onConfirm).toHaveBeenNthCalledWith(2, false);
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});