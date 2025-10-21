/**
 * Code generation types and interfaces
 */

import { Schema, SchemaVersion } from '../../types/schema';

/**
 * Supported target programming languages
 */
export type TargetLanguage = 'csharp' | 'golang' | 'java' | 'javascript' | 'rust' | 'typescript';

/**
 * Language display names
 */
export const LANGUAGE_DISPLAY_NAMES: Record<TargetLanguage, string> = {
  csharp: 'C#',
  golang: 'Go',
  java: 'Java',
  javascript: 'JavaScript',
  rust: 'Rust',
  typescript: 'TypeScript',
};

/**
 * File extensions per language
 */
export const LANGUAGE_FILE_EXTENSIONS: Record<TargetLanguage, string> = {
  csharp: '.cs',
  golang: '.go',
  java: '.java',
  javascript: '.js',
  rust: '.rs',
  typescript: '.ts',
};

/**
 * Context with all schemas and versions for code generation
 */
export interface CodeGenerationContext {
  productName: string;
  domainName: string;
  contextName: string;
  contextNamespace?: string;
  schemas: SchemaWithVersions[];
}

/**
 * Schema with its versions
 */
export interface SchemaWithVersions {
  schema: Schema;
  versions: SchemaVersion[];
}

/**
 * Resolved schema version for generation
 */
export interface ResolvedSchemaVersion {
  schema: Schema;
  version: SchemaVersion;
  category: string; // Commands, Data, Documents, Envelopes, Events, Queries
}

/**
 * Code generation options
 */
export interface CodeGenerationOptions {
  language: TargetLanguage;
  namespace?: string;
  context: CodeGenerationContext;
}

/**
 * Code generation result
 */
export interface CodeGenerationResult {
  success: boolean;
  filename: string;
  content?: string;
  error?: string;
}

/**
 * Parsed field from schema specification
 */
export interface ParsedField {
  name: string;
  type: string;
  isArray: boolean;
  defaultValue?: string;
  isComplex: boolean;
  category?: string; // For complex types like data.FullName
  version?: string; // For versioned refs like data.Telephone:1.1.0
}

/**
 * Parsed schema specification
 */
export interface ParsedSpecification {
  typeName: string; // command, data, document, envelope, event, query
  schemaName: string;
  fields: ParsedField[];
}
