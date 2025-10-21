import { useEffect } from 'react';
import { Product } from '../types/schema';

interface UseInitialHierarchySetupProps {
  products: Product[];
  currentContextId: string;
  setCurrentContextId: (id: string) => void;
  setExpandedItems: (items: Set<string>) => void;
}

/**
 * Custom hook to handle initial hierarchy setup when data loads.
 * Automatically selects the first available context and expands the hierarchy.
 */
export const useInitialHierarchySetup = ({
  products,
  currentContextId,
  setCurrentContextId,
  setExpandedItems
}: UseInitialHierarchySetupProps) => {
  useEffect(() => {
    if (products.length > 0 && !currentContextId) {
      const firstProduct = products[0];
      if (firstProduct.domains.length > 0) {
        const firstDomain = firstProduct.domains[0];
        if (firstDomain.contexts.length > 0) {
          const firstContext = firstDomain.contexts[0];
          setCurrentContextId(firstContext.id);
          // Expand the initial hierarchy
          setExpandedItems(new Set([firstProduct.id, firstDomain.id, firstContext.id]));
        }
      }
    }
  }, [products, currentContextId, setCurrentContextId, setExpandedItems]);
};