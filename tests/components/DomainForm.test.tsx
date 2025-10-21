import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DomainForm } from '../../src/components/DomainForm';
import { DialogMode } from '../../src/types/dialogMode';
import { Domain } from '../../src/types/schema';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Waypoints: ({ size }: { size: number }) => (
    <div data-testid="waypoints-icon" data-size={size}>Waypoints</div>
  )
}));

const mockDomain: Domain = {
  id: 'domain-1',
  name: 'Test Domain',
  description: 'Test domain description',
  productId: 'product-1',
  contexts: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const defaultProps = {
  mode: DialogMode.New,
  productId: 'product-1',
  productName: 'Test Product',
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

describe('DomainForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering - New Mode', () => {
    it('should render new domain form with correct title and button text', () => {
      render(<DomainForm {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('New Domain');
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByTestId('waypoints-icon')).toHaveAttribute('data-size', '20');
    });

    it('should render form fields with correct labels and placeholders', () => {
      render(<DomainForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Domain Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');

      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('placeholder', 'Enter domain name');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('id', 'domain-name');

      expect(descriptionTextarea).toBeInTheDocument();
      expect(descriptionTextarea).toHaveAttribute('placeholder', 'Enter optional domain description');
      expect(descriptionTextarea).toHaveAttribute('rows', '2');
      expect(descriptionTextarea).toHaveAttribute('id', 'domain-description');
      expect(descriptionTextarea).not.toHaveAttribute('required');
    });

    it('should display product name in new mode', () => {
      render(<DomainForm {...defaultProps} />);

      expect(screen.getByText('Product:')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('should have empty form fields in new mode', () => {
      render(<DomainForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Domain Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit domain form with correct title and button text', () => {
      render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={mockDomain} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Edit Domain');
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should populate form fields with domain data in edit mode', () => {
      render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={mockDomain} />);

      const nameInput = screen.getByLabelText('Domain Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Test Domain');
      expect(descriptionTextarea.value).toBe('Test domain description');
    });

    it('should not display product name in edit mode', () => {
      render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={mockDomain} />);

      expect(screen.queryByText('Product:')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
    });

    it('should handle domain with no description in edit mode', () => {
      const domainWithoutDescription = { ...mockDomain, description: undefined };
      render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={domainWithoutDescription} />);

      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('should update name input value when typing', async () => {
      render(<DomainForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Domain Name:') as HTMLInputElement;
      await user.type(nameInput, 'New Domain Name');

      expect(nameInput.value).toBe('New Domain Name');
    });

    it('should update description textarea value when typing', async () => {
      render(<DomainForm {...defaultProps} />);

      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;
      await user.type(descriptionTextarea, 'New domain description');

      expect(descriptionTextarea.value).toBe('New domain description');
    });

    it('should clear form fields when switching from edit to new mode', () => {
      const { rerender } = render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={mockDomain} />);

      const nameInput = screen.getByLabelText('Domain Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Test Domain');
      expect(descriptionTextarea.value).toBe('Test domain description');

      rerender(<DomainForm {...defaultProps} mode={DialogMode.New} />);

      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with trimmed values when form is submitted', async () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Domain Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, '  Test Domain  ');
      await user.type(descriptionTextarea, '  Test description  ');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Domain',
        description: 'Test description'
      });
    });

    it('should call onSubmit without description when description is empty', async () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Domain Name:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, 'Test Domain');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Domain',
        description: undefined
      });
    });

    it('should not call onSubmit when name is empty', async () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'Create' });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when name is whitespace only', async () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Domain Name:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, '   ');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      render(<DomainForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should call onSubmit when Ctrl+S is pressed with valid name', async () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Domain Name:');
      await user.type(nameInput, 'Test Domain');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Domain',
        description: undefined
      });
    });

    it('should not call onSubmit when Ctrl+S is pressed with empty name', () => {
      const onSubmit = vi.fn();
      render(<DomainForm {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', () => {
      const onCancel = vi.fn();
      render(<DomainForm {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSS Classes and Structure', () => {
    it('should have correct CSS structure', () => {
      render(<DomainForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toHaveClass('form');

      const submitButton = screen.getByRole('button', { name: 'Create' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(submitButton).toHaveClass('button');
      expect(cancelButton).toHaveClass('button', 'secondary');

      const formGroups = document.querySelectorAll('.form-group');
      expect(formGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<DomainForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();

      const nameInput = screen.getByRole('textbox', { name: 'Domain Name:' });
      const descriptionTextarea = screen.getByRole('textbox', { name: 'Description:' });

      expect(nameInput).toBeInTheDocument();
      expect(descriptionTextarea).toBeInTheDocument();
    });

    it('should have proper label associations', () => {
      render(<DomainForm {...defaultProps} />);

      const nameLabel = screen.getByText('Domain Name:');
      const descriptionLabel = screen.getByText('Description:');
      const nameInput = screen.getByLabelText('Domain Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');

      expect(nameLabel).toHaveAttribute('for', 'domain-name');
      expect(descriptionLabel).toHaveAttribute('for', 'domain-description');
      expect(nameInput).toHaveAttribute('id', 'domain-name');
      expect(descriptionTextarea).toHaveAttribute('id', 'domain-description');
    });

    it('should have proper button types', () => {
      render(<DomainForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Create' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<DomainForm {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Props Validation', () => {
    it('should handle new mode with required props', () => {
      render(<DomainForm {...defaultProps} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveTextContent('New Domain');
    });

    it('should handle edit mode with domain prop', () => {
      render(<DomainForm {...defaultProps} mode={DialogMode.Edit} domain={mockDomain} />);

      expect(screen.getByRole('heading')).toHaveTextContent('Edit Domain');
      expect(screen.getByDisplayValue('Test Domain')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle productName not provided in new mode', () => {
      render(<DomainForm {...defaultProps} productName={undefined} />);

      // Should still render the Product label but with empty value
      expect(screen.getByText('Product:')).toBeInTheDocument();
    });

    it('should handle productName as empty string', () => {
      render(<DomainForm {...defaultProps} productName="" />);

      expect(screen.getByText('Product:')).toBeInTheDocument();
    });
  });
});