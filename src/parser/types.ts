/**
 * Abstract Syntax Tree (AST) types for Schema Specification parsing
 */

export enum TypeCategory {
  Command = 'command',
  Data = 'data',
  Document = 'document',
  Envelope = 'envelope',
  Event = 'event',
  Query = 'query'
}

export enum PrimitiveType {
  Boolean = 'boolean',
  Byte = 'byte',
  Char = 'char',
  Double = 'double',
  Float = 'float',
  Int = 'int',
  Long = 'long',
  Short = 'short',
  String = 'string'
}

export enum SpecialType {
  SchemaTypeName = 'schemaTypeName',
  Version = 'version',
  Timestamp = 'timestamp'
}

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

// Literal values
export type PrimitiveLiteral = 
  | { type: 'boolean'; value: boolean }
  | { type: 'byte'; value: number }
  | { type: 'char'; value: string }
  | { type: 'double'; value: number }
  | { type: 'float'; value: number }
  | { type: 'int'; value: number }
  | { type: 'long'; value: number }
  | { type: 'short'; value: number }
  | { type: 'string'; value: string };

export interface ArrayLiteral {
  type: 'array';
  elements: PrimitiveLiteral[];
}

export type DefaultValue = PrimitiveLiteral | ArrayLiteral;

// Field type definitions
export interface PrimitiveFieldType {
  kind: 'primitive';
  type: PrimitiveType;
  isArray: boolean;
}

export interface SpecialFieldType {
  kind: 'special';
  type: SpecialType;
}

export interface ComplexFieldType {
  kind: 'complex';
  category?: string;  // undefined means same category
  schemaName: string;
  version?: string;   // semantic version like "1.2.3"
  isArray: boolean;
}

export type FieldType = PrimitiveFieldType | SpecialFieldType | ComplexFieldType;

// Field declaration
export interface FieldDeclaration {
  type: FieldType;
  name: string;
  defaultValue?: DefaultValue;
  location?: SourceLocation;
}

// Root schema specification
export interface SchemaSpecification {
  category: TypeCategory;
  name: string;
  fields: FieldDeclaration[];
  location?: SourceLocation;
}

// Parser result
export interface ParseResult {
  success: boolean;
  specification?: SchemaSpecification;
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  location?: SourceLocation;
  severity: 'error' | 'warning';
}