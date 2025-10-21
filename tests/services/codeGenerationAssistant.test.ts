import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCodeGenerationContext, formatContextPath, downloadGeneratedCode } from '../../src/services/codeGenerationAssistant';
import { Context, Product, Schema } from '../../src/types/schema';

describe('codeGenerationAssistant', () => {
  const mockSchema: Schema = {
    id: 'schema-1',
    name: 'UserRegistered',
    schemaTypeCategory: 'Events',
    scope: 'Public',
    contextId: 'ctx-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    versions: [
      {
        id: 'v1',
        schemaId: 'schema-1',
        semanticVersion: '1.0.0',
        status: 'Published',
        specification: 'event UserRegistered { string userId }',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ]
  };

  const mockContext: Context = {
    id: 'ctx-1',
    name: 'UserManagement',
    namespace: 'Com.Example.UserMgmt',
    domainId: 'dom-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    schemas: [mockSchema]
  };

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'TestProduct',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    domains: [
      {
        id: 'dom-1',
        name: 'TestDomain',
        productId: 'prod-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        contexts: [mockContext]
      }
    ]
  };

  describe('buildCodeGenerationContext', () => {
    it('should build context with product and domain names', () => {
      const result = buildCodeGenerationContext(mockContext, [mockProduct]);

      expect(result).not.toBeNull();
      expect(result?.productName).toBe('TestProduct');
      expect(result?.domainName).toBe('TestDomain');
      expect(result?.contextName).toBe('UserManagement');
      expect(result?.contextNamespace).toBe('Com.Example.UserMgmt');
    });

    it('should include all schemas with versions', () => {
      const result = buildCodeGenerationContext(mockContext, [mockProduct]);

      expect(result?.schemas).toHaveLength(1);
      expect(result?.schemas[0].schema).toEqual(mockSchema);
      expect(result?.schemas[0].versions).toEqual(mockSchema.versions);
    });

    it('should handle context with multiple schemas', () => {
      const schema2: Schema = {
        id: 'schema-2',
        name: 'UserUpdated',
        schemaTypeCategory: 'Events',
        scope: 'Public',
        contextId: 'ctx-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        versions: []
      };

      const contextWithMultipleSchemas: Context = {
        ...mockContext,
        schemas: [mockSchema, schema2]
      };

      const productWithContext = {
        ...mockProduct,
        domains: [{
          ...mockProduct.domains[0],
          contexts: [contextWithMultipleSchemas]
        }]
      };

      const result = buildCodeGenerationContext(contextWithMultipleSchemas, [productWithContext]);

      expect(result?.schemas).toHaveLength(2);
      expect(result?.schemas[0].schema.name).toBe('UserRegistered');
      expect(result?.schemas[1].schema.name).toBe('UserUpdated');
    });

    it('should handle empty schema versions array', () => {
      const schemaWithoutVersions: Schema = {
        ...mockSchema,
        versions: []
      };

      const contextWithoutVersions: Context = {
        ...mockContext,
        schemas: [schemaWithoutVersions]
      };

      const productWithContext = {
        ...mockProduct,
        domains: [{
          ...mockProduct.domains[0],
          contexts: [contextWithoutVersions]
        }]
      };

      const result = buildCodeGenerationContext(contextWithoutVersions, [productWithContext]);

      expect(result?.schemas).toHaveLength(1);
      expect(result?.schemas[0].versions).toEqual([]);
    });

    it('should handle context with no schemas', () => {
      const contextWithoutSchemas: Context = {
        ...mockContext,
        schemas: []
      };

      const productWithContext = {
        ...mockProduct,
        domains: [{
          ...mockProduct.domains[0],
          contexts: [contextWithoutSchemas]
        }]
      };

      const result = buildCodeGenerationContext(contextWithoutSchemas, [productWithContext]);

      expect(result?.schemas).toEqual([]);
    });

    it('should return null if context not found in product hierarchy', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const orphanContext: Context = {
        ...mockContext,
        id: 'ctx-orphan'
      };

      const result = buildCodeGenerationContext(orphanContext, [mockProduct]);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Could not find parent hierarchy for context:', 'ctx-orphan');

      consoleSpy.mockRestore();
    });

    it('should return null if products array is empty', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = buildCodeGenerationContext(mockContext, []);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should search through multiple products to find context', () => {
      const product1: Product = {
        id: 'prod-1',
        name: 'Product1',
        createdAt: new Date(),
        updatedAt: new Date(),
        domains: []
      };

      const product2: Product = {
        id: 'prod-2',
        name: 'Product2',
        createdAt: new Date(),
        updatedAt: new Date(),
        domains: [
          {
            id: 'dom-2',
            name: 'Domain2',
            productId: 'prod-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            contexts: [mockContext]
          }
        ]
      };

      const result = buildCodeGenerationContext(mockContext, [product1, product2]);

      expect(result).not.toBeNull();
      expect(result?.productName).toBe('Product2');
      expect(result?.domainName).toBe('Domain2');
    });

    it('should handle domains without contexts array', () => {
      const productWithEmptyDomains: Product = {
        ...mockProduct,
        domains: [
          {
            id: 'dom-1',
            name: 'TestDomain',
            productId: 'prod-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            contexts: undefined as any
          }
        ]
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = buildCodeGenerationContext(mockContext, [productWithEmptyDomains]);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('formatContextPath', () => {
    it('should format complete path with product, domain, and context', () => {
      const result = formatContextPath(mockContext, [mockProduct]);

      expect(result).toBe('TestProduct / TestDomain / UserManagement');
    });

    it('should return only context name if not found in hierarchy', () => {
      const orphanContext: Context = {
        ...mockContext,
        id: 'ctx-orphan',
        name: 'OrphanContext'
      };

      const result = formatContextPath(orphanContext, [mockProduct]);

      expect(result).toBe('OrphanContext');
    });

    it('should search through multiple products', () => {
      const product1: Product = {
        id: 'prod-1',
        name: 'Product1',
        createdAt: new Date(),
        updatedAt: new Date(),
        domains: []
      };

      const product2: Product = {
        id: 'prod-2',
        name: 'Product2',
        createdAt: new Date(),
        updatedAt: new Date(),
        domains: [
          {
            id: 'dom-2',
            name: 'Domain2',
            productId: 'prod-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            contexts: [mockContext]
          }
        ]
      };

      const result = formatContextPath(mockContext, [product1, product2]);

      expect(result).toBe('Product2 / Domain2 / UserManagement');
    });

    it('should handle empty products array', () => {
      const result = formatContextPath(mockContext, []);

      expect(result).toBe('UserManagement');
    });

    it('should handle special characters in names', () => {
      const specialContext: Context = {
        ...mockContext,
        name: 'User-Management_System'
      };

      const specialProduct: Product = {
        ...mockProduct,
        name: 'Test Product (v2)',
        domains: [{
          ...mockProduct.domains[0],
          name: 'Test-Domain',
          contexts: [specialContext]
        }]
      };

      const result = formatContextPath(specialContext, [specialProduct]);

      expect(result).toBe('Test Product (v2) / Test-Domain / User-Management_System');
    });
  });

  describe('downloadGeneratedCode', () => {
    let createElementSpy: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let mockLink: any;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };

      // Mock URL methods if they don't exist
      if (!URL.createObjectURL) {
        (URL as any).createObjectURL = vi.fn();
      }
      if (!URL.revokeObjectURL) {
        (URL as any).revokeObjectURL = vi.fn();
      }

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
    });

    afterEach(() => {
      if (createElementSpy) createElementSpy.mockRestore();
      if (createObjectURLSpy) createObjectURLSpy.mockRestore();
      if (revokeObjectURLSpy) revokeObjectURLSpy.mockRestore();
      if (appendChildSpy) appendChildSpy.mockRestore();
      if (removeChildSpy) removeChildSpy.mockRestore();
    });

    it('should create download link with correct filename and content', () => {
      const filename = 'TestSchemas.cs';
      const content = '// Generated C# code\nnamespace Test {}';

      downloadGeneratedCode(filename, content);

      // Check blob creation
      expect(createObjectURLSpy).toHaveBeenCalled();
      const blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain;charset=utf-8');

      // Check link creation
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe(filename);

      // Check link was clicked and cleaned up
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle different file extensions', () => {
      const testCases = [
        { filename: 'schemas.go', content: 'package main' },
        { filename: 'Schemas.java', content: 'public class Test {}' },
        { filename: 'schemas.js', content: 'export class Test {}' },
        { filename: 'schemas.rs', content: 'fn main() {}' },
        { filename: 'schemas.ts', content: 'interface Test {}' }
      ];

      testCases.forEach(({ filename, content }) => {
        vi.clearAllMocks();

        downloadGeneratedCode(filename, content);

        expect(mockLink.download).toBe(filename);
        expect(createObjectURLSpy).toHaveBeenCalled();
      });
    });

    it('should handle empty content', () => {
      downloadGeneratedCode('empty.cs', '');

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of content

      downloadGeneratedCode('large.cs', largeContent);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('should handle special characters in filename', () => {
      const filename = 'User-Management_Schemas (v2).cs';
      const content = '// code';

      downloadGeneratedCode(filename, content);

      expect(mockLink.download).toBe(filename);
    });

    it('should properly clean up resources', () => {
      downloadGeneratedCode('test.cs', 'content');

      // Verify cleanup sequence
      expect(appendChildSpy).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });
});
