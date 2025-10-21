import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContextForm } from '../../src/components/ContextForm';
import { DialogMode } from '../../src/types/dialogMode';
import { Context } from '../../src/types/schema';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Circle: ({ size }: { size: number }) => (
    <div data-testid="circle-icon" data-size={size}>Circle</div>
  )
}));

const mockContext: Context = {
  id: 'context-123',
  name: 'Test Context',
  description: 'Test context description',
  domainId: 'domain-456',
  schemas: [],
  createdAt: '2023-12-01T10:00:00.000Z',
  updatedAt: '2023-12-01T11:00:00.000Z'
};

const defaultNewProps = {
  mode: DialogMode.New,
  domainId: 'domain-456',
  domainName: 'Test Domain',
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

const defaultEditProps = {
  mode: DialogMode.Edit,
  context: mockContext,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

describe('ContextForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering - New Mode', () => {
    it('should render new context form with correct title', () => {
      render(<ContextForm {...defaultNewProps} />);

      expect(screen.getByText('New Context')).toBeInTheDocument();
      expect(screen.getByTestId('circle-icon')).toHaveAttribute('data-size', '20');
    });

    it('should display domain name in new mode', () => {
      render(<ContextForm {...defaultNewProps} />);

      expect(screen.getByText('Domain:')).toBeInTheDocument();
      expect(screen.getByText('Test Domain')).toBeInTheDocument();
    });

    it('should render empty form fields in new mode', () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');

      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });

    it('should render Create button in new mode', () => {
      render(<ContextForm {...defaultNewProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not display domain name when not provided', () => {
      render(<ContextForm {...defaultNewProps} domainName={undefined} />);

      expect(screen.queryByText('Domain:')).not.toBeInTheDocument();
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit context form with correct title', () => {
      render(<ContextForm {...defaultEditProps} />);

      expect(screen.getByText('Edit Context')).toBeInTheDocument();
      expect(screen.getByTestId('circle-icon')).toHaveAttribute('data-size', '20');
    });

    it('should populate form fields with context data in edit mode', () => {
      render(<ContextForm {...defaultEditProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');

      expect(nameInput).toHaveValue('Test Context');
      expect(descriptionInput).toHaveValue('Test context description');
    });

    it('should render Save button in edit mode', () => {
      render(<ContextForm {...defaultEditProps} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not display domain name in edit mode', () => {
      render(<ContextForm {...defaultEditProps} />);

      expect(screen.queryByText('Domain:')).not.toBeInTheDocument();
    });

    it('should handle context without description in edit mode', () => {
      const contextWithoutDescription = { ...mockContext, description: undefined };
      render(<ContextForm {...defaultEditProps} context={contextWithoutDescription} />);

      const descriptionInput = screen.getByLabelText('Description:');
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Form Structure', () => {
    it('should have proper form structure', () => {
      render(<ContextForm {...defaultNewProps} />);

      const form = document.querySelector('form.form');
      expect(form).toBeInTheDocument();

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');

      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('id', 'context-name');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('placeholder', 'Enter context name');

      expect(descriptionTextarea.tagName).toBe('TEXTAREA');
      expect(descriptionTextarea).toHaveAttribute('id', 'context-description');
      expect(descriptionTextarea).toHaveAttribute('placeholder', 'Enter optional context description');
      expect(descriptionTextarea).toHaveAttribute('rows', '2');
    });

    it('should have correct button types', () => {
      render(<ContextForm {...defaultNewProps} />);

      const submitButton = screen.getByText('Create');
      const cancelButton = screen.getByText('Cancel');

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
      expect(submitButton).toHaveClass('button');
      expect(cancelButton).toHaveClass('button', 'secondary');
    });
  });

  describe('User Interactions', () => {
    it('should update name field when typing', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      await user.type(nameInput, 'New Context Name');

      expect(nameInput).toHaveValue('New Context Name');
    });

    it('should update description field when typing', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const descriptionInput = screen.getByLabelText('Description:');
      await user.type(descriptionInput, 'New context description');

      expect(descriptionInput).toHaveValue('New context description');
    });

    it('should clear form fields when switching from edit to new mode', () => {
      const { rerender } = render(<ContextForm {...defaultEditProps} />);

      // Initially populated with edit data
      expect(screen.getByLabelText('Context Name:')).toHaveValue('Test Context');

      // Switch to new mode
      rerender(<ContextForm {...defaultNewProps} />);

      expect(screen.getByLabelText('Context Name:')).toHaveValue('');
      expect(screen.getByLabelText('Description:')).toHaveValue('');
    });

    it('should populate fields when switching from new to edit mode', () => {
      const { rerender } = render(<ContextForm {...defaultNewProps} />);

      // Initially empty
      expect(screen.getByLabelText('Context Name:')).toHaveValue('');

      // Switch to edit mode
      rerender(<ContextForm {...defaultEditProps} />);

      expect(screen.getByLabelText('Context Name:')).toHaveValue('Test Context');
      expect(screen.getByLabelText('Description:')).toHaveValue('Test context description');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'New Context');
      await user.type(descriptionInput, 'Context description');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'New Context',
        namespace: undefined,
        description: 'Context description'
      });
    });

    it('should call onSubmit without description when empty', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, 'New Context');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'New Context',
        namespace: undefined,
        description: undefined
      });
    });

    it('should trim whitespace from name and description', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, '  Trimmed Name  ');
      await user.type(descriptionInput, '  Trimmed Description  ');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        namespace: undefined,
        description: 'Trimmed Description'
      });
    });

    it('should not call onSubmit when name is empty', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when name is only whitespace', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const submitButton = screen.getByText('Create');

      await user.type(nameInput, '   ');
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should handle form submission via Enter key', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      await user.type(nameInput, 'New Context');

      const form = document.querySelector('form.form');
      fireEvent.submit(form!);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'New Context',
        namespace: undefined,
        description: undefined
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form when Ctrl+S is pressed with valid data', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      await user.type(nameInput, 'Keyboard Context');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'Keyboard Context',
        namespace: undefined,
        description: undefined
      });
    });

    it('should not submit form when Ctrl+S is pressed with empty name', async () => {
      render(<ContextForm {...defaultNewProps} />);

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(defaultNewProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', async () => {
      render(<ContextForm {...defaultNewProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(defaultNewProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior for Ctrl+S', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      await user.type(nameInput, 'Test Context');

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        cancelable: true
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should prevent default behavior for Escape', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should handle Ctrl+S with description', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');

      await user.type(nameInput, 'Shortcut Context');
      await user.type(descriptionInput, 'Shortcut description');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: 'Shortcut Context',
        namespace: undefined,
        description: 'Shortcut description'
      });
    });
  });

  describe('Event Listener Management', () => {
    it('should add keydown event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      render(<ContextForm {...defaultNewProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keydown event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<ContextForm {...defaultNewProps} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should update event listeners when dependencies change', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = render(<ContextForm {...defaultNewProps} />);

      const initialCalls = addEventListenerSpy.mock.calls.length;

      // Change props to trigger useEffect dependency change
      const newProps = { ...defaultNewProps, onSubmit: vi.fn() };
      rerender(<ContextForm {...newProps} />);

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined context in edit mode', () => {
      render(<ContextForm {...defaultEditProps} context={undefined} />);

      expect(screen.getByLabelText('Context Name:')).toHaveValue('');
      expect(screen.getByLabelText('Description:')).toHaveValue('');
    });

    it('should handle context with null description', () => {
      const contextWithNullDescription = { ...mockContext, description: null as any };
      render(<ContextForm {...defaultEditProps} context={contextWithNullDescription} />);

      expect(screen.getByLabelText('Description:')).toHaveValue('');
    });

    it('should handle very long names and descriptions', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const longName = 'A'.repeat(1000);
      const longDescription = 'B'.repeat(5000);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const submitButton = screen.getByText('Create');

      // Use fireEvent.change instead of userEvent.type for long strings to avoid timing issues
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.change(descriptionInput, { target: { value: longDescription } });
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: longName,
        namespace: undefined,
        description: longDescription
      });
    });

    it('should handle special characters in name and description', async () => {
      render(<ContextForm {...defaultNewProps} />);

      const specialName = 'Context & "Special" <chars>';
      const specialDescription = 'Description with émojis 🎉 and ñeẅ lines\nand tabs\t!';

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');
      const submitButton = screen.getByText('Create');

      // Use fireEvent.change for special characters to avoid potential timing issues
      fireEvent.change(nameInput, { target: { value: specialName } });
      fireEvent.change(descriptionInput, { target: { value: specialDescription } });
      await user.click(submitButton);

      expect(defaultNewProps.onSubmit).toHaveBeenCalledWith({
        name: specialName,
        namespace: undefined,
        description: specialDescription
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and associations', () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');

      expect(nameInput).toHaveAttribute('id', 'context-name');
      expect(descriptionInput).toHaveAttribute('id', 'context-description');

      const nameLabel = screen.getByText('Context Name:');
      const descriptionLabel = screen.getByText('Description:');

      expect(nameLabel).toHaveAttribute('for', 'context-name');
      expect(descriptionLabel).toHaveAttribute('for', 'context-description');
    });

    it('should have required attribute on name field', () => {
      render(<ContextForm {...defaultNewProps} />);

      const nameInput = screen.getByLabelText('Context Name:');
      const descriptionInput = screen.getByLabelText('Description:');

      expect(nameInput).toHaveAttribute('required');
      expect(descriptionInput).not.toHaveAttribute('required');
    });

    it('should have proper button roles', () => {
      render(<ContextForm {...defaultNewProps} />);

      const submitButton = screen.getByText('Create');
      const cancelButton = screen.getByText('Cancel');

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});