import { useState, useCallback, useMemo } from 'react';
import { Product, Domain, Context, Schema, SchemaVersion } from '../types/schema';
import { StatusFilter } from '../components/FilterModal';
import { HierarchyExpansionManager } from '../components/hierarchy/tools/hierarchyExpansion';

// Grouped state interface
export interface HierarchyTreeState {
  products: Product[];
  expandedItems: Set<string>;
  selectedItem: SelectedItem | undefined;
  pinnedItem: PinnedItem;
  statusFilter: StatusFilter | undefined;
}

// Grouped callbacks interface  
export interface HierarchyTreeCallbacks {
  onExpandedItemsChange: (items: Set<string>) => void;
  onFind?: () => void;
  onFilter?: (mousePosition: { x: number; y: number }) => void;
}

// Types from HierarchyTree
export type PinnedItem = 
  | { type: 'product'; item: Product }
  | { type: 'domain'; item: Domain }
  | { type: 'context'; item: Context }
  | null;

export type SelectedItem = {
  type: 'product' | 'domain' | 'context' | 'schema' | 'version';
  id: string;
} | null;

// Hook interface
export interface UseHierarchyTreeProps {
  products: Product[];
  statusFilter?: StatusFilter;
  onFind?: () => void;
  onFilter?: (mousePosition: { x: number; y: number }) => void;
}

export interface UseHierarchyTreeReturn {
  state: HierarchyTreeState;
  callbacks: HierarchyTreeCallbacks;
  stateHandlers: {
    toggleExpanded: (id: string) => void;
    toggleAllDescendants: (id: string, type: string, isExpanded: boolean) => void;
    setContextMenu: (menu: { type: string; id: string; x: number; y: number } | null) => void;
  };
  actions: {
    toggleExpanded: (id: string) => void;
    setSelectedItem: (item: SelectedItem) => void;
    setPinnedItem: (item: PinnedItem) => void;
    selectItem: (type: 'product' | 'domain' | 'context' | 'schema', id: string) => void;
    selectSchema: (schema: Schema, version: SchemaVersion) => void;
    pinProduct: (product: Product) => void;
    pinDomain: (domain: Domain) => void;
    pinContext: (context: Context) => void;
    unpin: () => void;
    setExpandedItems: (items: Set<string>) => void;
  };
}

export const useHierarchyTree = ({
  products,
  statusFilter,
  onFind,
  onFilter
}: UseHierarchyTreeProps): UseHierarchyTreeReturn => {
  // State management
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(undefined);
  const [pinnedItem, setPinnedItem] = useState<PinnedItem>(null);

  // Memoized callbacks to prevent unnecessary re-renders
  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  const selectItem = useCallback((type: 'product' | 'domain' | 'context' | 'schema', id: string) => {
    setSelectedItem({ type, id });
  }, []);

  const selectSchema = useCallback((schema: Schema, version: SchemaVersion) => {
    setSelectedItem({ type: 'version', id: version.id });
  }, []);

  const pinProduct = useCallback((product: Product) => {
    setPinnedItem({ type: 'product', item: product });
  }, []);

  const pinDomain = useCallback((domain: Domain) => {
    setPinnedItem({ type: 'domain', item: domain });
  }, []);

  const pinContext = useCallback((context: Context) => {
    setPinnedItem({ type: 'context', item: context });
  }, []);

  const unpin = useCallback(() => {
    setPinnedItem(null);
  }, []);

  // Grouped state
  const state: HierarchyTreeState = {
    products,
    expandedItems,
    selectedItem,
    pinnedItem,
    statusFilter
  };

  // Grouped callbacks
  const callbacks: HierarchyTreeCallbacks = {
    onExpandedItemsChange: setExpandedItems,
    onFind,
    onFilter
  };

  // Actions
  const actions = {
    toggleExpanded,
    setSelectedItem,
    setPinnedItem,
    selectItem,
    selectSchema,
    pinProduct,
    pinDomain,
    pinContext,
    unpin,
    setExpandedItems
  };

  // State handlers for hierarchy interactions
  const stateHandlers = useMemo(() => ({
    toggleExpanded: (id: string) => {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    },
    toggleAllDescendants: (id: string, type: string, isExpanded: boolean) => {
      console.log('toggleAllDescendants called:', { id, type, isExpanded });
      setExpandedItems(prev => {
        console.log('Previous expanded items:', prev);
        const result = HierarchyExpansionManager.toggleAllDescendants(
          id,
          type as 'product' | 'domain' | 'context' | 'category',
          isExpanded,
          products,
          prev
        );
        console.log('New expanded items:', result);
        return result;
      });
    },
    setContextMenu: (menu: { type: string; id: string; x: number; y: number } | null) => {
      // This will be overridden by HierarchyTree component
      console.log('Set context menu:', menu);
    }
  }), [products]);

  return {
    state,
    callbacks,
    stateHandlers,
    actions
  };
};