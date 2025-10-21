const fs = require('fs');
const path = require('path');
const PEG = require('pegjs');

const grammarPath = path.join(__dirname, '../grammar/SchemaSpecification.pegjs');
const outputPath = path.join(__dirname, '../src/parser/generated/SchemaSpecificationPegParser.ts');

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the grammar
const grammarSource = fs.readFileSync(grammarPath, 'utf8');

// Generate the parser
const parser = PEG.generate(grammarSource, {
  output: 'source',
  format: 'commonjs',
  optimize: 'speed'
});

// Wrap in TypeScript module export with proper ES module handling
const tsContent = `// Generated PEG.js parser for Schema Specification
// DO NOT EDIT - Generated from grammar/SchemaSpecification.pegjs

export interface PegParser {
  parse(input: string, options?: any): any;
  SyntaxError: any;
}

// Create a mock module/exports environment for the generated parser
const moduleExports: any = {};
const moduleObj = { exports: moduleExports };

// Execute the generated parser code
(function(module: any, exports: any) {
${parser}
})(moduleObj, moduleExports);

// Export the parser
const generatedParser: PegParser = moduleObj.exports;
export default generatedParser;
`;

// Write the TypeScript file
fs.writeFileSync(outputPath, tsContent, 'utf8');

console.log(`PEG.js parser generated successfully at: ${outputPath}`);