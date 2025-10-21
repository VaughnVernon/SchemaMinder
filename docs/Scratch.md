# Scratch Pad

## Schema Specification Examples

```
command CommitBacklogItem {
  type namespace
  version currentVersion
  timestamp datetime
  string backlogItemId
  string sprintId
}

event BacklogItemCommitted {
  type namespace
  version currentVersion
  timestamp datetime
  string backlogItemId
  string sprintId
}

data HotData {
  // TODO: details here
}
```

---

## New Schema Type Category Definitions and Rules

Okay, cool! It's now working on Cloudflare.

In schema.ts, change the SCHEMA_TYPE_CATEGORIES as follows:

```
export const SCHEMA_TYPE_CATEGORIES = {
  Commands: { categoryName: 'Commands', friendlyName: 'Command', typeName: 'command' },
  Data: { categoryName: 'Data', friendlyName: 'Data', typeName: 'data' },
  Documents: { categoryName: 'Documents', friendlyName: 'Document', typeName: 'document' },
  Envelopes: { categoryName: 'Envelopes', friendlyName: 'Envelope', typeName: 'envelope' },
  Events: { categoryName: 'Events', friendlyName: 'Event', typeName: 'event' }
} as const;
```

The new internal map has three fields, each to be used for different purposes:

- `categoryName`: Used in the treeview as the hierachy category
- `friendlyName`: Used in the forms as the selectable Schema Type Category selection label
- `typeName`: Use as the type in the Specification textarea; this is the first token in the text

I would like to define a new rule when creating a new schema.

- If:
  - the Schema Name has been entered (represented below as schemaName)
  - and the Schema Type Category has been selected (represented below as `SCHEMA_TYPE_CATEGORIES.type.friendlyName`)
  - and the Specification is empty/blank
  - Then create the specification as the following code:

```
{SCHEMA_TYPE_CATEGORIES.type.typeName} {schemaName} {
  // TODO: details here
}
```

---

I need additional Schema Version validations.

- Name: Same-Major-Version Compatabilty
  - Meaning: If a new schema version shares the same major version as the previous version, it must have additive-only changes. If there are any other kinds of changes known as breaking changes, the major version number must be increased by 1 and minor version and patch version are reset to 0.
  - This compatability validation is tested only after all other syntax and symantic validations pass
  - The following are the rules that must be met:

  1. Rules-1 for same-major-version compatibility:
    - Example Previous Version: 1.1.0
    - Example New/Next Version: 1.2.0
    - The specification for 1.2.0 must not have breaking changes, requiring these rules to be met:
      - No type changes made to existing fields
      - No name changes made to existing fields
      - No existing declared default values may be changed
        - E.g. In the declaration `int value = 1` the `= 1` value must not be changed
      - No existing fields may be deleted/removed
      - Fields must remain in the same order/sequence
        - This may not be required by all deserializers, but like it is for some
      - Summary: The only permissible changes are adding new fields to the end of the specification following any existing fields
  2. Rules-2 for requiring major version to increase by 1:
    - Previous Version: 1.2.0
    - New/Next Version: 2.0.0
    - The specification for 2.0.0 may have breaking changes:
      - Type changes may be made to existing fields
      - Name changes may made to existing fields
      - Existing declared defaults values may be changed
      - Existing fields may be deleted/removed
      - Existing fields may be  reordered/resequenced
      - Summary: All valid field declarations are acceptable
  3. If the user has already changed the major version number, both Rule-1 and Rule-2 are valid as long as all other syntax and symantic validations pass

  - How validation must be coded:
    - Both the previous version specification and next version specification are parsed and the results are compared one field-set at a time; node-by-node according to the above Rules-1
      - If there are no incomaptibilities (breaking changes), the specification is backward compatible and fully valid (all other validation types have already passed)
      - If there are incompatibilities (breaking changes):
        - List all individual invalid declarations as messages in the error message area
          - Example: 1 error(s): Line 6 - Incompatible field change: "blah sprintId"
          - If there are multiple such errors, list all such in the error message area
        - Display a modal dialog box providing two possible actions:
          - Title: Breaking Changes Are Incompatible
          - Body:
            - 1. You may make breaking changes by increasing the major version number: {actual-from-to such as: 1.2.0 to 2.0.0}
            - 2. Restore previous declarations and make additive-only changes (e.g. add new fields)
          - Button: Ok
    - Place new validation code in src/services/schemaSpecificationCompatibilityValidator.ts
  - Prior to making and code changes, please display your TODO list, explain what you plan to do, and ask me whether to proceed or adjust some TODO steps

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

