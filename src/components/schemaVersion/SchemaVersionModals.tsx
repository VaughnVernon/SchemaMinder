import React from 'react';
import { SchemaStatus } from '../../types/schema';
import { MessageModal, MessageType } from '../MessageModal';
import { ConfirmationModal } from '../ConfirmationModal';
import { MODAL_CONFIG } from './constants';
import { SchemaVersionFormState } from '../../hooks/schemaVersion/useSchemaVersionFormState';

interface SchemaVersionModalsProps {
  // Error Modal
  showErrorModal: boolean;
  errorModalMessage: string;
  onCloseErrorModal: () => void;
  
  // Compatibility Modal
  showCompatibilityModal: boolean;
  compatibilityModalType: MessageType;
  compatibilityModalTitle: string;
  compatibilityModalMessage: string;
  compatibilityModalDetails?: string;
  onCloseCompatibilityModal: () => void;
  onConfirmCompatibilityModal?: () => void;
  
  // Status Confirmation Modal
  showStatusConfirmation: boolean;
  pendingStatus: SchemaStatus | null;
  onCloseStatusConfirmation: () => void;
  onConfirmStatusChange: (confirmed: boolean) => void;
}

/**
 * Component containing all modals for schema version form
 * Extracted from SchemaVersionForm to reduce complexity
 */
export const SchemaVersionModals: React.FC<SchemaVersionModalsProps> = ({
  showErrorModal,
  errorModalMessage,
  onCloseErrorModal,
  showCompatibilityModal,
  compatibilityModalType,
  compatibilityModalTitle,
  compatibilityModalMessage,
  compatibilityModalDetails,
  onCloseCompatibilityModal,
  onConfirmCompatibilityModal,
  showStatusConfirmation,
  pendingStatus,
  onCloseStatusConfirmation,
  onConfirmStatusChange
}) => {
  return (
    <>
      {/* Error Modal */}
      <MessageModal
        isOpen={showErrorModal}
        type="error"
        title={MODAL_CONFIG.ERROR_TITLE}
        message={errorModalMessage}
        onClose={onCloseErrorModal}
        confirmText={MODAL_CONFIG.OK_TEXT}
      />

      {/* Compatibility Warning Modal */}
      <MessageModal
        isOpen={showCompatibilityModal}
        type={compatibilityModalType}
        title={compatibilityModalTitle}
        message={compatibilityModalMessage}
        details={compatibilityModalDetails}
        onClose={onCloseCompatibilityModal}
        onConfirm={compatibilityModalType === 'warning' ? onConfirmCompatibilityModal : undefined}
        confirmText={compatibilityModalType === 'warning' ? MODAL_CONFIG.CREATE_ANYWAY_TEXT : MODAL_CONFIG.OK_TEXT}
        cancelText={MODAL_CONFIG.CANCEL_TEXT}
        showCancel={compatibilityModalType === 'warning'}
      />

      {/* Status Confirmation Modal */}
      {pendingStatus && (
        <ConfirmationModal
          isOpen={showStatusConfirmation}
          title={MODAL_CONFIG.STATUS_CONFIRMATION_TITLE(pendingStatus)}
          description={MODAL_CONFIG.STATUS_CONFIRMATION_MESSAGE(pendingStatus)}
          confirmButtonText={MODAL_CONFIG.CONFIRM_BUTTON_TEXT}
          cancelButtonText={MODAL_CONFIG.CANCEL_BUTTON_TEXT}
          onConfirm={onConfirmStatusChange}
          onClose={onCloseStatusConfirmation}
        />
      )}
    </>
  );
};

/**
 * Convenience wrapper that works directly with SchemaVersionFormState
 */
interface SchemaVersionModalsWithStateProps {
  formState: SchemaVersionFormState;
  onConfirmCompatibilityModal: () => void;
  onCancelCompatibilityModal: () => void;
  onConfirmStatusChange: (confirmed: boolean) => void;
}

export const SchemaVersionModalsWithState: React.FC<SchemaVersionModalsWithStateProps> = ({
  formState,
  onConfirmCompatibilityModal,
  onCancelCompatibilityModal,
  onConfirmStatusChange
}) => {
  return (
    <SchemaVersionModals
      // Error Modal
      showErrorModal={formState.showErrorModal}
      errorModalMessage={formState.errorModalMessage}
      onCloseErrorModal={() => formState.setShowErrorModal(false)}
      
      // Compatibility Modal
      showCompatibilityModal={formState.showCompatibilityModal}
      compatibilityModalType={formState.compatibilityModalType}
      compatibilityModalTitle={formState.compatibilityModalTitle}
      compatibilityModalMessage={formState.compatibilityModalMessage}
      compatibilityModalDetails={formState.compatibilityModalDetails}
      onCloseCompatibilityModal={onCancelCompatibilityModal}
      onConfirmCompatibilityModal={onConfirmCompatibilityModal}
      
      // Status Confirmation Modal
      showStatusConfirmation={formState.showStatusConfirmation}
      pendingStatus={formState.pendingStatus}
      onCloseStatusConfirmation={() => formState.setShowStatusConfirmation(false)}
      onConfirmStatusChange={onConfirmStatusChange}
    />
  );
};