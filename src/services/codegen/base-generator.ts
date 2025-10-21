/**
 * Base class for code generators
 */

import { CodeGenerationOptions, CodeGenerationResult, ResolvedSchemaVersion, ParsedSpecification } from './types';
import { SchemaResolver } from './schema-resolver';

export abstract class BaseCodeGenerator {
  protected options: CodeGenerationOptions;

  constructor(options: CodeGenerationOptions) {
    this.options = options;
  }

  /**
   * Generate code for the entire context
   */
  generate(): CodeGenerationResult {
    try {
      // Resolve schema versions
      const resolved = SchemaResolver.resolveSchemaVersions(this.options.context.schemas);

      if (resolved.length === 0) {
        return {
          success: false,
          filename: '',
          error: 'No valid schemas found to generate',
        };
      }

      // Order by dependencies
      const ordered = SchemaResolver.orderByDependencies(resolved);

      // Generate code
      const content = this.generateCode(ordered);

      // Generate filename
      const filename = this.generateFilename();

      return {
        success: true,
        filename,
        content,
      };
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate the complete source code file
   */
  protected abstract generateCode(schemas: ResolvedSchemaVersion[]): string;

  /**
   * Generate the output filename
   */
  protected abstract generateFilename(): string;

  /**
   * Parse a schema specification
   */
  protected parseSpecification(specification: string): ParsedSpecification {
    return SchemaResolver.parseSpecification(specification);
  }

  /**
   * Get namespace for code generation
   */
  protected getNamespace(): string {
    return this.options.namespace || this.options.context.contextNamespace || '';
  }

  /**
   * Convert to PascalCase
   */
  protected toPascalCase(name: string): string {
    return SchemaResolver.toPascalCase(name);
  }

  /**
   * Convert namespace to PascalCase
   */
  protected toPascalCaseNamespace(namespace: string): string {
    return SchemaResolver.toPascalCaseNamespace(namespace);
  }
}
