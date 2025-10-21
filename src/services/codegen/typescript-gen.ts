/**
 * TypeScript Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, LANGUAGE_FILE_EXTENSIONS } from './types';

export class TypeScriptGenerator extends BaseCodeGenerator {
  /**
   * Generate TypeScript code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for TypeScript code generation');
    }

    // Convert namespace to PascalCase
    const pascalNamespace = this.toPascalCaseNamespace(namespace);

    // Group schemas by category
    const schemasByCategory = this.groupByCategory(schemas);

    // Generate namespace and nested category namespaces
    lines.push(`export namespace ${pascalNamespace} {`);

    // Generate each category as a nested namespace
    const categories = ['Commands', 'Data', 'Documents', 'Envelopes', 'Events', 'Queries'];

    for (const category of categories) {
      const categorySchemas = schemasByCategory.get(category);
      if (!categorySchemas || categorySchemas.length === 0) continue;

      lines.push(`    export namespace ${category} {`);

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
   * Generate a single class
   */
  private generateClass(resolved: ResolvedSchemaVersion): string[] {
    const lines: string[] = [];
    const parsed = this.parseSpecification(resolved.version.specification);
    const className = this.toPascalCase(parsed.schemaName);

    // Class declaration
    lines.push(`export class ${className} {`);

    // Generate field declarations
    for (const field of parsed.fields) {
      const fieldLine = this.generateField(field);
      lines.push('    ' + fieldLine);
    }

    if (parsed.fields.length > 0) {
      lines.push('');
    }

    // Generate constructor
    const constructorLines = this.generateConstructor(className, parsed.fields);
    constructorLines.forEach(line => {
      lines.push('    ' + line);
    });

    lines.push('}');

    return lines;
  }

  /**
   * Generate a field declaration
   */
  private generateField(field: ParsedField): string {
    const fieldName = this.toCamelCase(field.name);
    const tsType = this.mapToTypeScriptType(field);

    return `public readonly ${fieldName}: ${tsType};`;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(className: string, fields: ParsedField[]): string[] {
    const lines: string[] = [];

    // Constructor signature
    const params = fields.map(field => {
      const paramType = this.mapToTypeScriptType(field);
      const paramName = this.toCamelCase(field.name);
      return `${paramName}: ${paramType}`;
    }).join(', ');

    lines.push(`constructor(${params}) {`);

    // Field assignments
    for (const field of fields) {
      const fieldName = this.toCamelCase(field.name);
      lines.push(`    this.${fieldName} = ${fieldName};`);
    }

    lines.push('}');

    return lines;
  }

  /**
   * Map DSL type to TypeScript type
   */
  private mapToTypeScriptType(field: ParsedField): string {
    let baseType: string;

    if (field.isComplex) {
      // Complex type reference
      // If it has a category prefix, use the full namespace path
      if (field.category) {
        const category = this.toPascalCase(field.category);
        baseType = `${category}.${this.toPascalCase(field.type)}`;
      } else {
        // Same category reference
        baseType = this.toPascalCase(field.type);
      }
    } else {
      // Primitive type mapping
      switch (field.type) {
        case 'boolean':
          baseType = 'boolean';
          break;
        case 'byte':
        case 'short':
        case 'int':
        case 'long':
        case 'float':
        case 'double':
          baseType = 'number';
          break;
        case 'char':
        case 'string':
        case 'type':
        case 'version':
        case 'timestamp':
          baseType = 'string';
          break;
        default:
          baseType = 'any';
      }
    }

    // Add array suffix if needed
    if (field.isArray) {
      return `${baseType}[]`;
    }

    return baseType;
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    // First convert to PascalCase, then lowercase the first letter
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Generate filename
   */
  protected generateFilename(): string {
    const contextName = this.toPascalCase(this.options.context.contextName);
    return `${contextName}Schemas${LANGUAGE_FILE_EXTENSIONS.typescript}`;
  }
}
