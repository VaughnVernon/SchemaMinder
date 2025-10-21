/**
 * Rust Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, LANGUAGE_FILE_EXTENSIONS } from './types';

export class RustGenerator extends BaseCodeGenerator {
  /**
   * Generate Rust code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for Rust code generation');
    }

    // Convert namespace to snake_case (flatten all segments)
    const snakeCaseModule = this.toSnakeCaseModule(namespace);

    // Group schemas by category
    const schemasByCategory = this.groupByCategory(schemas);

    // Generate outer module
    lines.push(`pub mod ${snakeCaseModule} {`);

    // Generate each category as a nested module
    const categories = ['commands', 'data', 'documents', 'envelopes', 'events', 'queries'];

    for (const category of categories) {
      const categoryKey = this.toPascalCase(category);
      const categorySchemas = schemasByCategory.get(categoryKey);
      if (!categorySchemas || categorySchemas.length === 0) continue;

      lines.push(`    pub mod ${category} {`);

      // Generate each struct in the category
      for (const resolved of categorySchemas) {
        const structCode = this.generateStruct(resolved);
        structCode.forEach(line => {
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
   * Generate a single struct with impl block
   */
  private generateStruct(resolved: ResolvedSchemaVersion): string[] {
    const lines: string[] = [];
    const parsed = this.parseSpecification(resolved.version.specification);
    const structName = this.toPascalCase(parsed.schemaName);

    // Derive attributes
    lines.push('#[derive(Debug)]');
    lines.push('#[readonly::make]');

    // Struct declaration
    lines.push(`pub struct ${structName} {`);

    // Generate fields
    for (const field of parsed.fields) {
      const fieldLine = this.generateField(field);
      lines.push('    ' + fieldLine);
    }

    lines.push('}');
    lines.push('');

    // Generate impl block with new() function
    const implLines = this.generateImpl(structName, parsed.fields);
    implLines.forEach(line => {
      lines.push(line);
    });

    return lines;
  }

  /**
   * Generate a field declaration
   */
  private generateField(field: ParsedField): string {
    const fieldName = this.toSnakeCase(field.name);
    const rustType = this.mapToRustType(field);

    return `pub ${fieldName}: ${rustType},`;
  }

  /**
   * Generate impl block with new() function
   */
  private generateImpl(structName: string, fields: ParsedField[]): string[] {
    const lines: string[] = [];

    lines.push(`impl ${structName} {`);

    // new() function signature
    const params = fields.map(field => {
      const paramType = this.mapToRustType(field);
      const paramName = this.toSnakeCase(field.name);
      return `${paramName}: ${paramType}`;
    }).join(', ');

    lines.push(`    pub fn new(${params}) -> Self {`);

    // Struct initialization
    lines.push(`        ${structName} {`);
    for (const field of fields) {
      const fieldName = this.toSnakeCase(field.name);
      lines.push(`            ${fieldName},`);
    }
    lines.push('        }');

    lines.push('    }');
    lines.push('}');

    return lines;
  }

  /**
   * Map DSL type to Rust type
   */
  private mapToRustType(field: ParsedField): string {
    let baseType: string;

    if (field.isComplex) {
      // Complex type reference
      // If it has a category prefix, use the module path
      if (field.category) {
        const category = field.category.toLowerCase();
        baseType = `${category}::${this.toPascalCase(field.type)}`;
      } else {
        // Same category reference
        baseType = this.toPascalCase(field.type);
      }
    } else {
      // Primitive type mapping
      switch (field.type) {
        case 'boolean':
          baseType = 'bool';
          break;
        case 'byte':
          baseType = 'u8';
          break;
        case 'char':
          baseType = 'char';
          break;
        case 'short':
          baseType = 'i16';
          break;
        case 'int':
          baseType = 'i32';
          break;
        case 'long':
          baseType = 'i64';
          break;
        case 'float':
          baseType = 'f32';
          break;
        case 'double':
          baseType = 'f64';
          break;
        case 'string':
        case 'type':
        case 'version':
        case 'timestamp':
          baseType = 'String';
          break;
        default:
          baseType = 'String';
      }
    }

    // Add array suffix if needed - use fixed-size array
    if (field.isArray) {
      return `Vec<${baseType}>`;
    }

    return baseType;
  }

  /**
   * Convert namespace to snake_case module name (flatten all segments)
   * Example: "Com.Example.UserMgmt" -> "com_example_user_mgmt"
   */
  private toSnakeCaseModule(namespace: string): string {
    // Split by dots, convert each to snake_case, join with underscores
    return namespace
      .split('.')
      .map(segment => this.toSnakeCase(segment))
      .join('_');
  }

  /**
   * Convert string to snake_case
   * Handles PascalCase, camelCase, spaces, hyphens
   */
  private toSnakeCase(str: string): string {
    // First, handle the transition from lowercase to uppercase (camelCase/PascalCase)
    // Insert underscore before uppercase letters that follow lowercase letters
    let result = str.replace(/([a-z0-9])([A-Z])/g, '$1_$2');

    // Replace spaces and hyphens with underscores
    result = result.replace(/[\s-]+/g, '_');

    // Remove any non-alphanumeric characters except underscores
    result = result.replace(/[^a-zA-Z0-9_]/g, '');

    // Convert to lowercase
    result = result.toLowerCase();

    // Remove multiple consecutive underscores
    result = result.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    result = result.replace(/^_+|_+$/g, '');

    return result;
  }

  /**
   * Generate filename
   */
  protected generateFilename(): string {
    const contextName = this.toSnakeCase(this.options.context.contextName);
    return `${contextName}_schemas${LANGUAGE_FILE_EXTENSIONS.rust}`;
  }
}
