/**
 * C# Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, ParsedSpecification, LANGUAGE_FILE_EXTENSIONS } from './types';

export class CSharpGenerator extends BaseCodeGenerator {
  /**
   * Generate C# code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for C# code generation');
    }

    // Convert namespace to PascalCase
    const pascalNamespace = this.toPascalCaseNamespace(namespace);

    // Group schemas by category
    const schemasByCategory = this.groupByCategory(schemas);

    // Collect all using statements needed
    const usingStatements = this.collectUsingStatements(schemas, pascalNamespace);

    // Generate using statements at the top
    if (usingStatements.size > 0) {
      Array.from(usingStatements).sort().forEach(u => {
        lines.push(u);
      });
      lines.push('');
    }

    // Generate namespace and nested category namespaces
    lines.push(`namespace ${pascalNamespace}`);
    lines.push('{');

    // Generate each category as a nested namespace
    const categories = ['Data', 'Commands', 'Documents', 'Envelopes', 'Events', 'Queries'];

    for (const category of categories) {
      const categorySchemas = schemasByCategory.get(category);
      if (!categorySchemas || categorySchemas.length === 0) continue;

      lines.push(`    namespace ${category}`);
      lines.push('    {');

      // Generate each class in the category
      for (const resolved of categorySchemas) {
        const classCode = this.generateClass(resolved);
        classCode.forEach(line => {
          lines.push('        ' + line);
        });
        lines.push('');
      }

      lines.push('    }');
      lines.push('');
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Group schemas by category
   */
  private groupByCategory(schemas: ResolvedSchemaVersion[]): Map<string, ResolvedSchemaVersion[]> {
    const map = new Map<string, ResolvedSchemaVersion[]>();

    for (const schema of schemas) {
      const category = schema.category;
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(schema);
    }

    return map;
  }

  /**
   * Collect all using statements needed for cross-category references
   */
  private collectUsingStatements(schemas: ResolvedSchemaVersion[], baseNamespace: string): Set<string> {
    const usings = new Set<string>();

    for (const resolved of schemas) {
      const parsed = this.parseSpecification(resolved.version.specification);
      const currentCategory = resolved.category;

      // Find fields that reference other categories
      for (const field of parsed.fields) {
        if (field.isComplex && field.category && field.category !== currentCategory.toLowerCase()) {
          const refCategory = this.toPascalCase(field.category);
          usings.add(`using ${baseNamespace}.${refCategory};`);
        }
      }
    }

    return usings;
  }

  /**
   * Generate a single class
   */
  private generateClass(resolved: ResolvedSchemaVersion): string[] {
    const lines: string[] = [];
    const parsed = this.parseSpecification(resolved.version.specification);
    const className = this.toPascalCase(parsed.schemaName);

    // Class declaration
    lines.push(`public class ${className}`);
    lines.push('{');

    // Generate properties
    for (const field of parsed.fields) {
      const propertyLine = this.generateProperty(field);
      lines.push('    ' + propertyLine);
    }

    lines.push('');

    // Generate constructor
    const constructorLines = this.generateConstructor(className, parsed.fields);
    constructorLines.forEach(line => {
      lines.push('    ' + line);
    });

    lines.push('}');

    return lines;
  }

  /**
   * Generate a property declaration
   */
  private generateProperty(field: ParsedField): string {
    const propertyName = this.toPascalCase(field.name);
    const csharpType = this.mapToCSharpType(field);

    return `public ${csharpType} ${propertyName} { get; private set; }`;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(className: string, fields: ParsedField[]): string[] {
    const lines: string[] = [];

    // Constructor signature
    const params = fields.map(field => {
      const paramType = this.mapToCSharpType(field);
      const paramName = field.name; // Keep original case for parameters
      return `${paramType} ${paramName}`;
    }).join(', ');

    lines.push(`public ${className}(${params})`);
    lines.push('{');

    // Property assignments
    for (const field of fields) {
      const propertyName = this.toPascalCase(field.name);
      const paramName = field.name;
      lines.push(`    ${propertyName} = ${paramName};`);
    }

    lines.push('}');

    return lines;
  }

  /**
   * Map DSL type to C# type
   */
  private mapToCSharpType(field: ParsedField): string {
    let baseType: string;

    if (field.isComplex) {
      // Complex type reference
      baseType = this.toPascalCase(field.type);
    } else {
      // Primitive type mapping
      switch (field.type) {
        case 'boolean':
          baseType = 'bool';
          break;
        case 'byte':
          baseType = 'byte';
          break;
        case 'char':
          baseType = 'char';
          break;
        case 'short':
          baseType = 'short';
          break;
        case 'int':
          baseType = 'int';
          break;
        case 'long':
          baseType = 'long';
          break;
        case 'float':
          baseType = 'float';
          break;
        case 'double':
          baseType = 'double';
          break;
        case 'string':
        case 'type':
        case 'version':
        case 'timestamp':
          baseType = 'string';
          break;
        default:
          baseType = 'object';
      }
    }

    // Add array suffix if needed
    if (field.isArray) {
      return `${baseType}[]`;
    }

    return baseType;
  }

  /**
   * Generate filename
   */
  protected generateFilename(): string {
    const contextName = this.toPascalCase(this.options.context.contextName);
    return `${contextName}Schemas${LANGUAGE_FILE_EXTENSIONS.csharp}`;
  }
}
