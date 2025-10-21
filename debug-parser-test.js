// Debug the parser to see what's failing
const { SchemaSpecificationParserWrapper } = require('./src/parser/SchemaSpecificationParser.js');

const simpleCommand = `command CreateUser {
  type typeName
  version currentVersion
  timestamp createdAt
  string username = "defaultUser"
  string email
  boolean isActive = true
  int age
}`;

const complexEvent = `event UserRegistered {
  type eventType
  version schemaVersion
  timestamp occurredOn
  string[] roles = { "user", "member" }
  boolean verified = false
  int[] permissions = { 1, 2, 3 }
  data.PersonalInfo personalInfo
}`;

console.log('\n=== Testing Simple Command ===');
const result1 = SchemaSpecificationParserWrapper.parse(simpleCommand);
console.log('Success:', result1.success);
console.log('Errors:', result1.errors);
if (result1.specification) {
  console.log('Specification:', JSON.stringify(result1.specification, null, 2));
}

console.log('\n=== Testing Complex Event ===');
const result2 = SchemaSpecificationParserWrapper.parse(complexEvent);
console.log('Success:', result2.success);
console.log('Errors:', result2.errors);
if (result2.specification) {
  console.log('Specification:', JSON.stringify(result2.specification, null, 2));
}