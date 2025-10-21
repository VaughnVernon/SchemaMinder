/**
 * Schema Specification Parser Wrapper (PEG.js version)
 * Drop-in replacement for ANTLR version with same interface
 */

import { PegSchemaSpecificationParser } from './PegSchemaSpecificationParser';
import { ParseResult, ParseError } from './types';

export class SchemaSpecificationParserWrapper {
  static parse(input: string, expectedCategory?: string): ParseResult {
    return PegSchemaSpecificationParser.parse(input, expectedCategory);
  }

  static validate(input: string, expectedCategory?: string): ParseError[] {
    return PegSchemaSpecificationParser.validate(input, expectedCategory);
  }
}