=====================================================================================
---

# Kalele Domo Schema Minder Documentation

I would now like to generate one single documentation page using markdown in the following project subdirectory and file:

docs/KaleleDomoSchemaMinder.md

The documentation will be based on this older existing documentation version at the following link:

https://docs.vlingo.io/xoom-schematahttps://docs.vlingo.io/xoom-schemata

The brand, platform, app, and hierarchy are no longer named exactly as the old documentation indicates. Here are the name conversions:

- The brand VLINGO is now Kalele
- The platform XOOM is now Domo
- The tool name Schemata is now Schema Minder
- The hierachy is now:
  - Organization to Product
    - Unit to Domain
      - Context is still Context
        - Schema types/categories are the same except that the existing documentation is missing Queries/Query
        - Please include Query schema type in appropriate locations
          - Schema Versions mostly are the same
- The Schema Version Specification DSL has a few diffences, Please use the names and DSL examples in the below subheadings:
  - Heading 2: "Schema Specification Grammar"
  - Heading 3: "Clarifying Type Literal Syntax"
- Ignore the existing documentation main heading "Using the Maven Plugin" and all documentation under it.

Also, the user interface has changed completely. Mark locations that require UI replacement image and I will provide those later.

## Schema Specification Grammar

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

### Clarifying Type Literal Syntax

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

===========================

---

Thanks. I have made some changes to the document. Please retain those.

- The following are new rules for Schema Versions. Each rule is numbered for reference:
  1. When a Schema has one or more Schema Versions with any status other than Draft (Published, Deprecated, Removed) the Schema name must not be editable/changable; that is, its text field in SchemaForm.tsx must be set to read-only.
  2. If the schema name is changed in the SchemaForm.tsx per Rule 1, the specification of every Schema Version's schemaName must be automatically changed to the the new name, as follows:

        ```
        {typeName} {schemaName} {
          // field declarations...
        }
        ```

    - This automatic change will occur only when the SchemaForm.tsx Save button is used to save the Schema changes.
    - The {typeName} shall remain the same. The {schemaName} shall now be the name given in the SchemaForm.tsx name field.
    - The persistence shall be scoped by a single transaction so that all Schema Versions are guaranteed to be changed.
    - Please generate all business logic in source file `src/services/schemaTypeSpecification.ts` and any newly required persistence code in `functions/persistence/operations.ts`


===========================

---

Now we need some new business rules: (1) When a Schema Version's status is marked Published, only the description may be edited. All other fields must be read-only by disabling input. (2) When a Schema Version's status is marked Deprecated, only the description may be edited. When the Deprecated status is selected, the text "\*DEPRECATED\*: " should be inserted at the beginning of the text unless it already exists. All other fields must be read-only by disabling input. (3) When a Schema Version's status is marked Removed, no fields may be edited. All fields must be read-only by disabling input.

I made a bit of a mistake in describing the Schema Version read-only rules. The following corrects that: (1) a Published schema version may be transitioned to Deprecated but no others. (2) A Deprecated schema version may be transitioned to Removed status but no others.


========================================

App.tsx coverage has improved. I'm going to pause on improving its coverage for now. Note now that two more files have low coverage:

- main.txs: Has no coverage at all, but I am not sure that it makes any sense to test it. Is there a way to tell Vitest not to include files for which it makes no sense to cover?

