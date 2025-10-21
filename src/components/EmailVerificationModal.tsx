import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificationToken?: string;
}

type VerificationStatus = 'pending' | 'verifying' | 'success' | 'error' | 'resending';

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  verificationToken
}) => {
  const { authState, verifyEmail, resendVerificationEmail } = useEnhancedAuth();
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [message, setMessage] = useState<string>('');
  const [resendClickedAt, setResendClickedAt] = useState<Date | null>(null);
  const [hasTriedAutoVerification, setHasTriedAutoVerification] = useState(false);

  // Auto-verify if token is provided (only once)
  useEffect(() => {
    if (isOpen && verificationToken && status === 'pending' && !hasTriedAutoVerification) {
      setHasTriedAutoVerification(true);
      handleVerifyEmail(verificationToken);
    }
  }, [isOpen, verificationToken, status, hasTriedAutoVerification]);

  // Calculate resend cooldown based on timestamp
  const now = new Date();
  const timeSinceResend = resendClickedAt ? (now.getTime() - resendClickedAt.getTime()) / 1000 : Infinity;
  const remainingCooldown = resendClickedAt ? Math.max(0, 60 - timeSinceResend) : 0;
  const canResend = remainingCooldown === 0;
  const resendCountdown = Math.ceil(remainingCooldown);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStatus('pending');
      setMessage('');
      setResendClickedAt(null);
      setHasTriedAutoVerification(false);
    }
  }, [isOpen]);

  const handleVerifyEmail = async (token: string) => {
    setStatus('verifying');
    setMessage('Verifying your email address...');

    try {
      const result = await verifyEmail(token);

      if (result.success) {
        setStatus('success');
        setMessage('Your email address has been verified successfully!');
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to verify email address. The link may be expired or invalid.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred while verifying your email.');
    }
  };

  const handleResendVerification = async () => {
    if (!canResend || !authState.user) return;

    setStatus('resending');
    setMessage('Sending verification email...');

    try {
      const result = await resendVerificationEmail();

      if (result.success) {
        setStatus('pending');
        setMessage('Verification email sent! Please check your inbox.');
        setResendClickedAt(new Date()); // Start cooldown timestamp
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred while sending the verification email.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
      case 'resending':
        return <Clock size={48} className="spinning" />;
      case 'success':
        return <CheckCircle size={48} className="success-icon" />;
      case 'error':
        return <AlertCircle size={48} className="error-icon" />;
      default:
        return <Mail size={48} className="info-icon" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'verifying':
      case 'resending':
        return 'loading';
      default:
        return 'info';
    }
  };

  if (!isOpen) return null;

  const isEmailVerified = authState.user?.emailVerified;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content email-verification-modal">
        <div className="modal-header">
          <h2>Email Verification</h2>
          <button 
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className={`verification-status ${getStatusColor()}`}>
            <div className="status-icon">
              {getStatusIcon()}
            </div>
            
            <div className="status-content">
              {!verificationToken && !isEmailVerified && (
                <>
                  <h3>Verify Your Email Address</h3>
                  <p className="status-message">
                    Please check your email for a verification link. Click the link to verify your email address.
                  </p>
                  <p className="user-email">
                    Verification email sent to: <strong>{authState.user?.emailAddress}</strong>
                  </p>
                </>
              )}

              {message && (
                <p className="status-message">{message}</p>
              )}

              {isEmailVerified && status !== 'success' && (
                <>
                  <h3>Email Already Verified</h3>
                  <p className="status-message">
                    Your email address <strong>{authState.user?.emailAddress}</strong> is already verified.
                  </p>
                </>
              )}
            </div>
          </div>

          {!isEmailVerified && (
            <div className="verification-actions">
              {status !== 'verifying' && status !== 'success' && (
                <>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={handleResendVerification}
                    disabled={!canResend || status === 'resending'}
                  >
                    <Mail size={16} />
                    {status === 'resending'
                      ? 'Sending...'
                      : canResend
                        ? 'Resend Verification Email'
                        : `Resend in ${resendCountdown}s`
                    }
                  </button>

                  {status === 'error' && (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => {
                        setStatus('pending');
                        setMessage('');
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </>
              )}

              {status === 'success' && (
                <button
                  type="button"
                  className="button primary"
                  onClick={onClose}
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {status !== 'verifying' && status !== 'resending' && (
            <div className="verification-help">
              <h4>Having trouble?</h4>
              <ul>
                <li>Check your spam or junk folder</li>
                <li>Make sure you're checking the correct email address</li>
                <li>Verification links expire after 24 hours</li>
                <li>Contact support if you continue having issues</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};