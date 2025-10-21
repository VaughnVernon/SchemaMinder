import { describe, it, expect } from 'vitest';
import {
  generateSpecificationTemplate,
  updateExistingSpecification,
  formatSpecification,
  hasNonDraftVersions,
  updateAllVersionSpecifications
} from '../src/services/schemaTypeSpecification';
import { SchemaTypeCategory, SCHEMA_TYPE_CATEGORIES, Schema, SchemaStatus } from '../src/types/schema';

describe('Schema Type Specification Service', () => {

  describe('generateSpecificationTemplate', () => {
    it('should generate a basic template with typeName and schemaName', () => {
      const categoryConfig = SCHEMA_TYPE_CATEGORIES.Commands;
      const schemaName = 'CreateUser';

      const result = generateSpecificationTemplate(categoryConfig, schemaName);

      expect(result).toBe(`command CreateUser {
  // TODO: details here
}`);
    });

    it('should handle different category types', () => {
      const eventConfig = SCHEMA_TYPE_CATEGORIES.Events;
      const schemaName = 'UserCreated';

      const result = generateSpecificationTemplate(eventConfig, schemaName);

      expect(result).toBe(`event UserCreated {
  // TODO: details here
}`);
    });

    it('should trim whitespace from schema name', () => {
      const categoryConfig = SCHEMA_TYPE_CATEGORIES.Data;
      const schemaName = '  UserProfile  ';

      const result = generateSpecificationTemplate(categoryConfig, schemaName);

      expect(result).toBe(`data UserProfile {
  // TODO: details here
}`);
    });
  });

  describe('updateExistingSpecification', () => {

    describe('complete specifications with braces', () => {
      it('should update both typeName and schemaName while preserving formatting', () => {
        const existing = `command OldName {
  id: string
  name: string
}`;
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'NewEventName';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`event NewEventName {
  id: string
  name: string
}`);
      });

      it('should preserve complex formatting with multiple lines', () => {
        const existing = `data UserData {
  // User information
  id: string
  name: string

  // Contact details
  email: string
}`;
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Documents;
        const newName = 'UserDocument';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`document UserDocument {
  // User information
  id: string
  name: string

  // Contact details
  email: string
}`);
      });

      it('should update only typeName when schemaName is empty', () => {
        const existing = `command CreateUser {
  name: string
}`;
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const emptyName = '';

        const result = updateExistingSpecification(existing, categoryConfig, emptyName);

        expect(result).toBe(`event CreateUser {
  name: string
}`);
      });

      it('should preserve spaces between tokens', () => {
        const existing = `command    CreateUser    {
  name: string
}`;
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`event    UserCreated    {
  name: string
}`);
      });

      it('should not update non-typeName first tokens', () => {
        const existing = `interface CreateUser {
  name: string
}`;
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`interface UserCreated {
  name: string
}`);
      });
    });

    describe('incomplete specifications without braces', () => {
      it('should complete specification when both tokens exist', () => {
        const existing = 'command OldName';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'NewEvent';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`event NewEvent {
  // TODO: details here
}`);
      });

      it('should add schema name and complete when only typeName exists', () => {
        const existing = 'command';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`event UserCreated {
  // TODO: details here
}`);
      });

      it('should update existing tokens without completing when name is empty', () => {
        const existing = 'command OldName';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const emptyName = '';

        const result = updateExistingSpecification(existing, categoryConfig, emptyName);

        expect(result).toBe('event OldName');
      });

      it('should handle single non-typeName token', () => {
        const existing = 'interface';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`interface UserCreated {
  // TODO: details here
}`);
      });
    });

    describe('edge cases', () => {
      it('should return unchanged specification when it cannot be parsed', () => {
        const existing = 'some random text that does not match patterns';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(existing);
      });

      it('should handle empty specification', () => {
        const existing = '';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = 'UserCreated';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe('');
      });

      it('should trim whitespace from schema name', () => {
        const existing = 'command OldName';
        const categoryConfig = SCHEMA_TYPE_CATEGORIES.Events;
        const newName = '  UserCreated  ';

        const result = updateExistingSpecification(existing, categoryConfig, newName);

        expect(result).toBe(`event UserCreated {
  // TODO: details here
}`);
      });
    });
  });

  describe('formatSpecification', () => {

    it('should generate new template when specification is empty and name is provided', () => {
      const existing = '';
      const category = SchemaTypeCategory.Commands;
      const schemaName = 'CreateUser';

      const result = formatSpecification(existing, category, schemaName);

      expect(result).toBe(`command CreateUser {
  // TODO: details here
}`);
    });

    it('should update existing specification when specification exists', () => {
      const existing = `command OldName {
  id: string
}`;
      const category = SchemaTypeCategory.Events;
      const schemaName = 'UserCreated';

      const result = formatSpecification(existing, category, schemaName);

      expect(result).toBe(`event UserCreated {
  id: string
}`);
    });

    it('should return empty string when both specification and name are empty', () => {
      const existing = '';
      const category = SchemaTypeCategory.Commands;
      const schemaName = '';

      const result = formatSpecification(existing, category, schemaName);

      expect(result).toBe('');
    });

    it('should return empty string when specification is whitespace-only and name is empty', () => {
      const existing = '   ';
      const category = SchemaTypeCategory.Commands;
      const schemaName = '';

      const result = formatSpecification(existing, category, schemaName);

      expect(result).toBe('');
    });

    it('should throw error for invalid category', () => {
      const existing = '';
      const invalidCategory = 'InvalidCategory' as SchemaTypeCategory;
      const schemaName = 'TestSchema';

      expect(() => formatSpecification(existing, invalidCategory, schemaName))
        .toThrow('Invalid schema type category: InvalidCategory');
    });

    describe('integration scenarios', () => {
      it('should handle workflow: empty -> name added -> category changed', () => {
        let spec = '';
        const schemaName = 'UserProfile';

        // Step 1: Add name with Commands category
        spec = formatSpecification(spec, SchemaTypeCategory.Commands, schemaName);
        expect(spec).toBe(`command UserProfile {
  // TODO: details here
}`);

        // Step 2: Change to Events category
        spec = formatSpecification(spec, SchemaTypeCategory.Events, schemaName);
        expect(spec).toBe(`event UserProfile {
  // TODO: details here
}`);
      });

      it('should handle workflow: partial spec -> name change -> category change', () => {
        let spec = 'command OldName';

        // Step 1: Change name
        spec = formatSpecification(spec, SchemaTypeCategory.Commands, 'NewName');
        expect(spec).toBe(`command NewName {
  // TODO: details here
}`);

        // Step 2: Change category
        spec = formatSpecification(spec, SchemaTypeCategory.Data, 'NewName');
        expect(spec).toBe(`data NewName {
  // TODO: details here
}`);
      });

      it('should handle all schema type categories', () => {
        const schemaName = 'TestSchema';
        const existingSpec = `command ${schemaName} {
  id: string
}`;

        Object.entries(SCHEMA_TYPE_CATEGORIES).forEach(([categoryKey, categoryConfig]) => {
          const result = formatSpecification(existingSpec, categoryKey as SchemaTypeCategory, schemaName);
          expect(result).toContain(categoryConfig.typeName);
          expect(result).toContain(schemaName);
          expect(result).toContain('id: string');
        });
      });
    });
  });

  describe('hasNonDraftVersions', () => {
    it('should return false for null schema', () => {
      expect(hasNonDraftVersions(null)).toBe(false);
    });

    it('should return false for schema with no versions', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'TestSchema',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(hasNonDraftVersions(schema)).toBe(false);
    });

    it('should return false when all versions are Draft', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'TestSchema',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command Test {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'v2',
            specification: 'command Test {}',
            semanticVersion: '1.1.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(hasNonDraftVersions(schema)).toBe(false);
    });

    it('should return true when at least one version is Published', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'TestSchema',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command Test {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Published,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'v2',
            specification: 'command Test {}',
            semanticVersion: '1.1.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(hasNonDraftVersions(schema)).toBe(true);
    });

    it('should return true when version is Deprecated', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'TestSchema',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command Test {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Deprecated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(hasNonDraftVersions(schema)).toBe(true);
    });

    it('should return true when version is Removed', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'TestSchema',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command Test {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Removed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(hasNonDraftVersions(schema)).toBe(true);
    });
  });

  describe('updateAllVersionSpecifications', () => {
    it('should return empty array for schema with no versions', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'OldName',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = updateAllVersionSpecifications(schema, 'NewName');
      expect(result).toEqual([]);
    });

    it('should update all version specifications with new schema name', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'OldName',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Commands,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command OldName { id: string }',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'v2',
            specification: 'command OldName { id: string, name: string }',
            semanticVersion: '1.1.0',
            status: SchemaStatus.Published,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = updateAllVersionSpecifications(schema, 'NewName');

      expect(result).toHaveLength(2);
      expect(result[0].specification).toBe('command NewName { id: string }');
      expect(result[1].specification).toBe('command NewName { id: string, name: string }');
      expect(result[0].id).toBe('v1');
      expect(result[1].id).toBe('v2');
    });

    it('should preserve version properties except specification', () => {
      const createdDate = new Date('2024-01-01');
      const updatedDate = new Date('2024-01-02');
      const schema: Schema = {
        id: 'schema1',
        name: 'OldName',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'version-123',
            specification: 'event OldName { timestamp: string }',
            semanticVersion: '2.5.3',
            status: SchemaStatus.Deprecated,
            description: 'Version description',
            createdAt: createdDate,
            updatedAt: updatedDate
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = updateAllVersionSpecifications(schema, 'NewEventName');

      expect(result).toHaveLength(1);
      const updatedVersion = result[0];
      expect(updatedVersion.id).toBe('version-123');
      expect(updatedVersion.specification).toBe('event NewEventName { timestamp: string }');
      expect(updatedVersion.semanticVersion).toBe('2.5.3');
      expect(updatedVersion.status).toBe(SchemaStatus.Deprecated);
      expect(updatedVersion.description).toBe('Version description');
      expect(updatedVersion.createdAt).toBe(createdDate);
      expect(updatedVersion.updatedAt).toBe(updatedDate);
    });

    it('should handle versions with different specification formats', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'OldName',
        description: 'Test',
        schemaTypeCategory: SchemaTypeCategory.Data,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'data OldName {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'v2',
            specification: 'data    OldName    {  }',
            semanticVersion: '1.1.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'v3',
            specification: `data OldName {
  field1: string
  field2: number
}`,
            semanticVersion: '1.2.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = updateAllVersionSpecifications(schema, 'NewDataType');

      expect(result[0].specification).toBe('data NewDataType {}');
      expect(result[1].specification).toBe('data    NewDataType    {  }');
      expect(result[2].specification).toBe(`data NewDataType {
  field1: string
  field2: number
}`);
    });

    it('should throw error for invalid schema type category', () => {
      const schema: Schema = {
        id: 'schema1',
        name: 'OldName',
        description: 'Test',
        schemaTypeCategory: 'InvalidCategory' as SchemaTypeCategory,
        scope: 'Public',
        contextId: 'ctx1',
        versions: [
          {
            id: 'v1',
            specification: 'command OldName {}',
            semanticVersion: '1.0.0',
            status: SchemaStatus.Draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(() => updateAllVersionSpecifications(schema, 'NewName'))
        .toThrow('Invalid schema type category: InvalidCategory');
    });
  });
});