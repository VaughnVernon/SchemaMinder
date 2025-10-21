import { describe, it, expect } from 'vitest';
import { sortRegistryData } from '../../src/services/schemaRegistry';
import { Product, Domain, Context, Schema, SchemaTypeCategory, SchemaScope } from '../../src/types/schema';

describe('schemaRegistry', () => {
  describe('sortRegistryData', () => {
    const createMockSchema = (id: string, name: string, category: SchemaTypeCategory = SchemaTypeCategory.Commands): Schema => ({
      id,
      name,
      description: `${name} description`,
      schemaTypeCategory: category,
      scope: SchemaScope.Private,
      versions: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const createMockContext = (id: string, name: string, schemas: Schema[] = []): Context => ({
      id,
      name,
      description: `${name} description`,
      schemas,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const createMockDomain = (id: string, name: string, contexts: Context[] = []): Domain => ({
      id,
      name,
      description: `${name} description`,
      contexts,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const createMockProduct = (id: string, name: string, domains: Domain[] = []): Product => ({
      id,
      name,
      description: `${name} description`,
      domains,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    it('should sort products alphabetically', () => {
      const unsortedProducts = [
        createMockProduct('3', 'Zebra Product'),
        createMockProduct('1', 'Alpha Product'),
        createMockProduct('2', 'Beta Product')
      ];

      const result = sortRegistryData(unsortedProducts);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Alpha Product');
      expect(result[1].name).toBe('Beta Product');
      expect(result[2].name).toBe('Zebra Product');
    });

    it('should sort domains within products alphabetically', () => {
      const product = createMockProduct('1', 'Test Product', [
        createMockDomain('3', 'Zebra Domain'),
        createMockDomain('1', 'Alpha Domain'),
        createMockDomain('2', 'Beta Domain')
      ]);

      const result = sortRegistryData([product]);

      expect(result[0].domains).toHaveLength(3);
      expect(result[0].domains[0].name).toBe('Alpha Domain');
      expect(result[0].domains[1].name).toBe('Beta Domain');
      expect(result[0].domains[2].name).toBe('Zebra Domain');
    });

    it('should sort contexts within domains alphabetically', () => {
      const domain = createMockDomain('1', 'Test Domain', [
        createMockContext('3', 'Zebra Context'),
        createMockContext('1', 'Alpha Context'),
        createMockContext('2', 'Beta Context')
      ]);
      const product = createMockProduct('1', 'Test Product', [domain]);

      const result = sortRegistryData([product]);

      expect(result[0].domains[0].contexts).toHaveLength(3);
      expect(result[0].domains[0].contexts[0].name).toBe('Alpha Context');
      expect(result[0].domains[0].contexts[1].name).toBe('Beta Context');
      expect(result[0].domains[0].contexts[2].name).toBe('Zebra Context');
    });

    it('should sort schemas within contexts alphabetically', () => {
      const schemas = [
        createMockSchema('3', 'Zebra Schema'),
        createMockSchema('1', 'Alpha Schema'),
        createMockSchema('2', 'Beta Schema')
      ];
      const context = createMockContext('1', 'Test Context', schemas);
      const domain = createMockDomain('1', 'Test Domain', [context]);
      const product = createMockProduct('1', 'Test Product', [domain]);

      const result = sortRegistryData([product]);

      expect(result[0].domains[0].contexts[0].schemas).toHaveLength(3);
      expect(result[0].domains[0].contexts[0].schemas[0].name).toBe('Alpha Schema');
      expect(result[0].domains[0].contexts[0].schemas[1].name).toBe('Beta Schema');
      expect(result[0].domains[0].contexts[0].schemas[2].name).toBe('Zebra Schema');
    });

    it('should perform case-insensitive sorting', () => {
      const unsortedProducts = [
        createMockProduct('1', 'zebra product'),
        createMockProduct('2', 'Alpha Product'),
        createMockProduct('3', 'beta product')
      ];

      const result = sortRegistryData(unsortedProducts);

      expect(result[0].name).toBe('Alpha Product');
      expect(result[1].name).toBe('beta product');
      expect(result[2].name).toBe('zebra product');
    });

    it('should sort nested hierarchies correctly', () => {
      const schemas1 = [
        createMockSchema('schema-2', 'Beta Schema', SchemaTypeCategory.Events),
        createMockSchema('schema-1', 'Alpha Schema', SchemaTypeCategory.Events)
      ];
      const schemas2 = [
        createMockSchema('schema-4', 'Delta Schema', SchemaTypeCategory.Commands),
        createMockSchema('schema-3', 'Gamma Schema', SchemaTypeCategory.Commands)
      ];

      const contexts = [
        createMockContext('context-2', 'Beta Context', schemas2),
        createMockContext('context-1', 'Alpha Context', schemas1)
      ];

      const domains = [
        createMockDomain('domain-2', 'Beta Domain', [contexts[1]]),
        createMockDomain('domain-1', 'Alpha Domain', [contexts[0]])
      ];

      const products = [
        createMockProduct('product-2', 'Beta Product', [domains[1]]),
        createMockProduct('product-1', 'Alpha Product', [domains[0]])
      ];

      const result = sortRegistryData(products);

      // Check product sorting
      expect(result[0].name).toBe('Alpha Product');
      expect(result[1].name).toBe('Beta Product');

      // Check domain sorting
      expect(result[0].domains[0].name).toBe('Beta Domain');
      expect(result[1].domains[0].name).toBe('Alpha Domain');

      // Check context sorting
      expect(result[0].domains[0].contexts[0].name).toBe('Alpha Context');
      expect(result[1].domains[0].contexts[0].name).toBe('Beta Context');

      // Check schema sorting
      expect(result[0].domains[0].contexts[0].schemas[0].name).toBe('Alpha Schema');
      expect(result[0].domains[0].contexts[0].schemas[1].name).toBe('Beta Schema');
      expect(result[1].domains[0].contexts[0].schemas[0].name).toBe('Delta Schema');
      expect(result[1].domains[0].contexts[0].schemas[1].name).toBe('Gamma Schema');
    });

    it('should handle empty arrays gracefully', () => {
      const result = sortRegistryData([]);
      expect(result).toEqual([]);
    });

    it('should handle products with no domains', () => {
      const products = [createMockProduct('1', 'Test Product', [])];
      const result = sortRegistryData(products);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
      expect(result[0].domains).toEqual([]);
    });

    it('should handle domains with no contexts', () => {
      const domain = createMockDomain('1', 'Test Domain', []);
      const product = createMockProduct('1', 'Test Product', [domain]);
      
      const result = sortRegistryData([product]);
      
      expect(result[0].domains).toHaveLength(1);
      expect(result[0].domains[0].name).toBe('Test Domain');
      expect(result[0].domains[0].contexts).toEqual([]);
    });

    it('should handle contexts with no schemas', () => {
      const context = createMockContext('1', 'Test Context', []);
      const domain = createMockDomain('1', 'Test Domain', [context]);
      const product = createMockProduct('1', 'Test Product', [domain]);
      
      const result = sortRegistryData([product]);
      
      expect(result[0].domains[0].contexts).toHaveLength(1);
      expect(result[0].domains[0].contexts[0].name).toBe('Test Context');
      expect(result[0].domains[0].contexts[0].schemas).toEqual([]);
    });

    it('should not mutate the original data', () => {
      const originalProducts = [
        createMockProduct('2', 'Beta Product'),
        createMockProduct('1', 'Alpha Product')
      ];
      const originalProductsCopy = JSON.parse(JSON.stringify(originalProducts));

      const result = sortRegistryData(originalProducts);

      // Original data should remain unchanged
      expect(originalProducts).toEqual(originalProductsCopy);
      
      // Result should be different
      expect(result[0].name).toBe('Alpha Product');
      expect(result[1].name).toBe('Beta Product');
      
      // But original should still be in original order
      expect(originalProducts[0].name).toBe('Beta Product');
      expect(originalProducts[1].name).toBe('Alpha Product');
    });

    it('should sort schemas with different categories independently', () => {
      const schemas = [
        createMockSchema('event-2', 'Zebra Event', SchemaTypeCategory.Events),
        createMockSchema('cmd-1', 'Alpha Command', SchemaTypeCategory.Commands),
        createMockSchema('event-1', 'Alpha Event', SchemaTypeCategory.Events),
        createMockSchema('cmd-2', 'Zebra Command', SchemaTypeCategory.Commands)
      ];

      const context = createMockContext('1', 'Test Context', schemas);
      const domain = createMockDomain('1', 'Test Domain', [context]);
      const product = createMockProduct('1', 'Test Product', [domain]);

      const result = sortRegistryData([product]);
      const resultSchemas = result[0].domains[0].contexts[0].schemas;

      // All schemas should be sorted by name regardless of category
      expect(resultSchemas[0].name).toBe('Alpha Command');
      expect(resultSchemas[1].name).toBe('Alpha Event');
      expect(resultSchemas[2].name).toBe('Zebra Command');
      expect(resultSchemas[3].name).toBe('Zebra Event');
    });

    it('should handle unicode and special characters in names', () => {
      const products = [
        createMockProduct('1', 'Ñandú Product'),
        createMockProduct('2', 'Zebra Product'),
        createMockProduct('3', 'Águila Product'),
        createMockProduct('4', 'Beta Product')
      ];

      const result = sortRegistryData(products);

      // Should sort correctly with unicode characters
      expect(result[0].name).toBe('Águila Product');
      expect(result[1].name).toBe('Beta Product');
      expect(result[2].name).toBe('Ñandú Product');
      expect(result[3].name).toBe('Zebra Product');
    });
  });
});