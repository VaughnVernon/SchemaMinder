# Schema Specification Grammar

The following is the schema specification:

```
{typeName} {schemaName} {
  type schemaTypeNameAttribute
  version versionAttribute
  timestamp timestampAttribute

  boolean booleanAttribute (= true)?
  boolean[] booleanArrayAttribute (= { true, false, true })?
  byte byteAttribute (= 0)?
  byte[] byteArrayAttribute (= { 0, 127, 65 })?
  char charAttribute (= 'A')?
  char[] charArrayAttribute (= { 'A', 'B', 'C' })?
  double doubleAttribute (= 1.0)?
  double[] doubleArrayAttribute (= { 1.0, 2.0, 3.0 })?
  float floatAttribute (= 1.0)?
  float[] floatArrayAttribute (= { 1.0, 2.0, 3.0 })?
  int intAttribute (= 123)?
  int[] intArrayAttribute (= { 123, 456, 789 })?
  long longAttribute = 7890
  long[] longArrayAttribute (= { 7890, 1234, 5678 })?
  short shortAttribute (= 32767)?
  short[] shortArrayAttribute (= { 0, 1, 2 })?
  string stringAttribute (= "abc")?
  string[] stringArrayAttribute (= { "abc", "def", "ghi" })?
  SchemaName schemaAttribute1
  SchemaName[] schemaArrayAttribute1
  category.SchemaName schemaAttribute2
  category.SchemaName:1.2.1 schemaAttribute3
  category.SchemaName:1.2.1[] schemaArrayAttribute4
}
```

Values may or may not be set. Valid tokens inside the ()? capturing group are used to optionally set values.

The following are the descriptions of the grammar for each of the attribute (field) types with examples.

---

## Clarify Type Literal Syntax

The following are the rules for value literals of both single primitives and arrays of primitives.

Each type is preceeded by the follow comment format for a single primitive type:

```
// Type: type-name Value Range: value-literal to value-literal (NOTE: boolean has only true or false)
```

Or for a primitive type array:

```
// Type: type-name array
```

And array may have the same value range is the single primitive with the option of multiple such value literals.

The syntax of the equal sign followed by the literal value to set the variable is:

(= literal-value)?

Or for an array literal, there are `{` and `}` that has a comma-separated list of primitive value literals, and the `[, ...]` indicates that additional primitive values are optional:

```
(= { literal-value1[, ...] })?
```

This is the list of types with literals:

```
// Type: boolean Values Range: true or false
boolean booleanAttribute (= true)?

// Type: boolean array
boolean[] booleanArrayAttribute (= { true, false, true })?

// Type: byte array Value Range: 0-255
byte byteAttribute (= 0)?

// Type: byte array
byte[] byteArrayAttribute (= { 0, 127, 65 })?

// Type: char array Values: 'c' where c is any UTF-8 character
char charAttribute (= 'A')?

// Type: char array
char[] charArrayAttribute (= { 'A', 'B', 'C' })?

// Type: double Value Range: -1.7976931348623157E+308 to 1.7976931348623157E+308
double doubleAttribute (= 1.0)?

// Type: double array
double[] doubleArrayAttribute (= { 1.0, 2.0, 3.0 })?

// Type: float Value Range: -1.4E-45 to 3.4028235E38
float floatAttribute (= 1.0)?

// Type: float array
float[] floatArrayAttribute (= { 1.0, 2.0, 3.0 })?

// Type: int Value Range: -2,147,483,648 to 2,147,483,647
int intAttribute (= 123)?

// Type: int array
int[] intArrayAttribute (= { 123, 456, 789 })?

// Type: long Value Range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
long longAttribute = 7890

// Type: long array
long[] longArrayAttribute (= { 7890, 1234, 5678 })?

// Type: short Value Range: -32,768 to 32,767
short shortAttribute (= 32767)?

// Type: short array
short[] shortArrayAttribute (= { 0, 1, 2 })?

// Type: string array Value Range: A string of 1 to 64 UTF-8 characters
string stringAttribute (= "abc")?

// Type: string array
string[] stringArrayAttribute (= { "abc", "def", "ghi" })?
```

---

Datatype: {typeName}

Description: This must be replaced by one of the concrete category types: command, data, document, envelope, or event. In this example the first token of each specification is the typeName. Example:

```
command CommitBacklogItem {
  // ...
}

event BacklogItemCommitted {
  // ...
}
```

---

Datatype: schemaName

Description: The name of the schema being specified. In this example the second token of each specification is the schemaName. Example:

```
command CommitBacklogItem {
  // ...
}

event BacklogItemCommitted {
  // ...
}
```

