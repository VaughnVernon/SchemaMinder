/**
 * Java Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, ParsedSpecification, LANGUAGE_FILE_EXTENSIONS } from './types';

export class JavaGenerator extends BaseCodeGenerator {
  /**
   * Generate Java code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for Java code generation');
    }

    // Package name is always lowercase
    const packageName = namespace.toLowerCase();
    const contextName = this.toPascalCase(this.options.context.contextName);
    const outerClassName = `${contextName}Schemas`;

    // Package declaration
    lines.push(`package ${packageName};`);
    lines.push('');

    // Collect import statements
    const importStatements = this.collectImportStatements(schemas, packageName);
    if (importStatements.size > 0) {
      Array.from(importStatements).sort().forEach(imp => {
        lines.push(imp);
      });
      lines.push('');
    }

    // Outer class declaration
    lines.push(`public class ${outerClassName} {`);

    // Group schemas by category
    const schemasByCategory = this.groupByCategory(schemas);

    // Generate each category as a static inner class
    const categories = ['Commands', 'Data', 'Documents', 'Envelopes', 'Events', 'Queries'];

    for (const category of categories) {
      const categorySchemas = schemasByCategory.get(category);
      if (!categorySchemas || categorySchemas.length === 0) continue;

      lines.push(`    public static class ${category} {`);

      // Generate each schema type as a static inner class
      for (const resolved of categorySchemas) {
        const classCode = this.generateClass(resolved);
        classCode.forEach(line => {
          lines.push('        ' + line);
        });
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
   * Collect all import statements needed for cross-category references
   */
  private collectImportStatements(schemas: ResolvedSchemaVersion[], packageName: string): Set<string> {
    const imports = new Set<string>();

    for (const resolved of schemas) {
      const parsed = this.parseSpecification(resolved.version.specification);
      const currentCategory = resolved.category;

      // Find fields that reference other categories
      for (const field of parsed.fields) {
        if (field.isComplex && field.category && field.category !== currentCategory.toLowerCase()) {
          const refCategory = this.toPascalCase(field.category);
          imports.add(`import ${packageName}.${this.toPascalCase(this.options.context.contextName)}Schemas.${refCategory}.*;`);
        }
      }
    }

    return imports;
  }

  /**
   * Generate a single class
   */
  private generateClass(resolved: ResolvedSchemaVersion): string[] {
    const lines: string[] = [];
    const parsed = this.parseSpecification(resolved.version.specification);
    const className = this.toPascalCase(parsed.schemaName);

    // Class declaration
    lines.push(`public static class ${className} {`);

    // Generate fields
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
    lines.push('');

    return lines;
  }

  /**
   * Generate a field declaration
   */
  private generateField(field: ParsedField): string {
    const fieldName = this.toCamelCase(field.name);
    const javaType = this.mapToJavaType(field);

    return `public final ${javaType} ${fieldName};`;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(className: string, fields: ParsedField[]): string[] {
    const lines: string[] = [];

    // Constructor signature
    const params = fields.map(field => {
      const paramType = this.mapToJavaType(field);
      const paramName = this.toCamelCase(field.name);
      return `${paramType} ${paramName}`;
    }).join(', ');

    lines.push(`public ${className}(${params}) {`);

    // Field assignments
    for (const field of fields) {
      const fieldName = this.toCamelCase(field.name);
      lines.push(`    this.${fieldName} = ${fieldName};`);
    }

    lines.push('}');

    return lines;
  }

  /**
   * Map DSL type to Java type
   */
  private mapToJavaType(field: ParsedField): string {
    let baseType: string;

    if (field.isComplex) {
      // Complex type reference
      baseType = this.toPascalCase(field.type);
    } else {
      // Primitive type mapping
      switch (field.type) {
        case 'boolean':
          baseType = 'boolean';
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
          baseType = 'String';
          break;
        case 'type':
        case 'version':
        case 'timestamp':
          baseType = 'String';
          break;
        default:
          baseType = 'Object';
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
    return `${contextName}Schemas${LANGUAGE_FILE_EXTENSIONS.java}`;
  }
}
