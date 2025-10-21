import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductHierarchyItem } from '../../../src/components/hierarchy/ProductHierarchyItem';
import { Product } from '../../../src/types/schema';
import { HierarchyTreeHandlers, HierarchyTreeStateHandlers } from '../../../src/components/eventHandlers/HierarchyTreeHandlers';

// Mock data
const mockProduct: Product = {
  id: 'product-1',
  name: 'Test Product',
  domains: []
};

const mockHandlers: HierarchyTreeHandlers = {
  onItemSelect: vi.fn(),
  onEditProduct: vi.fn(),
  onCreateDomain: vi.fn(),
  onPinProduct: vi.fn()
};

const mockStateHandlers: HierarchyTreeStateHandlers = {
  toggleExpanded: vi.fn(),
  toggleAllDescendants: vi.fn(),
  setContextMenu: vi.fn()
};

describe('ProductHierarchyItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render product with correct name and icon', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    // Box icon should be present
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should show selected state when isSelected is true', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={true}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('selected');
  });

  it('should show expanded state when isExpanded is true', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={true}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('expanded');
  });

  it('should render children when expanded', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={true}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      >
        <div data-testid="child-content">Child Content</div>
      </ProductHierarchyItem>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should not render children when collapsed', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      >
        <div data-testid="child-content">Child Content</div>
      </ProductHierarchyItem>
    );

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    await user.click(item!);

    expect(mockHandlers.onItemSelect).toHaveBeenCalledWith(
      'product', 
      'product-1',
      expect.objectContaining({
        id: 'product-1',
        name: 'Test Product'
      })
    );
  });

  it('should render dropdown menu with correct items', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    // Click dropdown trigger
    const dropdownTrigger = document.querySelector('.dropdown-trigger');
    await user.click(dropdownTrigger!);

    // Check menu items
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('New Domain')).toBeInTheDocument();
    expect(screen.getByText('Pin')).toBeInTheDocument();
  });

  it('should call edit handler when Edit is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={0}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    // Click dropdown and then Edit
    const dropdownTrigger = document.querySelector('.dropdown-trigger');
    await user.click(dropdownTrigger!);
    await user.click(screen.getByText('Edit'));

    expect(mockHandlers.onEditProduct).toHaveBeenCalledWith(mockProduct);
  });

  it('should apply correct margin based on level', () => {
    render(
      <ProductHierarchyItem
        product={mockProduct}
        level={2}
        isExpanded={false}
        isSelected={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const textElement = document.querySelector('.hierarchy-item-text') as HTMLElement;
    expect(textElement.style.marginLeft).toBe('40px'); // 2 * 20px
  });
});