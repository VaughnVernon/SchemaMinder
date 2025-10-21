import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HierarchyItemBase } from '../../../src/components/hierarchy/HierarchyItemBase';
import { Box } from 'lucide-react';

const mockMenuItems = [
  {
    icon: <Box size={16} />,
    label: 'Test Action',
    onClick: vi.fn()
  }
];

describe('HierarchyItemBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render basic item with label', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        icon={<Box size={16} data-testid="test-icon" />}
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should apply correct margin based on level', () => {
    render(
      <HierarchyItemBase
        level={2}
        label="Test Item"
      />
    );

    const textElement = document.querySelector('.hierarchy-item-text') as HTMLElement;
    expect(textElement.style.marginLeft).toBe('40px'); // 2 * 20px
  });

  it('should show selected state', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        isSelected={true}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('selected');
  });

  it('should show expanded state', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        isExpanded={true}
        hasChildren={true}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('expandable');
    expect(item).toHaveClass('expanded');
  });

  it('should render children when expanded', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        isExpanded={true}
      >
        <div data-testid="child-content">Child Content</div>
      </HierarchyItemBase>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should not render children when collapsed', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        isExpanded={false}
      >
        <div data-testid="child-content">Child Content</div>
      </HierarchyItemBase>
    );

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        onClick={mockClick}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    await user.click(item!);

    expect(mockClick).toHaveBeenCalled();
  });

  it('should handle context menu events', async () => {
    const mockContextMenu = vi.fn();
    const user = userEvent.setup();
    
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        onContextMenu={mockContextMenu}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    await user.pointer({ keys: '[MouseRight]', target: item });

    expect(mockContextMenu).toHaveBeenCalled();
  });

  it('should render dropdown menu when menu items provided', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        menuItems={mockMenuItems}
      />
    );

    const dropdown = document.querySelector('.dropdown-trigger');
    expect(dropdown).toBeInTheDocument();
  });

  it('should not render dropdown when no menu items', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
      />
    );

    const dropdown = document.querySelector('.dropdown-trigger');
    expect(dropdown).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <HierarchyItemBase
        level={0}
        label="Test Item"
        className="custom-class"
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('custom-class');
  });
});