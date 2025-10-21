/**
 * Go Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, ParsedSpecification, LANGUAGE_FILE_EXTENSIONS } from './types';

export class GoGenerator extends BaseCodeGenerator {
  /**
   * Generate Go code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for Go code generation');
    }

    // Convert namespace to lowercase with underscores
    const packageName = this.toGoPackageName(namespace);

    // Package declaration
    lines.push(`package ${packageName}`);
    lines.push('');

    // Order schemas by dependencies (Data first, then others)
    const orderedSchemas = this.orderSchemasByCategory(schemas);

    // Generate each struct
    for (const resolved of orderedSchemas) {
      const structCode = this.generateStruct(resolved);
      structCode.forEach(line => lines.push(line));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert namespace to Go package name (lowercase with underscores)
   */
  private toGoPackageName(namespace: string): string {
    return namespace
      .toLowerCase()
      .replace(/\./g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Order schemas - Data types first, then others
   */
  private orderSchemasByCategory(schemas: ResolvedSchemaVersion[]): ResolvedSchemaVersion[] {
    const dataTypes: ResolvedSchemaVersion[] = [];
    const otherTypes: ResolvedSchemaVersion[] = [];

    for (const schema of schemas) {
      if (schema.category === 'Data') {
        dataTypes.push(schema);
      } else {
        otherTypes.push(schema);
      }
    }

    return [...dataTypes, ...otherTypes];
  }

  /**
   * Generate a single struct with factory function
   */
  private generateStruct(resolved: ResolvedSchemaVersion): string[] {
    const lines: string[] = [];
    const parsed = this.parseSpecification(resolved.version.specification);
    const structName = this.toPascalCase(parsed.schemaName);

    // Struct declaration
    lines.push(`// ${structName} represents a ${parsed.typeName} type`);
    lines.push(`type ${structName} struct {`);

    // Generate fields
    for (const field of parsed.fields) {
      const fieldLine = this.generateField(field);
      lines.push('    ' + fieldLine);
    }

    lines.push('}');
    lines.push('');

    // Generate factory function
    const factoryLines = this.generateFactoryFunction(structName, parsed.fields);
    factoryLines.forEach(line => lines.push(line));

    return lines;
  }

  /**
   * Generate a struct field with JSON tag
   */
  private generateField(field: ParsedField): string {
    const fieldName = this.toPascalCase(this.substituteSpecialFieldName(field.name));
    const goType = this.mapToGoType(field);
    const jsonTag = field.name; // Use original field name for JSON

    return `${fieldName} ${goType} \`json:"${jsonTag}"\``;
  }

  /**
   * Substitute special field names
   */
  private substituteSpecialFieldName(name: string): string {
    const substitutions: Record<string, string> = {
      'type': 'schemaTypeName',
      'version': 'schemaSemanticVersion',
      'timestamp': 'schemaInstanceTimestamp'
    };

    return substitutions[name] || name;
  }

  /**
   * Generate factory function with variadic options pattern
   */
  private generateFactoryFunction(structName: string, fields: ParsedField[]): string[] {
    const lines: string[] = [];

    // Generate option type
    lines.push(`// ${structName}Option is a functional option for ${structName}`);
    lines.push(`type ${structName}Option func(*${structName})`);
    lines.push('');

    // Generate option functions for fields with defaults
    for (const field of fields) {
      if (field.defaultValue) {
        const optionFunc = this.generateOptionFunction(structName, field);
        optionFunc.forEach(line => lines.push(line));
        lines.push('');
      }
    }

    // Generate main factory function
    const factoryName = `New${structName}`;
    const requiredParams = fields
      .filter(f => !f.defaultValue)
      .map(f => {
        const paramName = f.name;
        const paramType = this.mapToGoType(f);
        return `${paramName} ${paramType}`;
      });

    lines.push(`// ${factoryName} creates a new ${structName}`);

    if (fields.some(f => f.defaultValue)) {
      lines.push(`func ${factoryName}(${requiredParams.join(', ')}, opts ...${structName}Option) ${structName} {`);
    } else {
      lines.push(`func ${factoryName}(${requiredParams.join(', ')}) ${structName} {`);
    }

    // Initialize struct with required fields
    lines.push(`    result := ${structName}{`);
    for (const field of fields.filter(f => !f.defaultValue)) {
      const fieldName = this.toPascalCase(this.substituteSpecialFieldName(field.name));
      lines.push(`        ${fieldName}: ${field.name},`);
    }
    lines.push('    }');
    lines.push('');

    // Apply options for fields with defaults
    if (fields.some(f => f.defaultValue)) {
      lines.push('    // Apply options');
      lines.push('    for _, opt := range opts {');
      lines.push('        opt(&result)');
      lines.push('    }');
      lines.push('');
    }

    lines.push('    return result');
    lines.push('}');

    return lines;
  }

  /**
   * Generate option function for a field with default value
   */
  private generateOptionFunction(structName: string, field: ParsedField): string[] {
    const lines: string[] = [];
    const fieldName = this.toPascalCase(this.substituteSpecialFieldName(field.name));
    const functionName = `With${fieldName}`;
    const paramType = this.mapToGoType(field);

    lines.push(`// ${functionName} sets the ${fieldName} field`);
    lines.push(`func ${functionName}(value ${paramType}) ${structName}Option {`);
    lines.push(`    return func(s *${structName}) {`);
    lines.push(`        s.${fieldName} = value`);
    lines.push('    }');
    lines.push('}');

    return lines;
  }

  /**
   * Map DSL type to Go type
   */
  private mapToGoType(field: ParsedField): string {
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
          baseType = 'uint8';
          break;
        case 'char':
          baseType = 'rune';
          break;
        case 'short':
          baseType = 'int16';
          break;
        case 'int':
          baseType = 'int32';
          break;
        case 'long':
          baseType = 'int64';
          break;
        case 'float':
          baseType = 'float32';
          break;
        case 'double':
          baseType = 'float64';
          break;
        case 'string':
        case 'type':
        case 'version':
        case 'timestamp':
          baseType = 'string';
          break;
        default:
          baseType = 'interface{}';
      }
    }

    // Add slice notation if array
    if (field.isArray) {
      return `[]${baseType}`;
    }

    return baseType;
  }

  /**
   * Generate filename
   */
  protected generateFilename(): string {
    const contextName = this.toPascalCase(this.options.context.contextName);
    return `${contextName}Schemas${LANGUAGE_FILE_EXTENSIONS.golang}`;
  }
}
