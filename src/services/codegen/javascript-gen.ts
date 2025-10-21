/**
 * JavaScript Code Generator
 */

import { BaseCodeGenerator } from './base-generator';
import { ResolvedSchemaVersion, ParsedField, LANGUAGE_FILE_EXTENSIONS } from './types';

export class JavaScriptGenerator extends BaseCodeGenerator {
  /**
   * Generate JavaScript code for all schemas
   */
  protected generateCode(schemas: ResolvedSchemaVersion[]): string {
    const lines: string[] = [];
    const namespace = this.getNamespace();

    if (!namespace) {
      throw new Error('Namespace is required for JavaScript code generation');
    }

    // Convert namespace to PascalCase
    const pascalNamespace = this.toPascalCaseNamespace(namespace);

    // Group schemas by category
    const schemasByCategory = this.groupByCategory(schemas);

    // Generate namespace as nested const objects
    lines.push(`export const ${pascalNamespace} = {`);

    // Generate each category as a nested object
    const categories = ['Commands', 'Data', 'Documents', 'Envelopes', 'Events', 'Queries'];
    const categoriesWithSchemas = categories.filter(cat => {
      const categorySchemas = schemasByCategory.get(cat);
      return categorySchemas && categorySchemas.length > 0;
    });

    for (let i = 0; i < categoriesWithSchemas.length; i++) {
      const category = categoriesWithSchemas[i];
      const categorySchemas = schemasByCategory.get(category)!;
      const isLastCategory = i === categoriesWithSchemas.length - 1;

      lines.push(`    ${category}: {`);

      // Generate each class in the category
      for (let j = 0; j < categorySchemas.length; j++) {
        const resolved = categorySchemas[j];
        const isLastSchema = j === categorySchemas.length - 1;
        const classCode = this.generateClass(resolved);

        classCode.forEach(line => {
          lines.push('        ' + line);
        });

        // Add comma after class if not the last one
        if (!isLastSchema) {
          lines[lines.length - 1] += ',';
        }

        if (!isLastSchema) {
          lines.push('');
        }
      }

      lines.push(`    }${isLastCategory ? '' : ','}`);

      if (!isLastCategory) {
        lines.push('');
      }
    }

    lines.push('};');

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
    lines.push(`${className}: class ${className} {`);

    // Generate constructor
    const constructorLines = this.generateConstructor(parsed.fields);
    constructorLines.forEach(line => {
      lines.push('    ' + line);
    });

    lines.push('}');

    return lines;
  }

  /**
   * Generate constructor
   */
  private generateConstructor(fields: ParsedField[]): string[] {
    const lines: string[] = [];

    // Constructor signature
    const params = fields.map(field => {
      const paramName = this.toCamelCase(field.name);
      return paramName;
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
    return `${contextName}Schemas${LANGUAGE_FILE_EXTENSIONS.javascript}`;
  }
}
