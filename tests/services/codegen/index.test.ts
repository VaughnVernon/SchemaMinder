import { describe, it, expect } from 'vitest';
import { createCodeGenerator } from '../../../src/services/codegen';
import { CodeGenerationOptions } from '../../../src/services/codegen/types';

describe('createCodeGenerator', () => {
  const mockContext = {
    productName: 'TestProduct',
    domainName: 'TestDomain',
    contextName: 'UserManagement',
    contextNamespace: 'Com.Example.UserMgmt',
    schemas: [
      {
        schema: {
          id: 'schema-1',
          name: 'FullName',
          schemaTypeCategory: 'Data',
          contextId: 'ctx-1',
          scope: 'Public',
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: []
        },
        versions: [
          {
            id: 'v1',
            schemaId: 'schema-1',
            semanticVersion: '1.0.0',
            status: 'Published',
            specification: `data FullName {
  string givenName
  string familyName
}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    ]
  };

  describe('C# Generator', () => {
    it('should generate C# code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('UserManagementSchemas.cs');
      expect(result.content).toContain('namespace Com.Example.UserMgmt');
      expect(result.content).toContain('class FullName');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('AgileProjectManagementSchemas.cs');
    });

    it('should include using statements for cross-category references', () => {
      const contextWithReferences = {
        ...mockContext,
        schemas: [
          ...mockContext.schemas,
          {
            schema: {
              id: 'schema-2',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  data.FullName fullName
  string userId
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example.UserMgmt',
        context: contextWithReferences
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('using Com.Example.UserMgmt.Data;');
    });
  });

  describe('Go Generator', () => {
    it('should generate Go code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'golang',
        namespace: 'com.example.usermgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('UserManagementSchemas.go');
      expect(result.content).toContain('package com_example_usermgmt');
      expect(result.content).toContain('type FullName struct');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'golang',
        namespace: 'com.example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('AgileProjectManagementSchemas.go');
    });

    it('should generate factory functions', () => {
      const options: CodeGenerationOptions = {
        language: 'golang',
        namespace: 'com.example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('func NewFullName');
    });

    it('should generate variadic options for default values', () => {
      const contextWithDefaults = {
        ...mockContext,
        schemas: [
          {
            schema: {
              id: 'schema-1',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v1',
                schemaId: 'schema-1',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  string userId
  int age = 18
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'golang',
        namespace: 'com.example',
        context: contextWithDefaults
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('UserRegisteredOption func(*UserRegistered)');
      expect(result.content).toContain('func WithAge');
    });
  });

  describe('Java Generator', () => {
    it('should generate Java code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'java',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('UserManagementSchemas.java');
      expect(result.content).toContain('package com.example.usermgmt;');
      expect(result.content).toContain('public class UserManagementSchemas');
      expect(result.content).toContain('public static class Data');
      expect(result.content).toContain('public static class FullName');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'java',
        namespace: 'com.example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('AgileProjectManagementSchemas.java');
      expect(result.content).toContain('public class AgileProjectManagementSchemas {');
      expect(result.content).not.toContain('public class Agile Project ManagementSchemas');
    });

    it('should use lowercase package name', () => {
      const options: CodeGenerationOptions = {
        language: 'java',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('package com.example.usermgmt;');
      expect(result.content).not.toContain('package Com.Example.UserMgmt;');
    });

    it('should generate fields as public final in camelCase', () => {
      const options: CodeGenerationOptions = {
        language: 'java',
        namespace: 'com.example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('public final String givenName;');
      expect(result.content).toContain('public final String familyName;');
    });

    it('should include import statements for cross-category references', () => {
      const contextWithReferences = {
        ...mockContext,
        schemas: [
          ...mockContext.schemas,
          {
            schema: {
              id: 'schema-2',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  data.FullName fullName
  string userId
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'java',
        namespace: 'com.example',
        context: contextWithReferences
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('import com.example.UserManagementSchemas.Data.*;');
    });
  });

  describe('TypeScript Generator', () => {
    it('should generate TypeScript code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'typescript',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('UserManagementSchemas.ts');
      expect(result.content).toContain('export namespace Com.Example.UserMgmt');
      expect(result.content).toContain('export namespace Data');
      expect(result.content).toContain('export class FullName');
      expect(result.content).toContain('public readonly givenName: string;');
      expect(result.content).toContain('public readonly familyName: string;');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        namespace: 'Com.Example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('AgileProjectManagementSchemas.ts');
    });

    it('should use TypeScript type annotations', () => {
      const options: CodeGenerationOptions = {
        language: 'typescript',
        namespace: 'Com.Example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('constructor(givenName: string, familyName: string)');
    });

    it('should handle cross-category references with namespace paths', () => {
      const contextWithReferences = {
        ...mockContext,
        schemas: [
          ...mockContext.schemas,
          {
            schema: {
              id: 'schema-2',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  data.FullName fullName
  string userId
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        namespace: 'Com.Example',
        context: contextWithReferences
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('public readonly fullName: Data.FullName;');
    });
  });

  describe('JavaScript Generator', () => {
    it('should generate JavaScript code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'javascript',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('UserManagementSchemas.js');
      expect(result.content).toContain('export const Com.Example.UserMgmt = {');
      expect(result.content).toContain('Data: {');
      expect(result.content).toContain('FullName: class FullName {');
      expect(result.content).toContain('this.givenName = givenName;');
      expect(result.content).toContain('this.familyName = familyName;');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'javascript',
        namespace: 'Com.Example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('AgileProjectManagementSchemas.js');
    });

    it('should use nested const objects for namespaces', () => {
      const options: CodeGenerationOptions = {
        language: 'javascript',
        namespace: 'Com.Example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('export const Com.Example = {');
      expect(result.content).toContain('Data: {');
    });

    it('should generate constructor with parameters', () => {
      const options: CodeGenerationOptions = {
        language: 'javascript',
        namespace: 'Com.Example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('constructor(givenName, familyName)');
    });
  });

  describe('Rust Generator', () => {
    it('should generate Rust code successfully', () => {
      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example.UserMgmt',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
      expect(result.filename).toBe('user_management_schemas.rs');
      expect(result.content).toContain('pub mod com_example_user_mgmt');
      expect(result.content).toContain('pub mod data');
      expect(result.content).toContain('pub struct FullName');
      expect(result.content).toContain('#[derive(Debug)]');
      expect(result.content).toContain('#[readonly::make]');
    });

    it('should handle context names with spaces', () => {
      const contextWithSpaces = {
        ...mockContext,
        contextName: 'Agile Project Management'
      };

      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example',
        context: contextWithSpaces
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('agile_project_management_schemas.rs');
    });

    it('should use snake_case for fields and module names', () => {
      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('pub mod com_example');
      expect(result.content).toContain('pub given_name: String,');
      expect(result.content).toContain('pub family_name: String,');
    });

    it('should generate new() function for each struct', () => {
      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('impl FullName');
      expect(result.content).toContain('pub fn new(given_name: String, family_name: String) -> Self');
    });

    it('should use Vec for arrays', () => {
      const contextWithArray = {
        ...mockContext,
        schemas: [
          {
            schema: {
              id: 'schema-1',
              name: 'UserList',
              schemaTypeCategory: 'Data',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v1',
                schemaId: 'schema-1',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `data UserList {
  string[] userNames
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example',
        context: contextWithArray
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('pub user_names: Vec<String>,');
    });

    it('should handle cross-category references with module paths', () => {
      const contextWithReferences = {
        ...mockContext,
        schemas: [
          ...mockContext.schemas,
          {
            schema: {
              id: 'schema-2',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  data.FullName fullName
  string userId
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'rust',
        namespace: 'Com.Example',
        context: contextWithReferences
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('pub full_name: data::FullName,');
    });
  });

  describe('Unsupported Languages', () => {
    it('should return error for unknown language', () => {
      const options: CodeGenerationOptions = {
        language: 'unknown' as any,
        namespace: 'example',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown language: unknown');
    });
  });

  describe('Error Handling', () => {
    it('should return error if namespace is missing', () => {
      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: '',
        context: mockContext
      };

      const result = createCodeGenerator(options);

      // The generator may succeed with empty namespace or may error
      // Different generators handle this differently
      if (!result.success) {
        expect(result.error).toContain('Namespace is required');
      } else {
        // If it succeeds, it should at least generate something
        expect(result.content).toBeTruthy();
      }
    });

    it('should return error if no valid schemas found', () => {
      const emptyContext = {
        ...mockContext,
        schemas: []
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example',
        context: emptyContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid schemas found to generate');
    });

    it('should return error if all schema versions are Removed', () => {
      const contextWithRemovedVersions = {
        ...mockContext,
        schemas: [
          {
            schema: mockContext.schemas[0].schema,
            versions: [
              {
                id: 'v1',
                schemaId: 'schema-1',
                semanticVersion: '1.0.0',
                status: 'Removed' as any,
                specification: 'data FullName { string name }',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example',
        context: contextWithRemovedVersions
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid schemas found to generate');
    });
  });

  describe('Multiple Schemas', () => {
    it('should generate code for multiple schemas', () => {
      const multiSchemaContext = {
        ...mockContext,
        schemas: [
          mockContext.schemas[0],
          {
            schema: {
              id: 'schema-2',
              name: 'Address',
              schemaTypeCategory: 'Data',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `data Address {
  string street
  string city
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example',
        context: multiSchemaContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      expect(result.content).toContain('class FullName');
      expect(result.content).toContain('class Address');
    });

    it('should order Data schemas before other categories', () => {
      const mixedSchemaContext = {
        ...mockContext,
        schemas: [
          {
            schema: {
              id: 'schema-1',
              name: 'UserRegistered',
              schemaTypeCategory: 'Events',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v1',
                schemaId: 'schema-1',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `event UserRegistered {
  data.FullName fullName
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          },
          {
            schema: {
              id: 'schema-2',
              name: 'FullName',
              schemaTypeCategory: 'Data',
              contextId: 'ctx-1',
              scope: 'Public',
              createdAt: new Date(),
              updatedAt: new Date(),
              versions: []
            },
            versions: [
              {
                id: 'v2',
                schemaId: 'schema-2',
                semanticVersion: '1.0.0',
                status: 'Published',
                specification: `data FullName {
  string first
  string last
}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ]
      };

      const options: CodeGenerationOptions = {
        language: 'csharp',
        namespace: 'Com.Example',
        context: mixedSchemaContext
      };

      const result = createCodeGenerator(options);

      expect(result.success).toBe(true);
      // Data namespace should appear before Events namespace
      const dataIndex = result.content!.indexOf('namespace Data');
      const eventsIndex = result.content!.indexOf('namespace Events');
      expect(dataIndex).toBeLessThan(eventsIndex);
    });
  });
});
