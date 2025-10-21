import React, { useState, useEffect } from 'react';
import { SchemaStatus } from '../types/schema';

export interface StatusFilter {
  [SchemaStatus.Draft]: boolean;
  [SchemaStatus.Published]: boolean;
  [SchemaStatus.Deprecated]: boolean;
  [SchemaStatus.Removed]: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  currentFilter: StatusFilter;
  onApply: (filter: StatusFilter) => void;
  onClose: () => void;
  mousePosition?: { x: number; y: number };
}

export const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  currentFilter, 
  onApply, 
  onClose,
  mousePosition
}) => {
  const [tempFilter, setTempFilter] = useState<StatusFilter>(currentFilter);

  // Initialize temp filter when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempFilter(currentFilter);
    }
  }, [isOpen, currentFilter]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleApply();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, tempFilter, onClose]);

  const handleApply = () => {
    onApply(tempFilter);
    onClose();
  };

  const handleToggle = (status: SchemaStatus) => {
    setTempFilter(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Handle click outside to apply (matching FindModal behavior)
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleApply();
    }
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    width: 'auto',
    minWidth: 'unset',
    padding: '12px',
    ...(mousePosition ? {
      position: 'absolute' as const,
      top: mousePosition.y,
      left: mousePosition.x,
      transform: 'none'
    } : {})
  };

  return (
    <div className="find-modal-overlay" onClick={handleOverlayClick}>
      <div className="find-modal" style={modalStyle}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer', fontSize: '0.8em', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={tempFilter[SchemaStatus.Draft]}
              onChange={() => handleToggle(SchemaStatus.Draft)}
              style={{ marginRight: '8px', accentColor: '#d1fae5', backgroundColor: 'white' }}
            />
            Draft
          </label>

          <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer', fontSize: '0.8em', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={tempFilter[SchemaStatus.Published]}
              onChange={() => handleToggle(SchemaStatus.Published)}
              style={{ marginRight: '8px', accentColor: '#d1fae5', backgroundColor: 'white' }}
            />
            Published
          </label>

          <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer', fontSize: '0.8em', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={tempFilter[SchemaStatus.Deprecated]}
              onChange={() => handleToggle(SchemaStatus.Deprecated)}
              style={{ marginRight: '8px', accentColor: '#d1fae5', backgroundColor: 'white' }}
            />
            Deprecated
          </label>

          <label style={{ display: 'block', marginBottom: '0', cursor: 'pointer', fontSize: '0.8em', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={tempFilter[SchemaStatus.Removed]}
              onChange={() => handleToggle(SchemaStatus.Removed)}
              style={{ marginRight: '8px', accentColor: '#d1fae5', backgroundColor: 'white' }}
            />
            Removed
          </label>
        </div>
      </div>
    </div>
  );
};