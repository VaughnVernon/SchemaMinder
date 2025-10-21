import { useState } from 'react';
import { SchemaVersion, SchemaStatus } from '../../types/schema';
import { DialogMode } from '../../types/dialogMode';
import { MessageType } from '../../components/MessageModal';
import { getFormTitle, getSubmitButtonText } from '../../components/schemaVersion/tools';

/**
 * Form state interface
 */
export interface SchemaVersionFormState {
  // Form fields
  specification: string;
  semanticVersion: string;
  description: string;
  status: SchemaStatus;
  
  // Validation states
  isSpecificationValid: boolean;
  semanticVersionError: string | null;
  specificationErrors: string[];
  compatibilityErrors: string[];
  
  // Modal states
  showErrorModal: boolean;
  errorModalMessage: string;
  showCompatibilityModal: boolean;
  compatibilityModalType: MessageType;
  compatibilityModalTitle: string;
  compatibilityModalMessage: string;
  compatibilityModalDetails: string | undefined;
  showStatusConfirmation: boolean;
  pendingStatus: SchemaStatus | null;
  pendingSubmission: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> | null;
  
  // Computed values
  isEditMode: boolean;
  title: string;
  submitButtonText: string;
  
  // Setters
  setSpecification: (value: string) => void;
  setSemanticVersion: (value: string) => void;
  setDescription: (value: string) => void;
  setStatus: (value: SchemaStatus) => void;
  setIsSpecificationValid: (value: boolean) => void;
  setSemanticVersionError: (value: string | null) => void;
  setSpecificationErrors: (value: string[]) => void;
  setCompatibilityErrors: (value: string[]) => void;
  setShowErrorModal: (value: boolean) => void;
  setErrorModalMessage: (value: string) => void;
  setShowCompatibilityModal: (value: boolean) => void;
  setCompatibilityModalType: (value: MessageType) => void;
  setCompatibilityModalTitle: (value: string) => void;
  setCompatibilityModalMessage: (value: string) => void;
  setCompatibilityModalDetails: (value: string | undefined) => void;
  setShowStatusConfirmation: (value: boolean) => void;
  setPendingStatus: (value: SchemaStatus | null) => void;
  setPendingSubmission: (value: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> | null) => void;
  
  // Helper methods
  showError: (message: string) => void;
  clearErrors: () => void;
}

/**
 * Custom hook to manage all form state for SchemaVersionForm
 */
export const useSchemaVersionFormState = (
  mode: DialogMode,
  schemaName?: string
): SchemaVersionFormState => {
  // Form field states
  const [specification, setSpecification] = useState('');
  const [semanticVersion, setSemanticVersion] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SchemaStatus>(SchemaStatus.Draft);
  
  // Validation states
  const [isSpecificationValid, setIsSpecificationValid] = useState(true);
  const [semanticVersionError, setSemanticVersionError] = useState<string | null>(null);
  const [specificationErrors, setSpecificationErrors] = useState<string[]>([]);
  const [compatibilityErrors, setCompatibilityErrors] = useState<string[]>([]);
  
  // Error modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  
  // Compatibility modal states
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [compatibilityModalType, setCompatibilityModalType] = useState<MessageType>('warning');
  const [compatibilityModalTitle, setCompatibilityModalTitle] = useState('');
  const [compatibilityModalMessage, setCompatibilityModalMessage] = useState('');
  const [compatibilityModalDetails, setCompatibilityModalDetails] = useState<string | undefined>();
  const [pendingSubmission, setPendingSubmission] = useState<Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  
  // Status confirmation states
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SchemaStatus | null>(null);
  
  // Computed values
  const isEditMode = mode === DialogMode.Edit;
  const title = getFormTitle(mode, schemaName);
  const submitButtonText = getSubmitButtonText(mode);
  
  // Helper methods
  const showError = (message: string) => {
    setErrorModalMessage(message);
    setShowErrorModal(true);
  };
  
  const clearErrors = () => {
    setCompatibilityErrors([]);
    setSpecificationErrors([]);
  };
  
  return {
    // Form fields
    specification,
    semanticVersion,
    description,
    status,
    
    // Validation states
    isSpecificationValid,
    semanticVersionError,
    specificationErrors,
    compatibilityErrors,
    
    // Modal states
    showErrorModal,
    errorModalMessage,
    showCompatibilityModal,
    compatibilityModalType,
    compatibilityModalTitle,
    compatibilityModalMessage,
    compatibilityModalDetails,
    showStatusConfirmation,
    pendingStatus,
    pendingSubmission,
    
    // Computed values
    isEditMode,
    title,
    submitButtonText,
    
    // Setters
    setSpecification,
    setSemanticVersion,
    setDescription,
    setStatus,
    setIsSpecificationValid,
    setSemanticVersionError,
    setSpecificationErrors,
    setCompatibilityErrors,
    setShowErrorModal,
    setErrorModalMessage,
    setShowCompatibilityModal,
    setCompatibilityModalType,
    setCompatibilityModalTitle,
    setCompatibilityModalMessage,
    setCompatibilityModalDetails,
    setShowStatusConfirmation,
    setPendingStatus,
    setPendingSubmission,
    
    // Helper methods
    showError,
    clearErrors
  };
};