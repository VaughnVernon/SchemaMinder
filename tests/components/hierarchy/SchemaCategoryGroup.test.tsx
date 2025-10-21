import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaCategoryGroup } from '../../../src/components/hierarchy/SchemaCategoryGroup';
import { Schema, SchemaTypeCategory } from '../../../src/types/schema';
import { HierarchyTreeHandlers, HierarchyTreeStateHandlers } from '../../../src/components/eventHandlers/HierarchyTreeHandlers';

// Mock data
const mockSchemas: Schema[] = [
  {
    id: 'schema-1',
    name: 'Event Schema 1',
    schemaTypeCategory: SchemaTypeCategory.Events,
    versions: []
  },
  {
    id: 'schema-2',
    name: 'Event Schema 2', 
    schemaTypeCategory: SchemaTypeCategory.Events,
    versions: []
  },
  {
    id: 'schema-3',
    name: 'Command Schema',
    schemaTypeCategory: SchemaTypeCategory.Commands,
    versions: []
  }
];

const mockHandlers: HierarchyTreeHandlers = {
  onCreateSchema: vi.fn()
};

const mockStateHandlers: HierarchyTreeStateHandlers = {
  toggleExpanded: vi.fn(),
  toggleAllDescendants: vi.fn(),
  setContextMenu: vi.fn()
};

describe('SchemaCategoryGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render category with correct name and icon', () => {
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    expect(screen.getByText('Events')).toBeInTheDocument();
    // Zap icon should be present for Events
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should not render when no schemas of that category exist', () => {
    const { container } = render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Data}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render different icons for different categories', () => {
    const { rerender } = render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Commands}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    expect(screen.getByText('Commands')).toBeInTheDocument();

    // Test Events category
    rerender(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('should show expanded state correctly', () => {
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={true}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    expect(item).toHaveClass('expanded');
  });

  it('should render children when expanded', () => {
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={true}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      >
        <div data-testid="schema-children">Schema Children</div>
      </SchemaCategoryGroup>
    );

    expect(screen.getByTestId('schema-children')).toBeInTheDocument();
  });

  it('should handle regular click to toggle expansion', async () => {
    const user = userEvent.setup();
    
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    await user.click(item!);

    expect(mockStateHandlers.toggleExpanded).toHaveBeenCalledWith('context-1-Events');
  });

  it('should handle shift+click to toggle all descendants', async () => {
    const user = userEvent.setup();
    
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const item = document.querySelector('.hierarchy-item');
    // Use keyboard modifier + click
    await user.keyboard('{Shift>}');
    await user.click(item!);
    await user.keyboard('{/Shift}');

    expect(mockStateHandlers.toggleAllDescendants).toHaveBeenCalledWith('context-1-Events', 'category', false);
  });

  it('should render dropdown menu with New Schema option', async () => {
    const user = userEvent.setup();
    
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const dropdownTrigger = document.querySelector('.dropdown-trigger');
    await user.click(dropdownTrigger!);

    expect(screen.getByText('New Schema')).toBeInTheDocument();
  });

  it('should call create schema handler with correct category', async () => {
    const user = userEvent.setup();
    
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={1}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const dropdownTrigger = document.querySelector('.dropdown-trigger');
    await user.click(dropdownTrigger!);
    await user.click(screen.getByText('New Schema'));

    expect(mockHandlers.onCreateSchema).toHaveBeenCalledWith('context-1', SchemaTypeCategory.Events);
  });

  it('should apply correct margin based on level', () => {
    render(
      <SchemaCategoryGroup
        category={SchemaTypeCategory.Events}
        schemas={mockSchemas}
        contextId="context-1"
        level={3}
        isExpanded={false}
        handlers={mockHandlers}
        stateHandlers={mockStateHandlers}
      />
    );

    const textElement = document.querySelector('.hierarchy-item-text') as HTMLElement;
    expect(textElement.style.marginLeft).toBe('60px'); // 3 * 20px
  });
});