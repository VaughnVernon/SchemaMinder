import React, { useEffect } from 'react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmButtonText: string;
  cancelButtonText: string;
  onConfirm: (result: boolean) => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onClose
}) => {
  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onConfirm, onClose]);

  const handleConfirm = () => {
    onConfirm(true);
    onClose();
  };

  const handleCancel = () => {
    onConfirm(false);
    onClose();
  };

  // Handle click outside to cancel
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="find-modal-overlay" onClick={handleOverlayClick}>
      <div className="find-modal" style={{ width: 'auto', minWidth: '300px', padding: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            {title}
          </h3>
          
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', lineHeight: '1.5', color: '#666' }}>
            {description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              className="button secondary"
              onClick={handleCancel}
            >
              {cancelButtonText}
            </button>
            <button 
              type="button" 
              className="button"
              onClick={handleConfirm}
              autoFocus
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};