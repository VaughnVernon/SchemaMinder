import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SessionTimeoutWarningModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtendSession: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const SessionTimeoutWarningModal: React.FC<SessionTimeoutWarningModalProps> = ({
  isOpen,
  timeRemaining,
  onExtendSession,
  onLogout,
  onClose
}) => {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (isOpen && timeRemaining > 0) {
      setCountdown(timeRemaining);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onLogout) {
              onLogout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, timeRemaining, onLogout]);

  const formatTime = (seconds: number): string => {
    // Handle negative values by treating them as 0
    const adjustedSeconds = Math.max(0, seconds);
    const minutes = Math.floor(adjustedSeconds / 60);
    const remainingSeconds = adjustedSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = () => {
    if (onExtendSession) {
      onExtendSession();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay session-timeout-overlay">
      <div className="modal-content session-timeout-modal">
        <div className="modal-header">
          <h2>Session Expiring Soon</h2>
          <button
            className="modal-close"
            onClick={() => onClose && onClose()}
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="session-warning-content">
            <div className="warning-icon">⚠️</div>
            <p className="warning-message">
              Your session will expire in <strong>{formatTime(countdown)}</strong>
            </p>
            <p className="warning-description">
              For your security, you will be automatically logged out due to inactivity.
              Would you like to extend your session?
            </p>
          </div>

          <div className="session-timeout-actions">
            <button
              type="button"
              className="button primary"
              onClick={handleExtendSession}
            >
              Stay Logged In
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={handleLogout}
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};