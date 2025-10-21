import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HierarchyItemActions } from '../../../src/components/hierarchy/HierarchyItemActions';
import { MenuItem } from '../../../src/components/DropdownMenu';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pin: () => <div data-testid="pin-icon">Pin</div>,
  PinOff: () => <div data-testid="pin-off-icon">PinOff</div>,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon">MoreHorizontal</div>,
  Ellipsis: () => <div data-testid="ellipsis-icon">Ellipsis</div>
}));

describe('HierarchyItemActions', () => {
  const mockMenuItems: MenuItem[] = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn() }
  ];

  it('should render nothing when no actions are provided', () => {
    const { container } = render(<HierarchyItemActions />);
    expect(container.firstChild).toBeNull();
  });

  it('should render menu items when provided', () => {
    render(<HierarchyItemActions menuItems={mockMenuItems} />);
    const dropdown = document.querySelector('.dropdown-trigger');
    expect(dropdown).toBeInTheDocument();
  });

  it('should render pin button when showPin is true and onPin is provided', () => {
    const onPin = vi.fn();
    render(
      <HierarchyItemActions 
        showPin={true} 
        onPin={onPin}
        isPinned={false}
      />
    );
    
    const pinButton = screen.getByTitle('Pin');
    expect(pinButton).toBeInTheDocument();
    expect(screen.getByTestId('pin-icon')).toBeInTheDocument();
  });

  it('should render unpin button when isPinned is true', () => {
    const onUnpin = vi.fn();
    render(
      <HierarchyItemActions 
        showPin={true} 
        onUnpin={onUnpin}
        isPinned={true}
      />
    );
    
    const unpinButton = screen.getByTitle('Unpin');
    expect(unpinButton).toBeInTheDocument();
    expect(screen.getByTestId('pin-off-icon')).toBeInTheDocument();
  });

  it('should call onPin when pin button is clicked', () => {
    const onPin = vi.fn();
    render(
      <HierarchyItemActions 
        showPin={true} 
        onPin={onPin}
        isPinned={false}
      />
    );
    
    fireEvent.click(screen.getByTitle('Pin'));
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it('should call onUnpin when unpin button is clicked', () => {
    const onUnpin = vi.fn();
    render(
      <HierarchyItemActions 
        showPin={true} 
        onUnpin={onUnpin}
        isPinned={true}
      />
    );
    
    fireEvent.click(screen.getByTitle('Unpin'));
    expect(onUnpin).toHaveBeenCalledTimes(1);
  });

  it('should render both menu items and pin actions', () => {
    const onPin = vi.fn();
    render(
      <HierarchyItemActions 
        menuItems={mockMenuItems}
        showPin={true} 
        onPin={onPin}
        isPinned={false}
      />
    );
    
    const dropdownButtons = document.querySelectorAll('.dropdown-trigger');
    expect(dropdownButtons).toHaveLength(2); // One for menu, one for pin
    expect(screen.getByTitle('Pin')).toBeInTheDocument();
  });

  it('should apply custom className and style', () => {
    const customStyle = { backgroundColor: 'red' };
    render(
      <HierarchyItemActions 
        menuItems={mockMenuItems}
        className="custom-class"
        style={customStyle}
      />
    );
    
    const actionsDiv = document.querySelector('.hierarchy-item-actions');
    expect(actionsDiv).toHaveClass('hierarchy-item-actions');
    expect(actionsDiv).toHaveClass('custom-class');
    expect(actionsDiv).toHaveStyle('background-color: rgb(255, 0, 0)');
  });
});