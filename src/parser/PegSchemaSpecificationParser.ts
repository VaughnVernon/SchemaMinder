/**
 * PEG.js-based Schema Specification Parser
 * Browser-compatible replacement for ANTLR parser
 */

import pegParser from './generated/SchemaSpecificationPegParser';
import { 
  ParseResult, 
  ParseError, 
  SchemaSpecification,
  TypeCategory,
  PrimitiveType,
  SpecialType
} from './types';

export class PegSchemaSpecificationParser {
  static parse(input: string, expectedCategory?: string): ParseResult {
    if (!input || input.trim() === '') {
      return {
        success: false,
        errors: [{
          message: 'Input cannot be empty',
          severity: 'error'
        }]
      };
    }

    try {
      const result = pegParser.parse(input);
      
      // Convert the raw parser result to our expected AST format
      const specification = this.convertToSpecification(result);
      
      // Check expected category if provided
      if (expectedCategory && specification.category !== expectedCategory) {
        return {
          success: false,
          errors: [{
            message: `Schema type mismatch: Expected "${expectedCategory}" but specification uses "${specification.category}"`,
            severity: 'error'
          }]
        };
      }
      
      return {
        success: true,
        specification,
        errors: []
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [this.convertParseError(error, input)]
      };
    }
  }

  static validate(input: string, expectedCategory?: string): ParseError[] {
    const result = this.parse(input, expectedCategory);
    return result.errors;
  }

  private static convertToSpecification(result: any): SchemaSpecification {
    return {
      category: result.category as TypeCategory,
      name: result.name,
      fields: result.fields || []
    };
  }

  private static convertParseError(error: any, input?: string): ParseError {
    let message = 'Parse error';
    let location = undefined;

    if (error.name === 'SyntaxError' && error.location) {
      const { start, end } = error.location;
      location = {
        start: { line: start.line, column: start.column },
        end: { line: end.line, column: end.column }
      };
      
      message = error.message || 'Syntax error';
      
      // Enhance error message to include the invalid type name if it's at the beginning
      if (input && start.line === 1 && start.column === 1) {
        const firstWord = input.trim().split(/\s+/)[0];
        if (firstWord && !['command', 'data', 'document', 'envelope', 'event', 'query'].includes(firstWord)) {
          message = `Invalid schema type "${firstWord}". Expected one of: command, data, document, envelope, event, query`;
        }
      }
    } else {
      message = error.message || error.toString();
    }

    return {
      message,
      location,
      severity: 'error'
    };
  }
}