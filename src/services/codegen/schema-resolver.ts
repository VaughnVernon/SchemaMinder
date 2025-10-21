/**
 * Schema version resolution and dependency ordering
 */

import { Schema, SchemaVersion, SchemaStatus } from '../../types/schema';
import { SemanticVersion } from '../semanticVersion';
import { ResolvedSchemaVersion, SchemaWithVersions, ParsedField, ParsedSpecification } from './types';

export class SchemaResolver {
  /**
   * Resolve the appropriate version for each schema based on status priority
   * Version Selection Logic:
   * 1. Find the highest semantic version (excluding Removed)
   * 2. Use that version regardless of status (Published, Draft, or Deprecated)
   */
  static resolveSchemaVersions(schemasWithVersions: SchemaWithVersions[]): ResolvedSchemaVersion[] {
    const resolved: ResolvedSchemaVersion[] = [];

    for (const { schema, versions } of schemasWithVersions) {
      // Filter out Removed versions
      const validVersions = versions.filter(v => v.status !== SchemaStatus.Removed);

      if (validVersions.length === 0) {
        console.warn(`Schema ${schema.name} has no valid versions to generate`);
        continue;
      }

      // Sort by semantic version (highest first)
      const sortedVersions = SemanticVersion.sort(validVersions);
      const highestVersion = sortedVersions[sortedVersions.length - 1];

      resolved.push({
        schema,
        version: highestVersion,
        category: schema.schemaTypeCategory,
      });
    }

    return resolved;
  }

  /**
   * Order schemas by dependencies to avoid forward references
   * Data types should come first, then others can reference them
   */
  static orderByDependencies(resolved: ResolvedSchemaVersion[]): ResolvedSchemaVersion[] {
    const ordered: ResolvedSchemaVersion[] = [];
    const remaining = [...resolved];
    const added = new Set<string>();

    // Helper to get schema key
    const getKey = (schema: Schema) => `${schema.schemaTypeCategory}.${schema.name}`;

    // Helper to parse specification and extract dependencies
    const getDependencies = (spec: string): string[] => {
      const deps: string[] = [];
      // Match patterns like: data.FullName, events.UserRegistered:1.0.0
      const complexTypeRegex = /\b(data|commands|documents|envelopes|events|queries)\.([A-Z][a-zA-Z0-9]*)/g;
      let match;
      while ((match = complexTypeRegex.exec(spec)) !== null) {
        deps.push(`${match[1]}.${match[2]}`);
      }
      return deps;
    };

    // First pass: Add all Data schemas (they're usually dependencies)
    for (const item of remaining) {
      if (item.category === 'Data') {
        ordered.push(item);
        added.add(getKey(item.schema));
      }
    }

    // Second pass: Add schemas whose dependencies are satisfied
    let maxIterations = remaining.length * 2; // Prevent infinite loops
    let iteration = 0;

    while (remaining.length > 0 && iteration < maxIterations) {
      iteration++;
      let addedThisRound = false;

      for (let i = remaining.length - 1; i >= 0; i--) {
        const item = remaining[i];
        const key = getKey(item.schema);

        // Skip if already added
        if (added.has(key)) {
          remaining.splice(i, 1);
          continue;
        }

        // Check if all dependencies are satisfied
        const deps = getDependencies(item.version.specification);
        const allDepsAdded = deps.every(dep => added.has(dep));

        if (allDepsAdded) {
          ordered.push(item);
          added.add(key);
          remaining.splice(i, 1);
          addedThisRound = true;
        }
      }

      // If no progress, add remaining to avoid infinite loop
      if (!addedThisRound && remaining.length > 0) {
        console.warn('Circular dependency detected, adding remaining schemas');
        ordered.push(...remaining);
        break;
      }
    }

    return ordered;
  }

