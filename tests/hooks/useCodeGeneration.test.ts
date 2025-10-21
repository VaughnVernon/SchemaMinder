import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodeGeneration } from '../../src/hooks/useCodeGeneration';
import { Context, Product } from '../../src/types/schema';
import * as codeGenerationHelper from '../../src/services/codeGenerationAssistant';
import * as codegen from '../../src/services/codegen';

// Mock the helper functions
vi.mock('../../src/services/codeGenerationAssistant');
vi.mock('../../src/services/codegen');

describe('useCodeGeneration', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: 'TestProduct',
    createdAt: new Date(),
    updatedAt: new Date(),
    domains: [
      {
        id: 'dom-1',
        name: 'TestDomain',
        productId: 'prod-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        contexts: [
          {
            id: 'ctx-1',
            name: 'UserManagement',
            namespace: 'Com.Example.UserMgmt',
            domainId: 'dom-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            schemas: []
          }
        ]
      }
    ]
  };

  const mockContext: Context = mockProduct.domains[0].contexts[0];

  const mockCodeGenerationContext = {
    productName: 'TestProduct',
    domainName: 'TestDomain',
    contextName: 'UserManagement',
    contextNamespace: 'Com.Example.UserMgmt',
    schemas: []
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(codeGenerationHelper.buildCodeGenerationContext).mockReturnValue(mockCodeGenerationContext);
    vi.mocked(codeGenerationHelper.formatContextPath).mockReturnValue('TestProduct / TestDomain / UserManagement');
    vi.mocked(codeGenerationHelper.downloadGeneratedCode).mockImplementation(() => {});
    vi.mocked(codegen.createCodeGenerator).mockReturnValue({
      success: true,
      filename: 'UserManagementSchemas.cs',
      content: '// Generated C# code'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with modal closed', () => {
      const { result } = renderHook(() => useCodeGeneration());

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.contextPath).toBe('');
      expect(result.current.generationContext).toBeNull();
    });
  });

  describe('openGenerateModal', () => {
    it('should build generation context and open modal', () => {
      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      expect(codeGenerationHelper.buildCodeGenerationContext).toHaveBeenCalledWith(mockContext, [mockProduct]);
      expect(codeGenerationHelper.formatContextPath).toHaveBeenCalledWith(mockContext, [mockProduct]);
      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.generationContext).toEqual(mockCodeGenerationContext);
      expect(result.current.contextPath).toBe('TestProduct / TestDomain / UserManagement');
    });

    it('should not open modal if context building fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(codeGenerationHelper.buildCodeGenerationContext).mockReturnValue(null);

      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.generationContext).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to build code generation context');

      consoleSpy.mockRestore();
    });
  });

  describe('closeGenerateModal', () => {
    it('should reset all state and close modal', () => {
      const { result } = renderHook(() => useCodeGeneration());

      // First open the modal
      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      expect(result.current.isModalOpen).toBe(true);

      // Then close it
      act(() => {
        result.current.closeGenerateModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.contextPath).toBe('');
      expect(result.current.generationContext).toBeNull();
    });
  });

  describe('handleGenerate', () => {
    it('should generate code and download file', () => {
      const { result } = renderHook(() => useCodeGeneration());

      // Open modal first
      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      // Generate code
      act(() => {
        result.current.handleGenerate('csharp', 'Com.Example.UserMgmt', 'UserManagementSchemas.cs');
      });

      expect(codegen.createCodeGenerator).toHaveBeenCalledWith({
        language: 'csharp',
        namespace: 'Com.Example.UserMgmt',
        context: mockCodeGenerationContext
      });

      expect(codeGenerationHelper.downloadGeneratedCode).toHaveBeenCalledWith(
        'UserManagementSchemas.cs',
        '// Generated C# code'
      );

      // Modal should be closed after successful generation
      expect(result.current.isModalOpen).toBe(false);
    });

    it('should use custom filename if provided', () => {
      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      act(() => {
        result.current.handleGenerate('csharp', 'Com.Example.UserMgmt', 'CustomFilename.cs');
      });

      expect(codeGenerationHelper.downloadGeneratedCode).toHaveBeenCalledWith(
        'CustomFilename.cs',
        '// Generated C# code'
      );
    });

    it('should use default filename if custom filename is empty', () => {
      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      act(() => {
        result.current.handleGenerate('csharp', 'Com.Example.UserMgmt', '');
      });

      expect(codeGenerationHelper.downloadGeneratedCode).toHaveBeenCalledWith(
        'UserManagementSchemas.cs',
        '// Generated C# code'
      );
    });

    it('should handle generation failure with error alert', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(codegen.createCodeGenerator).mockReturnValue({
        success: false,
        filename: '',
        error: 'No valid schemas found'
      });

      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      act(() => {
        result.current.handleGenerate('csharp', 'Com.Example.UserMgmt', 'test.cs');
      });

      expect(codeGenerationHelper.downloadGeneratedCode).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Code generation failed:', 'No valid schemas found');
      expect(alertSpy).toHaveBeenCalledWith('Code generation failed: No valid schemas found');
      expect(result.current.isModalOpen).toBe(true); // Modal stays open on error

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should log error if no generation context is available', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCodeGeneration());

      // Don't open modal, just try to generate
      act(() => {
        result.current.handleGenerate('csharp', 'Com.Example.UserMgmt', 'test.cs');
      });

      expect(consoleSpy).toHaveBeenCalledWith('No generation context available');
      expect(codegen.createCodeGenerator).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should work with all supported languages', () => {
      const languages: Array<{ lang: 'csharp' | 'golang' | 'java' | 'javascript' | 'rust' | 'typescript', ext: string }> = [
        { lang: 'csharp', ext: '.cs' },
        { lang: 'golang', ext: '.go' },
        { lang: 'java', ext: '.java' },
        { lang: 'javascript', ext: '.js' },
        { lang: 'rust', ext: '.rs' },
        { lang: 'typescript', ext: '.ts' }
      ];

      const { result } = renderHook(() => useCodeGeneration());

      languages.forEach(({ lang, ext }) => {
        vi.clearAllMocks();

        act(() => {
          result.current.openGenerateModal(mockContext, [mockProduct]);
        });

        act(() => {
          result.current.handleGenerate(lang, 'com.example', `test${ext}`);
        });

        expect(codegen.createCodeGenerator).toHaveBeenCalledWith({
          language: lang,
          namespace: 'com.example',
          context: mockCodeGenerationContext
        });
      });
    });
  });

  describe('Integration Flow', () => {
    it('should complete full workflow from open to generate to close', () => {
      const { result } = renderHook(() => useCodeGeneration());

      // Initial state
      expect(result.current.isModalOpen).toBe(false);

      // Open modal
      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.generationContext).toBeTruthy();

      // Generate
      act(() => {
        result.current.handleGenerate('golang', 'com.example.usermgmt', 'schemas.go');
      });

      expect(codegen.createCodeGenerator).toHaveBeenCalled();
      expect(codeGenerationHelper.downloadGeneratedCode).toHaveBeenCalled();
      expect(result.current.isModalOpen).toBe(false);
    });

    it('should allow canceling without generating', () => {
      const { result } = renderHook(() => useCodeGeneration());

      act(() => {
        result.current.openGenerateModal(mockContext, [mockProduct]);
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.closeGenerateModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(codegen.createCodeGenerator).not.toHaveBeenCalled();
      expect(codeGenerationHelper.downloadGeneratedCode).not.toHaveBeenCalled();
    });
  });
});