---

Datatype: schemaTypeName

Description: The fully-qualified schema name to be included in the message itself with the given attribute name. This would generally be implemented by a string type of a given concrete programming language. (Note that this may be used instead on the a typeName of envelope.) In this example the inner attribute (field) declaration is the schemaTypeName:

```
command CommitBacklogItem {
  schemaTypeName eventTypeName
  // ...
}

event BacklogItemCommitted {
  schemaTypeName commanTypeName
  // ...
}
```

---

DataType: version

Description: The datatype specifically defining that the semantic version of the given Schema Version should be included in the message itself with the given attribute name and would generally be implemented by a string type of a given concrete programming language. (Note that this may be used instead on the a typeName of envelope.) In this example the inner attribute (field) declaration is the version:

```
command CommitBacklogItem {
  version currentVersion
  // ...
}

event BacklogItemCommitted {
  version currentVersion
  // ...
}
```

---

DataType: timestamp

Description: The datatype specifically defining that the timestamp of when the given instance was created to be included in the message itself with the given attribute name, which would generally be implemented by a long integer type or a string type of a given concrete programming language. (Note that this may be used instead on the a typeName of envelope.) In this example the inner attribute (field) declaration is the timestamp:

```
command CommitBacklogItem {
  timestamp submittedAt
  // ...
}

event BacklogItemCommitted {
  timestamp occurredOn
  // ...
}
```

---

DataType: boolean

Description: The boolean datatype, with values of true or false only, to be included in the message with the given attribute name. This value may be defaulted if the declaration is not followed by an equals sign and a true or false. In this example the inner attribute (field) declaration is the boolean:

```
event BacklogItemCommitted {
  // ...
  boolean planned
}

```

---

DataType: boolean[]

Description: The boolean array datatype with multiple values of true and false only, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of true and false values. In this example the inner attribute (field) declaration is the boolean array:

```
event UsersVoted {
  // ...
  boolean[] commonVotes = { true, false, true }
}
```

---

DataType: byte

Description: The 8-bit signed byte datatype with values of -128 to 127, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a byte literal. In this example the inner attribute (field) declaration is the byte:

```
event UserSelected {
  // ...
  byte shortcutValue = 65
}
```

---

DataType: byte[]

Description: The 8-bit signed byte array datatype with multiple values of - 128 to 127, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of byte values. In this example the inner attribute (field) declaration is the byte:

```
event MachineDataDefined {
  // ...
  byte[] defaultValues = { 1, 12, 123 }
}
```

---

DataType: char

Description: The char datatype with values supporting UTF-8, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a character literal. In this example the inner attribute (field) declaration is the char:

```
event UserSelected {
  // ...
  char shortcut = 'A'
}
```

---

DataType: char[]

Description: The char array datatype with multiple UTF-8 values, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of character values. In this example the inner attribute (field) declaration is the char array:

```
event DocumentStyleDefined {
  // ...
  char[] headingTypes = { '#', '##', '###' }
}
```

---

DataType: double

Description: The double-precision floating point datatype, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a double literal. In this example the inner attribute (field) declaration is the double:

```
event ExpectedAnswersDefined {
  // ...
  double valueOfPi = 3.1416
}
```

---

DataType: double[]

Description: The double-precision floating point array datatype, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of double values. In this example the inner attribute (field) declaration is the double array:

```
event FlowMeasurementsCaptured {
  // ...
  double[] commonTargetFlowUnits = { 0.00223, 0.00221, 0.00442 }
}
```

---

DataType: float

Description: The single-precision floating point datatype, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a float literal. In this example the inner attribute (field) declaration is the float:

```
event ExpectedAnswersDefined {
  // ...
  float valueOfPi = 3.14
}
```

---

DataType: float[]

Description: The single-precision floating point array datatype, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of float values. In this example the inner attribute (field) declaration is the float array:

```
event PollCompleted {
  // ...
  float[] possibleValues = { 1.54, 3.92, 1.88, 2.47 }
}
```

---

DataType: int

Description: The 32-bit signed integer datatype with values of -2,147,483,648 to 2,147,483,647, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an integer literal. In this example the inner attribute (field) declaration is the int:

```
event TrafficCounted {
  // ...
  int yearEndTotal
}
```

---

DataType: int[]

Description: The 32-bit signed integer datatype with multiple values of -2,147,483,648 to 2,147,483,647, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of integer values. In this example the inner attribute (field) declaration is the int array:

```
event TrafficCounted {
  // ...
  int sampleRange = { 518279, 400131 }
}
```

---

DataType: long

