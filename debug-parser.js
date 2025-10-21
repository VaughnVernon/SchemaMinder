const { SchemaSpecificationParser } = require('./dist/src/parser/SchemaSpecificationParser.js');

const simple = `command CreateUser {
  string username
}`;

console.log('Testing simple specification:');
console.log(simple);
console.log('Result:', JSON.stringify(SchemaSpecificationParser.parse(simple), null, 2));