- SpecificationValidator.tsx: It has good to excellent coverage in branching and functions, but very low on statements and lines. The gaps are `33-141,147-176`. What can be done to improve statements and lines into the 80% and better?

|----------------------------|---------|----------|---------|---------|-------------------|
| File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
|----------------------------|---------|----------|---------|---------|-------------------|
| App.tsx                    |   78.15 |     79.2 |   56.36 |   78.15 | ...16-719,846-853 |
| main.tsx                   |       0 |        0 |       0 |       0 | 1-10              |
| SpecificationValidator.tsx |    26.4 |    76.92 |     100 |    26.4 | ...33-141,147-176 |
|----------------------------|---------|----------|---------|---------|-------------------|

There are now 12 failing tests. The follow is the total list of errors reported by `npm test`:

  Phase 3: Extract Utility Functions
  - Create src/utils/hierarchyUtils.ts for:
    - Selection state checks (isSelected())
    - Expansion logic (toggleExpanded(), toggleAllDescendants())
    - Filtering logic (status filtering, visibility checks)

  Phase 4: Extract Shared Components
  - Create src/components/hierarchy/HierarchyItemBase.tsx for common item structure
  - Create src/components/hierarchy/HierarchyItemActions.tsx for dropdown/pin actions

----------------------

This is really excellent! On complexity:

- HierarchyTree has dropped to 15
- All sub-components are: 23, 15, 12, 2, 2, 2, 2, 2

Test coverage is at least as high as yesterday, but I think much higher overall with 100+ more tests.

Before moving on to "Phase 4: Extract Shared Components" I'd like to move a few files and do some housekeeping.

As a rule, I really dislike the module names helper/helpers and util/utils. Those tend to be a dumping ground for things that nobody wants to think about. It's also difficult to remember what's in those an what isn't. The names are not intention revealing. This is what I want to do with src/utils:

- `src/utils/astFieldComparison.ts`: confirm that this is no longer used since the previous parser was replaced and then remove it
  - if `src/utils/astFieldComparison.ts` can be removed, also remove its test file `tests/utils/astFieldComparison.test.ts`

- move all of the following files to new directory `src/components/hierarchy/tools`
  - `src/utils/contextMenuStrategies.ts`:
  - `src/utils/hierarchyExpansion.ts`:
  - `src/utils/hierarchyFinder.ts`:

- `src/utils/semanticVersion.ts`: move to src/services/ and rename class from `SemanticVersionUtils` to `SemanticVersion`

- As all of these files are moved and `SemanticVersionUtils` will be renamed, import dependencies and tests must also be changed to accommodate.


--------------

Regarding App.tsx refactoring:

McCabe 130?! 😱 That's absolutely critical - anything above 50 is considered untestable, and 130 is in the "abandon all hope" territory!

Updated Phase Timeline

1. Phase 1: Type definitions (1 hour)
2. Phase 2: Extract formSubmissionHandlers + tests (2 hours)
3. Phase 3: Extract formEditHandlers + tests (2 hours)
4. Phase 4: Extract navigationHandlers + tests (2 hours)
5. Phase 5: Extract modalHandlers + tests (1 hour)
6. Phase 6: Create useAppEventHandlers hook + tests (1 hour)
7. Phase 7: Refactor App.tsx to use hook (1 hour)
8. Phase 8: Final integration testing & cleanup (1 hour)

Success Metrics

Before:
- App.tsx: 987 lines, McCabe 130 🔴
- Testability: Near impossible
- Maintainability: Very poor

After:
- App.tsx: ~300 lines, McCabe < 15 ✅
- Handler modules: Each < 100 lines, McCabe < 10 ✅
- Test coverage: 90%+ for all handlers ✅
- Total test files: 5-6 new test suites

Critical Path

Given McCabe 130, the most dangerous handlers to extract first are likely:
1. handleSchemaSubmit / handleSchemaEditSubmit (probably most complex)
2. handleVersionSubmit (likely has compatibility validation)
3. Navigation handlers with multiple state changes

