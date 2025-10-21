import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TargetLanguage, LANGUAGE_DISPLAY_NAMES, CodeGenerationContext, LANGUAGE_FILE_EXTENSIONS } from '../services/codegen/types';

interface SourceCodeGenerationModalProps {
  isOpen: boolean;
  contextPath: string; // e.g., "My Product / My Domain / My Context"
  context: CodeGenerationContext;
  onClose: () => void;
  onGenerate: (language: TargetLanguage, namespace: string, filename: string) => void;
}

export const SourceCodeGenerationModal: React.FC<SourceCodeGenerationModalProps> = ({
  isOpen,
  contextPath,
  context,
  onClose,
  onGenerate,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>('csharp');
  const [namespace, setNamespace] = useState<string>('');
  const [filename, setFilename] = useState<string>('');

  // Helper to convert context name to PascalCase and remove spaces
  const toPascalCase = (str: string): string => {
    return str
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  // Initialize namespace and filename from context when modal opens
  useEffect(() => {
    if (isOpen && context) {
      if (context.contextNamespace) {
        setNamespace(context.contextNamespace);
      }
      // Generate PascalCase filename without spaces
      const pascalContextName = toPascalCase(context.contextName);
      const extension = LANGUAGE_FILE_EXTENSIONS[selectedLanguage];
      setFilename(`${pascalContextName}Schemas${extension}`);
    }
  }, [isOpen, context, selectedLanguage]);

  // Don't render if not open or no context
  if (!isOpen || !context) return null;

  const handleGenerate = () => {
    onGenerate(selectedLanguage, namespace, filename);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getNamespaceLabel = (language: TargetLanguage): string => {
    switch (language) {
      case 'csharp':
        return 'Namespace';
      case 'golang':
        return 'Package';
      case 'java':
        return 'Package';
      case 'javascript':
        return 'Module';
      case 'rust':
        return 'Module';
      case 'typescript':
        return 'Namespace';
      default:
        return 'Namespace';
    }
  };


  const availableLanguages: TargetLanguage[] = ['csharp', 'golang', 'java', 'javascript', 'rust', 'typescript'];

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Generate Source Code</h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Context Path */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 'bold' }}>Context:</label>
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              {contextPath}
            </div>
          </div>

          {/* Target Language */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="target-language" className="form-label" style={{ fontWeight: 'bold' }}>
              Target Language:&nbsp;
            </label>
            <select
              id="target-language"
              className="form-input"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as TargetLanguage)}
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_DISPLAY_NAMES[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Namespace/Package */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="namespace" className="form-label" style={{ fontWeight: 'bold' }}>
              {getNamespaceLabel(selectedLanguage)}:&nbsp;
            </label>
            <input
              type="text"
              id="namespace"
              className="form-input"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder={`e.g., com.example.${context.contextName.toLowerCase()}`}
            />
          </div>

          {/* Output Filename */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="filename" className="form-label" style={{ fontWeight: 'bold' }}>
              Output Filename:
            </label>
            <input
              type="text"
              id="filename"
              className="form-input"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Schema Count */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <strong>Total schemas to be generated:</strong> {context.schemas.length}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={handleGenerate}
            disabled={!namespace.trim()}
          >
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
};