Description: The 64-bit signed integer datatype with values of -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a long literal. In this example the inner attribute (field) declaration is the long:

```
event TrafficCounted {
  // ...
  long tensYearsTotal
}
```

---

DataType: long[]

Description: The 64-bit signed integer datatype with multiple values of -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of long values:

command InitializeDistances {
  // ...
  long[] values = { 15329885886279, 24389775639272, 45336993791291 }
}

---

DataType: short

Description: The 16-bit signed integer datatype with values of -32,768 to 32,767, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a short literal. In this example the inner attribute (field) declaration is the short:

```
data DefaultValues {
  // ...
  short defaultUnreceivedReading = 12986
}
```

---

DataType: short[]

Description: The 16-bit signed integer datatype with multiple values of -32,768 to 32,767, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of short values. In this example the inner attribute (field) declaration is the short array:


```
data DefaultValues {
  // ...
  short defaultUnreceivedReadings[] = { 12986, 3772, 10994 }
}
```

---

DataType: string

Description: The string datatype with values supporting multi-character UTF-8 strings, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and a string literal. In this example the inner attribute (field) declaration is the string:

data LanguageSamples {
  // ...
  string englishAlphabetRepresentation = "ABC"
}

---

DataType: string[]

Description: The string array datatype with multiple values supporting multi-character UTF-8 strings, to be included in the message with the given attribute name. This value may be defaulted if the declaration is followed by an equals sign and an array literal containing a number of string values:

```
data FunnyLyrics {
  // ...
  string[] soundOfMusic = { "Doe", "Ray", "Me" }
}
```

---

DataType: SchemaName

Description: The explicit name of the complex Schema type without a Category reference, which implies that it must be within the same Category as referencing type. It must be found in the current Context as the referencing type. It will be included in the message with the given attribute name. The version is the tip, as in the most recent version. There is no support for default values other than null, which may be supported using the Null Object pattern. You may include the [] syntax to declare an array of the given type. In the following example, the ContactInformation data type references the FullName data type, both of which are in the same category:

```
data FullName {
  string givenName
  string secondName
  string familyName
}

data ContactInformation {
  FullName fullName
  // ...
}

```

---

DataType: {schemaTypeCategory}.{schemaName}

Description: The explicit complex Schema type of a given Category. It must be found in the current Context as the referencing type. It will be included in the message with the given attribute name. The version is the tip, as in the most recent version. There is no support for default values other than null, which may be supported using the Null Object pattern. In the following example, the UserRegistered event type references the FullName data type, which requires the event to include the reference to the data category:

```
data FullName {
  string givenName
  string secondName
  string familyName
}

event UserRegistered {
  type schemaTypeName
  version currentVersion
  timestamp datetime
  data.FullName fullName
  // ...
}
```

---

DataType: {schemaTypeCategory}.{schemaName}[]

Description: The explicit complex Schema type array of a given Category. It must be found in the current Context as the referencing type. It will be included in the message with the given attribute name. The version is the tip, as in the most recent version. There is no support for default values. In this example, the PersonDefined event references the Telephone data type by declaring an array:

```
data Telephone {
  string number
}

event PersonDefined {
  type schemaTypeName
  version currentVersion
  timestamp datetime
  data.Telephone[] telephones
  // ...
}
```

---

DataType: {schemaTypeCategory}.{schemaName}:1.2.3

Description: The explicit complex Schema type of a given Category in the current Context to be included in the message with the given attribute name. The version is the one declared following the colon (:). There is no support for default values other than null, which may be supported using the Null Object pattern. In the following example, the PersonDefined event type references a specific version of the Telephone data type, which requires the event to include the reference to the data category:

```
// Schema Version: 1.1.0 with country code
data Telephone {
  string number
  string countryCode
}

event PersonDefined {
  type schemaTypeName
  version currentVersion
  timestamp datetime
  data.Telephone:1.1.0 telephone
  // ...
}
```

---

DataType: {schemaTypeCategory}.{schemaName}:1.2.3[]

Description: The explicit complex Schema type array of a given Category in the current Context to be included in the message with the given attribute name. The version is the one declared following the colon (:). There is no support for default values. In the following example, the PersonDefined event type declares an array of a specific version of the Telephone data type, requiring it to references a specific version and to declare the array. Because the Telephone data is a different category, the event must include the reference to the data category:

```
// Schema Version: 1.1.0 with country code
data Telephone {
  string number
  string countryCode
}

event PersonDefined {
  type schemaTypeName
  version currentVersion
  timestamp datetime
  data.Telephone:1.1.0[] telephones
  // ...
}
```
