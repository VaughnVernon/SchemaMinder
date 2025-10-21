/**
 * Custom hook for code generation functionality
 */

import { useState } from 'react';
import { Context, Product } from '../types/schema';
import { TargetLanguage, CodeGenerationContext } from '../services/codegen/types';
import { createCodeGenerator } from '../services/codegen';
import { buildCodeGenerationContext, formatContextPath, downloadGeneratedCode } from '../services/codeGenerationAssistant';

export interface UseCodeGenerationResult {
  isModalOpen: boolean;
  contextPath: string;
  generationContext: CodeGenerationContext | null;
  openGenerateModal: (context: Context, products: Product[]) => void;
  closeGenerateModal: () => void;
  handleGenerate: (language: TargetLanguage, namespace: string, filename: string) => void;
}

export function useCodeGeneration(): UseCodeGenerationResult {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextPath, setContextPath] = useState('');
  const [generationContext, setGenerationContext] = useState<CodeGenerationContext | null>(null);

  const openGenerateModal = (context: Context, products: Product[]) => {
    const genContext = buildCodeGenerationContext(context, products);
    if (!genContext) {
      console.error('Failed to build code generation context');
      return;
    }

    const path = formatContextPath(context, products);
    setGenerationContext(genContext);
    setContextPath(path);
    setIsModalOpen(true);
  };

  const closeGenerateModal = () => {
    setIsModalOpen(false);
    setGenerationContext(null);
    setContextPath('');
  };

  const handleGenerate = (language: TargetLanguage, namespace: string, filename: string) => {
    if (!generationContext) {
      console.error('No generation context available');
      return;
    }

    // Generate code
    const result = createCodeGenerator({
      language,
      namespace,
      context: generationContext
    });

    if (result.success && result.content) {
      // Download the generated file with custom filename
      const finalFilename = filename || result.filename;
      downloadGeneratedCode(finalFilename, result.content);
      closeGenerateModal();
    } else {
      // Show error (in a real app, you'd use a toast or alert)
      console.error('Code generation failed:', result.error);
      alert(`Code generation failed: ${result.error}`);
    }
  };

  return {
    isModalOpen,
    contextPath,
    generationContext,
    openGenerateModal,
    closeGenerateModal,
    handleGenerate
  };
}
