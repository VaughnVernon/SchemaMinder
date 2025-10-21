import React, { useState, useEffect, useRef } from 'react';

export interface FindResult {
  id: string;
  type: 'product' | 'domain' | 'context' | 'schema' | 'version';
  name: string;
  description?: string;
  path: string; // For display, like "Product > Domain > Context"
  entityId: string; // The actual ID to navigate to
  parentIds: {
    productId?: string;
    domainId?: string;
    contextId?: string;
    schemaId?: string;
  };
}

interface FindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: FindResult) => void;
  onFind: (query: string) => Promise<FindResult[]>;
  selectedItemId?: string; // ID of the currently selected item from tree view
  query: string;
  onQueryChange: (query: string) => void;
  results: FindResult[];
  onResultsChange: (results: FindResult[]) => void;
}

export const FindModal: React.FC<FindModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  onFind,
  selectedItemId,
  query,
  onQueryChange,
  results,
  onResultsChange
}) => {
  const [isFinding, setIsFinding] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input when modal opens and reset UI state
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Don't clear query or results - preserve previous find session
      setShowNoResults(false);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Add global Esc key listener when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Handle find
  const handleFind = async () => {
    if (!query.trim()) return;
    
    setIsFinding(true);
    setShowNoResults(false);
    setSelectedIndex(-1);
    
    try {
      const findResults = await onFind(query.trim());
      onResultsChange(findResults);
      setShowNoResults(findResults.length === 0);
    } catch (error) {
      console.error('Find error:', error);
      onResultsChange([]);
      setShowNoResults(true);
    } finally {
      setIsFinding(false);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        // Always perform find when there's text in the field
        handleFind();
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
      return;
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      return;
    }
  };

  // Handle result click
  const handleResultClick = (result: FindResult) => {
    onSelectResult(result);
  };

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasResults = results.length > 0;

  return (
    <div className="find-modal-overlay" onClick={handleOverlayClick}>
      <div className="find-modal">
        {/* Always show find input */}
        <div className="find-input-container">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find products, domains, contexts, schemas..."
            className="find-input"
            disabled={isFinding}
          />
        </div>

        {/* Show results or no results message below input */}
        {showNoResults && (
          <div className="find-no-results">
            <div className="find-no-results-text">No matches found.</div>
          </div>
        )}

        {hasResults && (
          <div className="find-results-container">
            <ul ref={listRef} className="find-results-list">
              {results.map((result, index) => {
                const isKeyboardSelected = index === selectedIndex;
                const isPersistentSelected = selectedItemId === result.entityId;
                return (
                  <li
                    key={result.id}
                    className={`find-result-item ${
                      isKeyboardSelected ? 'selected' : ''
                    } ${
                      isPersistentSelected ? 'persistent-selected' : ''
                    }`}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="find-result-name">{result.name}</div>
                    <div className="find-result-path">{result.path}</div>
                    {result.description && (
                      <div className="find-result-description">{result.description}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};