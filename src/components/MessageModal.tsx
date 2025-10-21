import React, { useEffect } from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type MessageType = 'info' | 'warning' | 'error';

export interface MessageModalProps {
  isOpen: boolean;
  type: MessageType;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  type,
  title,
  message,
  details,
  onClose,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info size={24} className="message-modal-icon info" />;
      case 'warning':
        return <AlertTriangle size={24} className="message-modal-icon warning" />;
      case 'error':
        return <XCircle size={24} className="message-modal-icon error" />;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="message-modal-overlay" onClick={handleBackdropClick}>
      <div className="message-modal">
        <div className="message-modal-header">
          <div className="message-modal-title">
            {getIcon()}
            <h3>{title}</h3>
          </div>
          <button 
            className="message-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="message-modal-content">
          <p className="message-modal-message">{message}</p>
          {details !== undefined && (
            <div className="message-modal-details">
              <p>{details}</p>
            </div>
          )}
        </div>

        <div className="message-modal-actions">
          <button 
            type="button" 
            className="button"
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
          {showCancel && (
            <button 
              type="button" 
              className="button secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};