  /**
   * Parse a schema specification into structured fields
   */
  static parseSpecification(specification: string): ParsedSpecification {
    const lines = specification.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

    // Extract schema type and name from first line
    const firstLine = lines[0];
    const headerMatch = firstLine.match(/^(command|data|document|envelope|event|query)\s+([A-Z][a-zA-Z0-9]*)\s*\{/);

    if (!headerMatch) {
      throw new Error(`Invalid schema specification: ${firstLine}`);
    }

    const typeName = headerMatch[1];
    const schemaName = headerMatch[2];
    const fields: ParsedField[] = [];

    // Parse fields (skip first and last lines which are header and closing brace)
    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i];

      // Skip comments and empty lines
      if (!line || line.startsWith('//') || line === '}') continue;

      const field = this.parseField(line);
      if (field) {
        fields.push(field);
      }
    }

    return { typeName, schemaName, fields };
  }

  /**
   * Parse a single field declaration
   */
  private static parseField(line: string): ParsedField | null {
    // Remove trailing semicolon if present
    line = line.replace(/;$/, '').trim();

    // Match complex types with optional version: category.TypeName:1.0.0[] fieldName = defaultValue
    const complexVersionedMatch = line.match(/^([a-z]+)\.([A-Z][a-zA-Z0-9]*):([0-9.]+)(\[\])?\s+([a-zA-Z][a-zA-Z0-9]*)\s*(=\s*(.+))?$/);
    if (complexVersionedMatch) {
      return {
        name: complexVersionedMatch[5],
        type: complexVersionedMatch[2],
        isArray: !!complexVersionedMatch[4],
        isComplex: true,
        category: complexVersionedMatch[1],
        version: complexVersionedMatch[3],
        defaultValue: complexVersionedMatch[7]?.trim(),
      };
    }

    // Match complex types: category.TypeName[] fieldName = defaultValue
    const complexMatch = line.match(/^([a-z]+)\.([A-Z][a-zA-Z0-9]*)(\[\])?\s+([a-zA-Z][a-zA-Z0-9]*)\s*(=\s*(.+))?$/);
    if (complexMatch) {
      return {
        name: complexMatch[4],
        type: complexMatch[2],
        isArray: !!complexMatch[3],
        isComplex: true,
        category: complexMatch[1],
        defaultValue: complexMatch[6]?.trim(),
      };
    }

    // Match same-category complex type: TypeName[] fieldName = defaultValue
    const sameCategoryMatch = line.match(/^([A-Z][a-zA-Z0-9]*)(\[\])?\s+([a-zA-Z][a-zA-Z0-9]*)\s*(=\s*(.+))?$/);
    if (sameCategoryMatch) {
      return {
        name: sameCategoryMatch[3],
        type: sameCategoryMatch[1],
        isArray: !!sameCategoryMatch[2],
        isComplex: true,
        defaultValue: sameCategoryMatch[5]?.trim(),
      };
    }

    // Match primitive types: type[] fieldName = defaultValue
    const primitiveMatch = line.match(/^(boolean|byte|char|double|float|int|long|short|string|type|version|timestamp)(\[\])?\s+([a-zA-Z][a-zA-Z0-9]*)\s*(=\s*(.+))?$/);
    if (primitiveMatch) {
      return {
        name: primitiveMatch[3],
        type: primitiveMatch[1],
        isArray: !!primitiveMatch[2],
        isComplex: false,
        defaultValue: primitiveMatch[5]?.trim(),
      };
    }

    console.warn(`Could not parse field: ${line}`);
    return null;
  }

  /**
   * Convert field name to PascalCase for property names
   * Handles spaces, underscores, hyphens, and removes invalid characters
   * Examples:
   *   "givenName" -> "GivenName"
   *   "Agile Project Management" -> "AgileProjectManagement"
   *   "user_name" -> "UserName"
   *   "user-name" -> "UserName"
   */
  static toPascalCase(name: string): string {
    // Remove or replace invalid identifier characters
    // First, split on spaces, underscores, hyphens
    const parts = name.split(/[\s_-]+/);

    // Convert each part to have first letter uppercase
    return parts
      .map(part => {
        // Remove any remaining invalid characters (keep only letters and digits)
        const cleaned = part.replace(/[^a-zA-Z0-9]/g, '');
        if (cleaned.length === 0) return '';
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      })
      .filter(part => part.length > 0)
      .join('');
  }

  /**
   * Convert namespace to PascalCase segments
   */
  static toPascalCaseNamespace(namespace: string): string {
    return namespace.split('.').map(segment => this.toPascalCase(segment)).join('.');
  }
}
