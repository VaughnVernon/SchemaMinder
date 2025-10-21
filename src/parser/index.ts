/**
 * Schema Specification Parser
 * 
 * This module provides parsing and validation capabilities for schema specifications
 * using a PEG.js parser for browser compatibility.
 */

export { SchemaSpecificationParserWrapper as SchemaSpecificationParser } from './SchemaSpecificationParserPeg';
export * from './types';

// Re-export commonly used types for convenience
export type {
  SchemaSpecification,
  ParseResult,
  ParseError,
  FieldDeclaration,
  FieldType,
  DefaultValue
} from './types';