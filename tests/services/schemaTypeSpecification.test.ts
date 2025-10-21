import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSpecificationTemplate,
  updateExistingSpecification,
  formatSpecification,
  getCurrentVersionString,
  getSuggestedNextVersion,
  getPreviousSpecification,
  hasNonDraftVersions,
  updateAllVersionSpecifications
} from '../../src/services/schemaTypeSpecification';
import { Schema, SchemaVersion, SchemaTypeCategory } from '../../src/types/schema';

describe('SchemaTypeSpecification Service', () => {
  const mockCategoryConfig = {
    categoryName: 'Commands',
    friendlyName: 'Commands',
    typeName: 'command'
  };

  const createMockSchema = (versions: SchemaVersion[] = []): Schema => ({
    id: 'schema-1',
    name: 'TestSchema',
    description: 'Test schema',
    schemaTypeCategory: 'Commands',
    scope: 'Private',
    contextId: 'context-1',
    createdAt: '2023-01-01',
    versions
  });

  const createMockVersion = (semanticVersion: string, status: string = 'Draft', specification: string = 'command Test {}'): SchemaVersion => ({
    id: `version-${semanticVersion}`,
    specification,
    semanticVersion,
    description: `Version ${semanticVersion}`,
    status,
    schemaId: 'schema-1',
    createdAt: '2023-01-01'
  });

  describe('generateSpecificationTemplate', () => {
    it('should generate template with category and schema name', () => {
      const result = generateSpecificationTemplate(mockCategoryConfig, 'UserCreated');

      expect(result).toBe(`command UserCreated {
  // TODO: details here
}`);
    });

    it('should trim whitespace from schema name', () => {
      const result = generateSpecificationTemplate(mockCategoryConfig, '  UserCreated  ');

      expect(result).toBe(`command UserCreated {
  // TODO: details here
}`);
    });

    it('should work with different category configs', () => {
      const eventConfig = {
        categoryName: 'Events',
        friendlyName: 'Events',
        typeName: 'event'
      };

      const result = generateSpecificationTemplate(eventConfig, 'OrderPlaced');

      expect(result).toBe(`event OrderPlaced {
  // TODO: details here
}`);
    });
  });

  describe('updateExistingSpecification', () => {
    it('should update both typeName and schemaName in complete specification', () => {
      const existing = `command OldName {
  string field1
  int field2
}`;

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe(`command NewName {
  string field1
  int field2
}`);
    });

    it('should preserve complex formatting and whitespace', () => {
      const existing = `event  OldName   {
  string field1 = "default"
  // comment here
  int[] numbers = { 1, 2, 3 }
}`;

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe(`command  NewName   {
  string field1 = "default"
  // comment here
  int[] numbers = { 1, 2, 3 }
}`);
    });

    it('should handle specifications without opening brace', () => {
      const existing = 'event OldName';

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe(`command NewName {
  // TODO: details here
}`);
    });

    it('should add schema name to specification with only typeName', () => {
      const existing = 'command';

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewSchema');

      expect(result).toBe(`command NewSchema {
  // TODO: details here
}`);
    });

    it('should not update tokens that are not valid typeNames', () => {
      const existing = `SomeClass OldName {
  string field1
}`;

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe(`SomeClass NewName {
  string field1
}`);
    });

    it('should handle empty schema name gracefully', () => {
      const existing = 'command OldName { }';

      const result = updateExistingSpecification(existing, mockCategoryConfig, '');

      expect(result).toBe('command OldName { }');
    });

    it('should return as-is for unparseable specifications', () => {
      const existing = 'completely unparseable text with no structure';

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe('completely unparseable text with no structure');
    });

    it('should handle partial specifications with whitespace', () => {
      const existing = '  command   OldName  ';

      const result = updateExistingSpecification(existing, mockCategoryConfig, 'NewName');

      expect(result).toBe(`command NewName {
  // TODO: details here
}`);
    });
  });

  describe('formatSpecification', () => {
    it('should generate template when specification is empty and name is provided', () => {
      const result = formatSpecification('', 'Commands', 'UserCreated');

      expect(result).toBe(`command UserCreated {
  // TODO: details here
}`);
    });

    it('should update existing specification', () => {
      const existing = 'event OldName { }';

      const result = formatSpecification(existing, 'Commands', 'NewName');

      expect(result).toBe('command NewName { }');
    });

    it('should return empty string when both specification and name are empty', () => {
      const result = formatSpecification('', 'Commands', '');

      expect(result).toBe('');
    });

    it('should return empty string when specification is whitespace-only and name is empty', () => {
      const result = formatSpecification('   ', 'Commands', '');

      expect(result).toBe('');
    });

    it('should throw error for invalid category', () => {
      expect(() => {
        formatSpecification('', 'InvalidCategory' as SchemaTypeCategory, 'TestName');
      }).toThrow('Invalid schema type category: InvalidCategory');
    });

    it('should work with all valid schema type categories', () => {
      const categories: SchemaTypeCategory[] = ['Commands', 'Data', 'Documents', 'Envelopes', 'Events', 'Queries'];
      
      categories.forEach(category => {
        expect(() => {
          const result = formatSpecification('', category, 'TestSchema');
          expect(result).toContain('TestSchema');
        }).not.toThrow();
      });
    });
  });

  describe('getCurrentVersionString', () => {
    it('should return "0.0.0" for null schema', () => {
      const result = getCurrentVersionString(null);

      expect(result).toBe('0.0.0');
    });

    it('should return "0.0.0" for schema with no versions', () => {
      const schema = createMockSchema([]);

      const result = getCurrentVersionString(schema);

      expect(result).toBe('0.0.0');
    });

    it('should return base version when provided', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0'),
        createMockVersion('2.0.0'),
        createMockVersion('1.5.0')
      ]);
      const baseVersion = createMockVersion('1.2.0');

      const result = getCurrentVersionString(schema, baseVersion);

      expect(result).toBe('1.2.0');
    });

    it('should return latest version when no base version provided', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0'),
        createMockVersion('1.2.0'),
        createMockVersion('2.1.0'),
        createMockVersion('1.5.0')
      ]);

      const result = getCurrentVersionString(schema);

      expect(result).toBe('2.1.0');
    });

    it('should handle semantic version sorting correctly', () => {
      const schema = createMockSchema([
        createMockVersion('1.10.0'),
        createMockVersion('1.2.0'),
        createMockVersion('1.9.0'),
        createMockVersion('2.0.0')
      ]);

      const result = getCurrentVersionString(schema);

      expect(result).toBe('2.0.0');
    });
  });

  describe('getSuggestedNextVersion', () => {
    it('should return "0.1.0" for null schema', () => {
      const result = getSuggestedNextVersion(null);

      expect(result).toBe('0.1.0');
    });

    it('should return "0.1.0" for schema with no versions', () => {
      const schema = createMockSchema([]);

      const result = getSuggestedNextVersion(schema);

      expect(result).toBe('0.1.0');
    });

    it('should suggest next minor version within same major version', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0'),
        createMockVersion('1.2.0'),
        createMockVersion('1.5.0')
      ]);

      const result = getSuggestedNextVersion(schema);

      expect(result).toBe('1.6.0');
    });

    it('should suggest next minor version based on base version', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0'),
        createMockVersion('1.3.0'),
        createMockVersion('2.0.0'),
        createMockVersion('2.1.0')
      ]);
      const baseVersion = createMockVersion('1.1.0');

      const result = getSuggestedNextVersion(schema, baseVersion);

      expect(result).toBe('1.4.0'); // Next after highest in major version 1
    });

    it('should handle major version 0 correctly', () => {
      const schema = createMockSchema([
        createMockVersion('0.1.0'),
        createMockVersion('0.3.0'),
        createMockVersion('0.2.0')
      ]);

      const result = getSuggestedNextVersion(schema);

      expect(result).toBe('0.4.0');
    });

    it('should work with mixed major versions', () => {
      const schema = createMockSchema([
        createMockVersion('1.5.0'),
        createMockVersion('2.1.0'),
        createMockVersion('1.8.0'),
        createMockVersion('2.0.0')
      ]);

      const result = getSuggestedNextVersion(schema);

      expect(result).toBe('2.2.0'); // Based on latest version (2.1.0)
    });

    it('should handle invalid version formats gracefully', () => {
      const schema = createMockSchema([
        createMockVersion('invalid'),
        createMockVersion('1.0.0')
      ]);

      const result = getSuggestedNextVersion(schema);

      expect(result).toBe('1.1.0');
    });
  });

  describe('getPreviousSpecification', () => {
    it('should return undefined for null schema', () => {
      const result = getPreviousSpecification(null);

      expect(result).toBeUndefined();
    });

    it('should return undefined for schema with no versions', () => {
      const schema = createMockSchema([]);

      const result = getPreviousSpecification(schema);

      expect(result).toBeUndefined();
    });

    it('should return base version specification when provided', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft', 'command Old {}'),
        createMockVersion('2.0.0', 'Published', 'command New {}')
      ]);
      const baseVersion = createMockVersion('1.5.0', 'Draft', 'command Base {}');

      const result = getPreviousSpecification(schema, baseVersion);

      expect(result).toBe('command Base {}');
    });

    it('should return latest version specification when no base version', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft', 'command V1 {}'),
        createMockVersion('1.2.0', 'Published', 'command Latest {}'),
        createMockVersion('1.1.0', 'Published', 'command V2 {}')
      ]);

      const result = getPreviousSpecification(schema);

      expect(result).toBe('command Latest {}');
    });
  });

  describe('hasNonDraftVersions', () => {
    it('should return false for null schema', () => {
      const result = hasNonDraftVersions(null);

      expect(result).toBe(false);
    });

    it('should return false for schema with no versions', () => {
      const schema = createMockSchema([]);

      const result = hasNonDraftVersions(schema);

      expect(result).toBe(false);
    });

    it('should return false when all versions are Draft', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft'),
        createMockVersion('1.1.0', 'Draft'),
        createMockVersion('1.2.0', 'Draft')
      ]);

      const result = hasNonDraftVersions(schema);

      expect(result).toBe(false);
    });

    it('should return true when at least one version is Published', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft'),
        createMockVersion('1.1.0', 'Published'),
        createMockVersion('1.2.0', 'Draft')
      ]);

      const result = hasNonDraftVersions(schema);

      expect(result).toBe(true);
    });

    it('should return true when version is Deprecated', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft'),
        createMockVersion('1.1.0', 'Deprecated')
      ]);

      const result = hasNonDraftVersions(schema);

      expect(result).toBe(true);
    });

    it('should return true when version is Removed', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Removed')
      ]);

      const result = hasNonDraftVersions(schema);

      expect(result).toBe(true);
    });
  });

  describe('updateAllVersionSpecifications', () => {
    it('should return empty array for null schema', () => {
      const result = updateAllVersionSpecifications(null as any, 'NewName');

      expect(result).toEqual([]);
    });

    it('should return empty array for schema with no versions', () => {
      const schema = createMockSchema([]);

      const result = updateAllVersionSpecifications(schema, 'NewName');

      expect(result).toEqual([]);
    });

    it('should update all version specifications with new schema name', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft', 'command OldName { string field1 }'),
        createMockVersion('1.1.0', 'Published', 'command OldName { string field1; int field2 }'),
        createMockVersion('2.0.0', 'Deprecated', 'command OldName { int field1 }')
      ]);

      const result = updateAllVersionSpecifications(schema, 'NewSchemaName');

      expect(result).toHaveLength(3);
      expect(result[0].specification).toBe('command NewSchemaName { string field1 }');
      expect(result[1].specification).toBe('command NewSchemaName { string field1; int field2 }');
      expect(result[2].specification).toBe('command NewSchemaName { int field1 }');

      // Should preserve other properties
      expect(result[0].semanticVersion).toBe('1.0.0');
      expect(result[0].status).toBe('Draft');
      expect(result[1].status).toBe('Published');
      expect(result[2].status).toBe('Deprecated');
    });

    it('should preserve all version properties except specification', () => {
      const originalVersion = createMockVersion('1.0.0', 'Published', 'event OldEvent { }');
      originalVersion.description = 'Original description';
      
      const schema = createMockSchema([originalVersion]);

      const result = updateAllVersionSpecifications(schema, 'NewEvent');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(originalVersion.id);
      expect(result[0].semanticVersion).toBe(originalVersion.semanticVersion);
      expect(result[0].description).toBe(originalVersion.description);
      expect(result[0].status).toBe(originalVersion.status);
      expect(result[0].schemaId).toBe(originalVersion.schemaId);
      expect(result[0].createdAt).toBe(originalVersion.createdAt);
      expect(result[0].specification).toBe('command NewEvent { }');
    });

    it('should throw error for invalid schema type category', () => {
      const schema = createMockSchema([
        createMockVersion('1.0.0', 'Draft', 'command Test { }')
      ]);
      schema.schemaTypeCategory = 'InvalidCategory' as SchemaTypeCategory;

      expect(() => {
        updateAllVersionSpecifications(schema, 'NewName');
      }).toThrow('Invalid schema type category: InvalidCategory');
    });

    it('should work with all valid schema type categories', () => {
      const categories: SchemaTypeCategory[] = ['Commands', 'Events', 'Data', 'Documents', 'Queries', 'Envelopes'];
      
      categories.forEach(category => {
        const schema = createMockSchema([
          createMockVersion('1.0.0', 'Draft', 'command OldName { }')
        ]);
        schema.schemaTypeCategory = category;

        expect(() => {
          const result = updateAllVersionSpecifications(schema, 'NewName');
          expect(result).toHaveLength(1);
          expect(result[0].specification).toContain('NewName');
        }).not.toThrow();
      });
    });
  });
});