Start with the simplest (Product/Domain/Context CRUD) to build confidence, then
tackle the complex ones with comprehensive test coverage.

My recommendation: Absolutely include testing in Phase 2! The complexity is too
high to refactor safely without immediate test validation at each step.

---

**Start All Servers:**

1. npx partykit dev --port 1999 (running)                                          │
2. npm run dev (running)                                                           │
3. npx wrangler dev --port 8789 (running)


**Find Processes Running on a Specific Port:**
lsof -ti :1999
lsof -ti :5173
lsof -ti :8789


---

**Code Generation**

I now want to implement a source code generator for entire Contexts, where the Context has the following logical path:

```
/Product/Domain/Context/*
```

The * is a wildcard the represents all schema type under the Context. Thus, all existing schemas under the Context will have source code generated:

/Product/Domain/Context/Commands/*
/Product/Domain/Context/Data/*
/Product/Domain/Context/Documents/*
/Product/Domain/Context/Envelopes/*
/Product/Domain/Context/Events/*
/Product/Domain/Context/Queries/*

The rules for generation are:

- The user must select the target language
  - Current targets: C#, Go, Java, JavaScript, Rust, TypeScript
- All source files of each source code generator will be placed under `./src/services/codegen` as follows:
  - `./src/services/codegen/csharp-gen.ts`
  - `./src/services/codegen/golang-gen.ts`
  - `./src/services/codegen/java-gen.ts`
  - `./src/services/codegen/javascript-gen.ts`
  - `./src/services/codegen/rust-gen.ts`
  - `./src/services/codegen/typescript-gen.ts`
- Use the following general SchemaVersion rules:
  - If a schema has a status of `Published`, the most recent version (greatest semantic version) with the Published status will be used for generation
  - If a schema does not have a status of `Published` the most recent version (greatest semantic version) with the Draft status will be used for generation
  - In the below code examples, those shown on a single line are in some cases for convenience only; all code should be generated in the style common to the programming language
- All schema versions will be generated to a single file by target language semantics
- Do you want me to provide the individual programming language rules together or one language at a time?

Follow-up questions and answers:

1. Regarding your question about providing rules, I'd prefer one language
  - Answer: Perfect. I will provide the rules for one programming language at a time starting with C#

2. Architecture questions:
  - Where should the generation be triggered from?
    - Answer: Let's place a new menu item on the Context's menu: Generate; let's use the Lucid Braces icon
    - Answer: Open a SourceCodeGenerationModal dialog with options
      - Label: Display the path to the context is is done when pinning a level to the top of the hierarchy tree view
      - Other options identified below
      - Label: Target Language
      - Dropdown selection: List of target languages for single item selection
  - Output delivery:
    - Answer: At least initially, just directly and automatically download of the source file
      - Modal Label: Display the filename in the form of SchemaNameSchemas.cs (.cs is only for C#; use appropriate file extension per language: .cs, .go, .java, .js, .rs, .ts)
  - Namespace/Package naming:
    - Answer: If the Context's namespace field exists, copy it to the modal as follows:
      - Modal Label: Namespace (for C# only)
        - Use appropriate name per language
      - Modal Text field: namespace

  3. Version selection strategy confirmation:
    - Answer: Yes, yes, and sort of: generate deprecated; ignore removed

  4. Cross-references; Should the generator:
    - A. Resolve these to the appropriate types in the target language?
      - Answer: Yes; All Context schemas are to be generated as self-sustaining, meaning that the singular generated source code file will contain all schema types
    - B. Handle circular dependencies?
      - Answer: Yes, if necessary, but bi-directional circular references are in general bad design
      - Answer: If a give target programming language requires dependencies to exist before dependents, the types must be generated in the specific order to avoid compilation/interpretation errors
    - C. Generate all referenced Data schemas even if they're in the same Context?
      - Answer: Yes; See 4.A
      - Answer: See 4.B


- C#:
  - namespace: The Schema type namespace field will be used as the C# namespace and always be generated as PascalCase even if the namespace field is declared in another case format
    - namespace segments are divided by dots (.)
    - When the schema category changes, the category namespace is declared as nested in the Context namespace. The following example is on a single line only for convenience and does not reflect a format that lacks line-breaks and indentation common to C# programs:
      `namespace Context.Namespace.Field.Text { namespace Data { public class SomeDataType { ... } } }`
  - using: generate a using statement with a trailing wildcard for all complex type classes that are referenced from a namespace other than the namespace of the declaring schema type class; for example, schema types referenced from the Data category (`data.SomeType someField`) should have a corresponding using statement declared (`using Context.Namespace.Field.Text.Data.*;`)
  - class name: The Schema type name will be used as the C# class name and always be generated in PascalCase even if the type name is declared in another case format
  - constructor: A constructor must be generated that takes the primitive and complex field type as parameters in the order of schema type declaration
  - properties: All schema type fields will be generated as read-only properties always in PascalCase such that the setter can be called only by the constructor:
    - for example: `public string SomeProperty { get; private set; }`
- Go:
  - package: The Schema type namespace field will be used as the C# namespace and will always be generated as lowercase even if the namespace field is declared in another case format; namespace segments are divided by dots (.)
  - struct name: The Schema type name will be used as the Go struct type name and always be generated in PascalCase even if the type name is declared in another case format
  - constructor: factory functions in the form NewSchemaType where "New" is always pre-pended to the PascalCase struct name
  - properties: All schema type fields are public to importers

  Go follow-up questions and answers:

  1. Package Declaration
    - Replace dots with underscores as you suggested: `package com_example_mycontext`
  2. Field/Property Details
    - Answer: Yes, field naming convention: PascalCase for public fields and all fields are public
    - Answer: Yes, please use field tags for JSON serialization
    - Answer: All structs should be declared independently of all others and be referenced as separate fields in dependent structs
  3. Constructor/Factory Function
    - Answer: Yes, parameters for NewSchemaType function should take all fields as parameters (like C#)
    - Answer: Because the struct is intended to be immutable, please return the struct value upon creation
  4. Type Mappings
    - Answer: Yes, exactly as stated in your examples.
  5. Arrays:
    - Answer: Arrays should be fixed length per the length of the deserialized data
  6. Cross-Category References
    - Answer: There should be no need to import additional types because all Context schemas are to be generated as self-sustaining, meaning that the singular generated source code file will contain all schema types.
      - If I have misunderstood your question, please clarify before starting generation
  7. File Organization
    - Answer: Yes, produce a single generated file for all types within the specific Context
  8. Default Values
    - Answer: Use variadic options pattern
  9. Special Attributes
    - Answer: Substitute schemaTypeName for type
    - Answer: Substitute schemaSemanticVersion for version
    - Answer: Substitute schemaInstanceTimestamp for timestamp

  Do these answers satisfy your questions?


- Java:
  - package: The Schema type namespace field will be used as the Java package name and always be generated as lowercase even if the namespace field is declared in another case format
    - package segments are divided by dots (.)
    - All schemas are declared as static inner classes of one outer class named {ContextName}Schemas where {ContextName} is the name of the Context as a valid Java classname in PascalCase
    - When the schema category changes, the category {CategoryName} is declared as static inner class of the outer class {ContextName}Schemas. The following example is on a single line only for convenience and does not reflect a format that lacks line-breaks and indentation common to Java programs:
      `package context.namespace.field.text; public class ContextNameSchemas { public static class Data { public static class SomeDataType { ... } } }`
  - import: generate an import statement with a trailing wildcard for all complex type classes that are referenced from a namespace other than the namespace of the declaring schema type class; for example, schema types referenced from the Data category (`data.SomeType someField`) should have a corresponding using statement declared (`import context.namespace.field.text.Data.*;`)
  - class name: The Schema type name will be used as the Java class name and always be generated in PascalCase even if the type name is declared in another case format
  - constructor: A constructor must be generated that takes the primitive and complex field type as parameters in the order of schema type declaration
  - attributes (aka fields or properties): All schema type fields will be generated as `public final` and always in camelCase; there are no set or get methods:
    - for example: `public final String someAttribute;`

  Do you have enough detail to implement the Java source code generator?


- JavaScript and TypeScript

  - Are you able to implement JavaScript and TypeScript code generators based on the rules for Go and Java code generation? I want to use classes for both JavaScript and TypeScript. I think that they might be similar to Java in some ways, but there won't be nested classes (outer and inner classes). The classes will be declared more like the Go structs are generated, flat in a single file with exports for each class. Is that accurate? Do you have enough information based on this to implement the generators for both JavaScript and TypeScript?

  - Questions and answers:

  1. Field visibility: Should fields be public readonly (TypeScript) or just regular properties?
    - Answer: Please use public readonly
  2. Constructor style: TypeScript allows shorthand like constructor(public readonly givenName: string). Use shorthand or
  explicit field declarations?
    - Answer: Please use explicit field declarations
  3. Special fields: How should type, version, timestamp be handled? (Same as other languages with substitutions?)
    - Answer: Yes, the same as the other language substitutions
  4. Imports: For cross-category references, should we use ES6 imports? Or are all classes in one file so no imports needed?
    - Answer: All classes are in one file so there is no need for imports
  5. Category organization: Since it's flat, should class names include category prefix? Like DataFullName and
  EventsUserRegistered? Or just FullName and UserRegistered?
    - Answer: I just learned that in fact TypeScript has namespaces and can use nested namespaces just as C# can. For TypeScript I want to model the schema types inside nested namespaces just like the C# implementation
    - Answer: For JavaScript, we can use nested `const ModuleName { ... }` in the same way that TypeScript namespaces work. For JavaScript I want to model the schema types inside nested const modules just like the C# and TypeScript implementations use namespaces

- Rust

  - I really don't know a lot about the Rust programming language. I know that it uses `struct` rather than `class`, which means it is somewhat like Go. I also know that it favors snake_case over other case formats. And I think that every behavior is a function. I want struct properties/fields to be readonly/immutable to maintain structs immutable. Use the `#[readonly::make]` for each struct to create public read-only attributes but no writable attributes. As with the other languages, I want to generate all schemas into one file. I want to use nested modules using the `mod` keyword as there are nested namespaces in C#. Regarding basic/primitive data types: boolean is bool; char is char; int is i32; float is f32; double is f64; string is &str; short is i16; long is i64. What additional information do you need?

  - Questions and answers:

  1. Module structure: Should the outer module name be the namespace (like Com.Example.UserMgmt) converted to snake_case? And
  nested modules for categories (Commands, Data, etc.)?
    - Answer: Yes, please use snake_case for the outer module name. Also the category module names should be in lowercase to align with snake_case format

  2. Struct fields: Should field names be in snake_case? (e.g., given_name instead of givenName)
    - Answer: Yes, please use snake_case for field names.

  3. String ownership: Rust has &str (borrowed) and String (owned). For struct fields that need to own their data, should I use
  String instead of &str? (Typically structs own their data)
    - Answer: Please do what is typical, so yes, please make string fields owned by their struct

  4. Arrays/Vectors: Should arrays use Vec<T> (growable vector) or &[T] (slice)?
    - Answer: struct arrays should be fixed size (not growable) based on the data deserialized into the arrays

  5. Constructor/builder: Rust doesn't have constructors like other languages. Should I generate a new() function for each
  struct?
    - Answer: Yes, please create a new() function

  6. Derives: Should structs derive common traits like Debug, Clone? For example:
    - Answer: Yes, please derive Debug. No, please do not derive Clone.

  7. File extension: Should the output be .rs?
    - Answer: Yes, please use .rs for file extensions

  8. Namespace to module conversion:
    - Com.Example.UserMgmt → com::example::user_mgmt (snake_case with ::)?
    - Or just use the last segment as the outer module name?
    - Answer: Please snake_case the full name: com_example_user_mgmt