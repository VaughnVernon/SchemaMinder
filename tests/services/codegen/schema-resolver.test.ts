import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaResolver } from '../../../src/services/codegen/schema-resolver';
import { SchemaWithVersions } from '../../../src/services/codegen/types';
import { SchemaStatus } from '../../../src/types/schema';

describe('SchemaResolver', () => {
  describe('resolveSchemaVersions', () => {
    it('should select highest semantic version excluding Removed', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              semanticVersion: '0.1.0',
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'v2',
              schemaId: 'schema-1',
              semanticVersion: '0.2.0',
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'v3',
              schemaId: 'schema-1',
              semanticVersion: '0.3.0',
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result).toHaveLength(1);
      expect(result[0].version.semanticVersion).toBe('0.3.0');
    });

    it('should exclude versions with Removed status', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'v2',
              schemaId: 'schema-1',
              semanticVersion: '2.0.0',
              status: SchemaStatus.Removed,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result[0].version.semanticVersion).toBe('1.0.0');
      expect(result[0].version.status).toBe(SchemaStatus.Published);
    });

    it('should include Draft status versions', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'v2',
              schemaId: 'schema-1',
              semanticVersion: '2.0.0',
              status: SchemaStatus.Draft,
              specification: 'event UserEvent { string id string name }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result[0].version.semanticVersion).toBe('2.0.0');
      expect(result[0].version.status).toBe(SchemaStatus.Draft);
    });

    it('should include Deprecated status versions', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'v2',
              schemaId: 'schema-1',
              semanticVersion: '2.0.0',
              status: SchemaStatus.Deprecated,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result[0].version.semanticVersion).toBe('2.0.0');
      expect(result[0].version.status).toBe(SchemaStatus.Deprecated);
    });

    it('should skip schemas with no valid versions', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Removed,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Schema UserEvent has no valid versions to generate');

      consoleSpy.mockRestore();
    });

    it('should handle multiple schemas', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
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
              status: SchemaStatus.Published,
              specification: 'data FullName { string first string last }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result).toHaveLength(2);
      expect(result[0].schema.name).toBe('UserEvent');
      expect(result[1].schema.name).toBe('FullName');
    });

    it('should include category in resolved schema', () => {
      const schemasWithVersions: SchemaWithVersions[] = [
        {
          schema: {
            id: 'schema-1',
            name: 'UserEvent',
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
              status: SchemaStatus.Published,
              specification: 'event UserEvent { string id }',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const result = SchemaResolver.resolveSchemaVersions(schemasWithVersions);

      expect(result[0].category).toBe('Events');
    });
  });

  describe('parseSpecification', () => {
    it('should parse event specification', () => {
      const spec = `event UserRegistered {
  type eventType
  version eventVersion
  timestamp occurredOn
  string userId
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.typeName).toBe('event');
      expect(result.schemaName).toBe('UserRegistered');
      expect(result.fields).toHaveLength(4);
      expect(result.fields[0].name).toBe('eventType');
      expect(result.fields[3].name).toBe('userId');
    });

    it('should parse data specification', () => {
      const spec = `data FullName {
  string givenName
  string familyName
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.typeName).toBe('data');
      expect(result.schemaName).toBe('FullName');
      expect(result.fields).toHaveLength(2);
    });

    it('should parse command specification', () => {
      const spec = `command CreateUser {
  string name
  int age
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.typeName).toBe('command');
      expect(result.schemaName).toBe('CreateUser');
    });

    it('should parse fields with default values', () => {
      const spec = `event UserRegistered {
  string userId
  int age = 18
  boolean active = true
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.fields[0].defaultValue).toBeUndefined();
      expect(result.fields[1].defaultValue).toBe('18');
      expect(result.fields[2].defaultValue).toBe('true');
    });

    it('should parse array fields', () => {
      const spec = `event UserRegistered {
  string[] tags
  int[] scores
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.fields[0].isArray).toBe(true);
      expect(result.fields[0].type).toBe('string');
      expect(result.fields[1].isArray).toBe(true);
      expect(result.fields[1].type).toBe('int');
    });

    it('should parse complex type references', () => {
      const spec = `event UserRegistered {
  data.FullName fullName
  events.UserCreated previousEvent
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.fields[0].isComplex).toBe(true);
      expect(result.fields[0].type).toBe('FullName');
      expect(result.fields[0].category).toBe('data');
      expect(result.fields[1].isComplex).toBe(true);
      expect(result.fields[1].type).toBe('UserCreated');
      expect(result.fields[1].category).toBe('events');
    });

    it('should skip comment lines', () => {
      const spec = `event UserRegistered {
  // This is a comment
  string userId
  // Another comment
  string email
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('userId');
      expect(result.fields[1].name).toBe('email');
    });

    it('should handle all primitive types', () => {
      const spec = `data AllTypes {
  boolean boolField
  byte byteField
  char charField
  short shortField
  int intField
  long longField
  float floatField
  double doubleField
  string stringField
}`;

      const result = SchemaResolver.parseSpecification(spec);

      expect(result.fields).toHaveLength(9);
      expect(result.fields.map(f => f.type)).toEqual([
        'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double', 'string'
      ]);
    });

    it('should throw error for invalid specification format', () => {
      const spec = 'invalid specification';

      expect(() => SchemaResolver.parseSpecification(spec)).toThrow('Invalid schema specification');
    });
  });

  describe('toPascalCase', () => {
    it('should convert lowercase to PascalCase', () => {
      expect(SchemaResolver.toPascalCase('username')).toBe('Username');
    });

    it('should preserve already PascalCase', () => {
      expect(SchemaResolver.toPascalCase('UserName')).toBe('UserName');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(SchemaResolver.toPascalCase('userName')).toBe('UserName');
    });

    it('should handle spaces in names', () => {
      expect(SchemaResolver.toPascalCase('Agile Project Management')).toBe('AgileProjectManagement');
      expect(SchemaResolver.toPascalCase('User Management')).toBe('UserManagement');
      expect(SchemaResolver.toPascalCase('my context name')).toBe('MyContextName');
    });

    it('should handle underscores', () => {
      expect(SchemaResolver.toPascalCase('user_name')).toBe('UserName');
      expect(SchemaResolver.toPascalCase('agile_project_management')).toBe('AgileProjectManagement');
    });

    it('should handle hyphens', () => {
      expect(SchemaResolver.toPascalCase('user-name')).toBe('UserName');
      expect(SchemaResolver.toPascalCase('agile-project-management')).toBe('AgileProjectManagement');
    });

    it('should handle mixed separators', () => {
      expect(SchemaResolver.toPascalCase('user name_test-case')).toBe('UserNameTestCase');
    });

    it('should remove invalid characters', () => {
      expect(SchemaResolver.toPascalCase('user@name#123')).toBe('Username123');
      expect(SchemaResolver.toPascalCase('test!@#$%^&*()name')).toBe('Testname');
    });

    it('should handle single word', () => {
      expect(SchemaResolver.toPascalCase('test')).toBe('Test');
    });

    it('should handle empty string', () => {
      expect(SchemaResolver.toPascalCase('')).toBe('');
    });
  });

  describe('toPascalCaseNamespace', () => {
    it('should convert each segment to PascalCase', () => {
      expect(SchemaResolver.toPascalCaseNamespace('com.example.usermgmt')).toBe('Com.Example.Usermgmt');
    });

    it('should preserve already PascalCase segments', () => {
      expect(SchemaResolver.toPascalCaseNamespace('Com.Example.UserMgmt')).toBe('Com.Example.UserMgmt');
    });

    it('should handle single segment', () => {
      expect(SchemaResolver.toPascalCaseNamespace('namespace')).toBe('Namespace');
    });
  });
});
