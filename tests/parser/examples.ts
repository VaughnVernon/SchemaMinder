/**
 * Example schema specifications for testing and demonstration
 */

export const EXAMPLE_SPECIFICATIONS = {
  // Simple command with basic fields
  simpleCommand: `command CreateUser {
  type typeName
  version currentVersion
  timestamp createdAt
  string username = "defaultUser"
  string email
  boolean isActive = true
  int age
}`,

  // Event with array fields and cross-category references
  complexEvent: `event UserRegistered {
  type eventType
  version schemaVersion
  timestamp occurredOn
  string[] roles = { "user", "member" }
  boolean verified = false
  int[] permissions = { 1, 2, 3 }
  data.PersonalInfo personalInfo
  data.ContactInfo[] contactMethods
}`,

  // Data schema with nested references
  dataSchema: `data ContactInfo {
  string contactType = "email"
  string value
  boolean isPrimary = true
  timestamp lastVerified
}`,

  // Document with versioned references  
  documentWithVersions: `document UserProfile {
  type documentType
  version profileVersion
  long lastModified
  double score = 85.5
  data.PersonalInfo:1.2.0 basicInfo
  data.ContactInfo:1.1.0[] contacts
}`,

  // Envelope example
  envelopeExample: `envelope MessageEnvelope {
  type messageType
  version envelopeVersion
  timestamp sentAt
  string messageId
  string correlationId
  byte[] payload
}`,

  // Complex schema with all data types
  allDataTypes: `command ComplexCommand {
  type commandType
  version commandVersion
  timestamp issuedAt
  
  boolean flag = true
  boolean[] flags = { true, false, true }
  byte byteValue = 127
  byte[] bytes = { 0, 1, 127 }
  char initial = 'A'
  char[] initials = { 'A', 'B', 'C' }
  double precision = 3.14159
  double[] measurements = { 1.1, 2.2, 3.3 }
  float ratio = 2.5
  float[] ratios = { 1.0, 1.5, 2.0 }
  int count = 42
  int[] counts = { 10, 20, 30 }
  long timestamp = 1234567890
  long[] timestamps = { 1000, 2000, 3000 }
  short code = 999
  short[] codes = { 100, 200, 300 }
  string name = "example"
  string[] names = { "first", "second", "third" }
  UserData userData
}`
};

/**
 * Invalid specifications for testing error handling
 */
export const INVALID_SPECIFICATIONS = {
  // Missing closing brace
  missingBrace: `command TestCommand {
  string name
  // missing closing brace`,

  // Invalid type name
  invalidType: `invalidtype TestSchema {
  string field
}`,

  // Invalid field type
  invalidField: `command TestCommand {
  invalidtype fieldName
}`,

  // Invalid default value
  invalidDefault: `command TestCommand {
  string name = 123
}`,

  // Malformed array
  malformedArray: `command TestCommand {
  string[] names = { "one", "two" 
}`,

  // Invalid version reference
  invalidVersion: `command TestCommand {
  data.UserInfo:invalid.version userInfo
}`
};