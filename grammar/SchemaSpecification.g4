grammar SchemaSpecification;

// Entry point
specification: typeName schemaName '{' fieldDeclaration* '}' EOF ;

// Type name (category)
typeName: COMMAND | DATA | DOCUMENT | ENVELOPE | EVENT | QUERY ;

// Schema name
schemaName: IDENTIFIER ;

// Field declarations
fieldDeclaration: 
    primitiveField 
    | schemaTypeNameField
    | versionField
    | timestampField
    | complexField
    ;

// Primitive fields
primitiveField: primitiveType IDENTIFIER defaultValue? ;

primitiveType: 
    BOOLEAN arrayMarker?
    | BYTE arrayMarker?
    | CHAR arrayMarker?
    | DOUBLE arrayMarker?
    | FLOAT arrayMarker?
    | INT arrayMarker?
    | LONG arrayMarker?
    | SHORT arrayMarker?
    | STRING arrayMarker?
    ;

// Special built-in fields
schemaTypeNameField: TYPE IDENTIFIER ;
versionField: VERSION IDENTIFIER ;
timestampField: TIMESTAMP IDENTIFIER ;

// Complex schema references
complexField: complexType IDENTIFIER ;

complexType:
    IDENTIFIER arrayMarker?                                           // Same category reference
    | IDENTIFIER DOT IDENTIFIER versionReference? arrayMarker?        // Cross-category reference
    ;

versionReference: COLON VERSION_NUMBER ;

// Array marker
arrayMarker: '[' ']' ;

// Default values
defaultValue: '=' (primitiveValue | arrayValue) ;

primitiveValue: 
    BOOLEAN_LITERAL
    | BYTE_LITERAL
    | CHAR_LITERAL
    | DOUBLE_LITERAL
    | FLOAT_LITERAL
    | INT_LITERAL
    | LONG_LITERAL
    | SHORT_LITERAL
    | STRING_LITERAL
    ;

arrayValue: '{' primitiveValue (',' primitiveValue)* '}' ;

// Lexer rules (tokens)

// Keywords for type categories
COMMAND: 'command' ;
DATA: 'data' ;
DOCUMENT: 'document' ;
ENVELOPE: 'envelope' ;
EVENT: 'event' ;
QUERY: 'query' ;

// Keywords for primitive types
BOOLEAN: 'boolean' ;
BYTE: 'byte' ;
CHAR: 'char' ;
DOUBLE: 'double' ;
FLOAT: 'float' ;
INT: 'int' ;
LONG: 'long' ;
SHORT: 'short' ;
STRING: 'string' ;

// Keywords for special types
TYPE: 'type' ;
VERSION: 'version' ;
TIMESTAMP: 'timestamp' ;

// Literals
BOOLEAN_LITERAL: 'true' | 'false' ;
BYTE_LITERAL: '-'? [0-9]+ ;
CHAR_LITERAL: '\'' ( ~['\\\r\n] | EscapeSequence ) '\'' ;
DOUBLE_LITERAL: '-'? [0-9]+ '.' [0-9]+ ;
FLOAT_LITERAL: '-'? [0-9]+ '.' [0-9]+ ;
INT_LITERAL: '-'? [0-9]+ ;
LONG_LITERAL: '-'? [0-9]+ ;
SHORT_LITERAL: '-'? [0-9]+ ;
STRING_LITERAL: '"' ( ~["\\\r\n] | EscapeSequence )* '"' ;

// Version number (semantic version format)
VERSION_NUMBER: [0-9]+ '.' [0-9]+ '.' [0-9]+ ;

// Identifiers
IDENTIFIER: [a-zA-Z][a-zA-Z0-9]* ;

// Operators and punctuation
DOT: '.' ;
COLON: ':' ;

// Escape sequences for string and character literals
fragment EscapeSequence:
    '\\' [btnfr"'\\]
    | UnicodeEscape
    ;

fragment UnicodeEscape:
    '\\' 'u' HexDigit HexDigit HexDigit HexDigit
    ;

fragment HexDigit: [0-9a-fA-F] ;

// Whitespace and comments
WS: [ \t\r\n]+ -> skip ;

// Comments
COMMENT: '//' ~[\r\n]* -> skip ;
BLOCK_COMMENT: '/*' .*? '*/' -> skip ;