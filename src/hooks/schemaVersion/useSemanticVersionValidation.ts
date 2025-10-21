import { useEffect } from 'react';
import { getSemanticVersionError } from '../../services/schemaTypeSpecification';

interface UseSemanticVersionValidationProps {
  semanticVersion: string;
  setSemanticVersionError: (error: string | null) => void;
}

/**
 * Custom hook to handle semantic version validation
 * Extracts the semantic version validation useEffect from the main component
 */
export const useSemanticVersionValidation = ({
  semanticVersion,
  setSemanticVersionError
}: UseSemanticVersionValidationProps) => {
  useEffect(() => {
    if (semanticVersion) {
      const error = getSemanticVersionError(semanticVersion);
      setSemanticVersionError(error);
    } else {
      setSemanticVersionError(null);
    }
  }, [semanticVersion, setSemanticVersionError]);
};