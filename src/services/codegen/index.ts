/**
 * Code generation exports
 */

export * from './types';
export * from './base-generator';
export * from './schema-resolver';
export * from './csharp-gen';
export * from './golang-gen';
export * from './java-gen';
export * from './javascript-gen';
export * from './typescript-gen';
export * from './rust-gen';

import { CodeGenerationOptions, CodeGenerationResult, TargetLanguage } from './types';
import { CSharpGenerator } from './csharp-gen';
import { GoGenerator } from './golang-gen';
import { JavaGenerator } from './java-gen';
import { JavaScriptGenerator } from './javascript-gen';
import { TypeScriptGenerator } from './typescript-gen';
import { RustGenerator } from './rust-gen';

/**
 * Factory function to create appropriate code generator
 */
export function createCodeGenerator(options: CodeGenerationOptions): CodeGenerationResult {
  let generator;

  switch (options.language) {
    case 'csharp':
      generator = new CSharpGenerator(options);
      break;
    case 'golang':
      generator = new GoGenerator(options);
      break;
    case 'java':
      generator = new JavaGenerator(options);
      break;
    case 'javascript':
      generator = new JavaScriptGenerator(options);
      break;
    case 'typescript':
      generator = new TypeScriptGenerator(options);
      break;
    case 'rust':
      generator = new RustGenerator(options);
      break;
    default:
      return {
        success: false,
        filename: '',
        error: `Unknown language: ${options.language}`,
      };
  }

  return generator.generate();
}
