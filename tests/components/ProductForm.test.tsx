import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductForm } from '../../src/components/ProductForm';
import { DialogMode } from '../../src/types/dialogMode';
import { Product } from '../../src/types/schema';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Box: ({ size }: { size: number }) => (
    <div data-testid="box-icon" data-size={size}>Box</div>
  )
}));

const mockProduct: Product = {
  id: 'product-1',
  name: 'Test Product',
  description: 'Test product description',
  domains: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const defaultProps = {
  mode: DialogMode.New,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

describe('ProductForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering - New Mode', () => {
    it('should render new product form with correct title and button text', () => {
      render(<ProductForm {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('New Product');
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByTestId('box-icon')).toHaveAttribute('data-size', '20');
    });

    it('should render form fields with correct labels and placeholders', () => {
      render(<ProductForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Product Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');

      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('placeholder', 'Enter product name');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('id', 'product-name');

      expect(descriptionTextarea).toBeInTheDocument();
      expect(descriptionTextarea).toHaveAttribute('placeholder', 'Enter optional product description');
      expect(descriptionTextarea).toHaveAttribute('rows', '2');
      expect(descriptionTextarea).toHaveAttribute('id', 'product-description');
      expect(descriptionTextarea).not.toHaveAttribute('required');
    });

    it('should have empty form fields in new mode', () => {
      render(<ProductForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Product Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');
    });

    it('should have correct CSS classes', () => {
      render(<ProductForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toHaveClass('form');

      const submitButton = screen.getByRole('button', { name: 'Create' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(submitButton).toHaveClass('button');
      expect(cancelButton).toHaveClass('button', 'secondary');

      const formGroups = document.querySelectorAll('.form-group');
      expect(formGroups).toHaveLength(2);
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit product form with correct title and button text', () => {
      render(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={mockProduct} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Edit Product');
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should populate form fields with product data in edit mode', () => {
      render(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={mockProduct} />);

      const nameInput = screen.getByLabelText('Product Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Test Product');
      expect(descriptionTextarea.value).toBe('Test product description');
    });

    it('should handle product with no description in edit mode', () => {
      const productWithoutDescription = { ...mockProduct, description: undefined };
      render(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={productWithoutDescription} />);

      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe('');
    });

    it('should handle product with null description in edit mode', () => {
      const productWithNullDescription = { ...mockProduct, description: null as any };
      render(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={productWithNullDescription} />);

      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('should update name input value when typing', async () => {
      render(<ProductForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Product Name:') as HTMLInputElement;
      await user.type(nameInput, 'New Product Name');

      expect(nameInput.value).toBe('New Product Name');
    });

    it('should update description textarea value when typing', async () => {
      render(<ProductForm {...defaultProps} />);

      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;
      await user.type(descriptionTextarea, 'New product description');

      expect(descriptionTextarea.value).toBe('New product description');
    });

    it('should clear form fields when switching from edit to new mode', () => {
      const { rerender } = render(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={mockProduct} />);

      const nameInput = screen.getByLabelText('Product Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Test Product');
      expect(descriptionTextarea.value).toBe('Test product description');

      rerender(<ProductForm {...defaultProps} mode={DialogMode.New} />);

      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');
    });

    it('should populate fields when switching from new to edit mode', () => {
      const { rerender } = render(<ProductForm {...defaultProps} mode={DialogMode.New} />);

      const nameInput = screen.getByLabelText('Product Name:') as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('Description:') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');

      rerender(<ProductForm {...defaultProps} mode={DialogMode.Edit} product={mockProduct} />);

      expect(nameInput.value).toBe('Test Product');
      expect(descriptionTextarea.value).toBe('Test product description');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with trimmed values when form is submitted', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, '  Test Product  ');
      await user.type(descriptionTextarea, '  Test description  ');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        description: 'Test description'
      });
    });

    it('should call onSubmit without description when description is empty', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, 'Test Product');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        description: undefined
      });
    });

    it('should call onSubmit without description when description is whitespace only', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, 'Test Product');
      await user.type(descriptionTextarea, '   ');
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        description: undefined
      });
    });

    it('should not call onSubmit when name is empty', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'Create' });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when name is whitespace only', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      const submitButton = screen.getByRole('button', { name: 'Create' });

      await user.type(nameInput, '   ');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should prevent default form submission', () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const form = screen.getByRole('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      render(<ProductForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should have correct button type for cancel button', () => {
      render(<ProductForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should call onSubmit when Ctrl+S is pressed with valid name', async () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      await user.type(nameInput, 'Test Product');

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        description: undefined
      });
    });

    it('should not call onSubmit when Ctrl+S is pressed with empty name', () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', () => {
      const onCancel = vi.fn();
      render(<ProductForm {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should prevent default for Ctrl+S', () => {
      const onSubmit = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Product Name:');
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default for Escape', () => {
      const onCancel = vi.fn();
      render(<ProductForm {...defaultProps} onCancel={onCancel} />);

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not respond to other keyboard combinations', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      render(<ProductForm {...defaultProps} onSubmit={onSubmit} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 's', altKey: true });
      fireEvent.keyDown(document, { key: 's', shiftKey: true });
      fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<ProductForm {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should update event listener when dependencies change', () => {
      const onSubmit1 = vi.fn();
      const onSubmit2 = vi.fn();

      const { rerender } = render(<ProductForm {...defaultProps} onSubmit={onSubmit1} />);

      const nameInput = screen.getByLabelText('Product Name:');
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      expect(onSubmit1).toHaveBeenCalledTimes(1);

      rerender(<ProductForm {...defaultProps} onSubmit={onSubmit2} />);

      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
      expect(onSubmit2).toHaveBeenCalledTimes(1);
      expect(onSubmit1).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ProductForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();

      const nameInput = screen.getByRole('textbox', { name: 'Product Name:' });
      const descriptionTextarea = screen.getByRole('textbox', { name: 'Description:' });

      expect(nameInput).toBeInTheDocument();
      expect(descriptionTextarea).toBeInTheDocument();
    });

    it('should have proper label associations', () => {
      render(<ProductForm {...defaultProps} />);

      const nameLabel = screen.getByText('Product Name:');
      const descriptionLabel = screen.getByText('Description:');
      const nameInput = screen.getByLabelText('Product Name:');
      const descriptionTextarea = screen.getByLabelText('Description:');

      expect(nameLabel).toHaveAttribute('for', 'product-name');
      expect(descriptionLabel).toHaveAttribute('for', 'product-description');
      expect(nameInput).toHaveAttribute('id', 'product-name');
      expect(descriptionTextarea).toHaveAttribute('id', 'product-description');
    });

    it('should have proper button types', () => {
      render(<ProductForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Create' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});