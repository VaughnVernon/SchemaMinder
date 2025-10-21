import { useEffect } from 'react';
import { SchemaVersion, SchemaStatus } from '../../types/schema';
import { DialogMode } from '../../types/dialogMode';
import { prepareSpecificationWithTodo } from '../../components/schemaVersion/tools';
import { SchemaVersionFormState } from './useSchemaVersionFormState';

interface UseSchemaVersionInitializationProps {
  mode: DialogMode;
  schemaVersion?: SchemaVersion;
  suggestedVersion?: string;
  previousSpecification?: string;
  setSpecification: (value: string) => void;
  setSemanticVersion: (value: string) => void;
  setDescription: (value: string) => void;
  setStatus: (value: SchemaStatus) => void;
}

/**
 * Custom hook to handle form initialization logic
 * Extracts the complex initialization useEffect from the main component
 */
export const useSchemaVersionInitialization = ({
  mode,
  schemaVersion,
  suggestedVersion,
  previousSpecification,
  setSpecification,
  setSemanticVersion,
  setDescription,
  setStatus
}: UseSchemaVersionInitializationProps) => {
  useEffect(() => {
    if (mode === DialogMode.Edit && schemaVersion) {
      // Initialize with existing version data
      setSpecification(schemaVersion.specification);
      setSemanticVersion(schemaVersion.semanticVersion);
      setDescription(schemaVersion.description || '');
      setStatus(schemaVersion.status);
    } else {
      // Initialize new version with prepared specification
      const initialSpecification = prepareSpecificationWithTodo(previousSpecification);
      
      setSpecification(initialSpecification);
      setSemanticVersion(suggestedVersion || '');
      setDescription('');
      setStatus(SchemaStatus.Draft);
    }
  }, [mode, schemaVersion, suggestedVersion, previousSpecification, setSpecification, setSemanticVersion, setDescription, setStatus]);
};

/**
 * Convenience hook that works with SchemaVersionFormState
 */
export const useSchemaVersionInitializationWithState = (
  mode: DialogMode,
  schemaVersion: SchemaVersion | undefined,
  suggestedVersion: string | undefined,
  previousSpecification: string | undefined,
  formState: Pick<SchemaVersionFormState, 'setSpecification' | 'setSemanticVersion' | 'setDescription' | 'setStatus'>
) => {
  return useSchemaVersionInitialization({
    mode,
    schemaVersion,
    suggestedVersion,
    previousSpecification,
    setSpecification: formState.setSpecification,
    setSemanticVersion: formState.setSemanticVersion,
    setDescription: formState.setDescription,
    setStatus: formState.setStatus
  });
};