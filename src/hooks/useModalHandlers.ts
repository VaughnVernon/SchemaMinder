import { useState, useCallback } from 'react';
import { FindResult, StatusFilter } from '../types/schema';

interface UseModalHandlersReturn {
  // Find Modal State
  isFindOpen: boolean;
  findQuery: string;
  findResults: FindResult[];
  
  // Filter Modal State
  isFilterOpen: boolean;
  filterMousePosition: { x: number; y: number } | undefined;
  
  // Find Modal Actions
  setIsFindOpen: (open: boolean) => void;
  setFindQuery: (query: string) => void;
  setFindResults: (results: FindResult[]) => void;
  handleFindClose: () => void;
  showFindModal: () => void;
  
  // Filter Modal Actions
  setIsFilterOpen: (open: boolean) => void;
  setFilterMousePosition: (position: { x: number; y: number } | undefined) => void;
  handleFilterClose: () => void;
  showFilterModal: (mousePosition: { x: number; y: number }) => void;
  
  // Message Modal Action
  showMessageModal: (message: string, details?: string) => void;
}

/**
 * Custom hook to manage modal states and handlers.
 * Consolidates all modal-related logic to reduce complexity in App.tsx.
 */
export const useModalHandlers = (): UseModalHandlersReturn => {
  // Find Modal State
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<FindResult[]>([]);
  
  // Filter Modal State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMousePosition, setFilterMousePosition] = useState<{ x: number; y: number } | undefined>();
  
  // Find Modal Handlers
  const handleFindClose = useCallback(() => {
    setIsFindOpen(false);
  }, []);
  
  const showFindModal = useCallback(() => {
    setIsFindOpen(true);
  }, []);
  
  // Filter Modal Handlers
  const handleFilterClose = useCallback(() => {
    setIsFilterOpen(false);
  }, []);
  
  const showFilterModal = useCallback((mousePosition: { x: number; y: number }) => {
    setFilterMousePosition(mousePosition);
    setIsFilterOpen(true);
  }, []);
  
  // Message Modal Handler
  const showMessageModal = useCallback((message: string, details?: string) => {
    // Implementation for message modal if needed
    console.log('Message modal:', message, details);
  }, []);
  
  return {
    // Find Modal State
    isFindOpen,
    findQuery,
    findResults,
    
    // Filter Modal State
    isFilterOpen,
    filterMousePosition,
    
    // Find Modal Actions
    setIsFindOpen,
    setFindQuery,
    setFindResults,
    handleFindClose,
    showFindModal,
    
    // Filter Modal Actions
    setIsFilterOpen,
    setFilterMousePosition,
    handleFilterClose,
    showFilterModal,
    
    // Message Modal Action
    showMessageModal
  };
};