// Schema Specification Grammar for PEG.js
// Converted from ANTLR grammar to support browser-based parsing

start = specification

specification
  = category:typeName _ name:schemaName _ "{" _ fields:fieldDeclaration* _ "}" _
  { return { category, name, fields }; }

typeName
  = "command" { return 'command'; }
  / "data" { return 'data'; }
  / "document" { return 'document'; }
  / "envelope" { return 'envelope'; }
  / "event" { return 'event'; }
  / "query" { return 'query'; }

schemaName
  = identifier

fieldDeclaration
  = _ field:(primitiveField / schemaTypeNameField / versionField / timestampField / complexField) _
  { return field; }

primitiveField
  = type:primitiveType _ name:identifier _ defaultVal:defaultValue?
  { 
    return { 
      type: { 
        kind: 'primitive', 
        type: type.type, 
        isArray: type.isArray 
      }, 
      name, 
      ...(defaultVal && { defaultValue: defaultVal })
    }; 
  }

primitiveType
  = type:("boolean" / "byte" / "char" / "double" / "float" / "int" / "long" / "short" / "string") array:arrayMarker?
  { return { type, isArray: !!array }; }

schemaTypeNameField
  = "type" _ name:identifier
  { return { type: { kind: 'special', type: 'schemaTypeName' }, name }; }

versionField
  = "version" _ name:identifier
  { return { type: { kind: 'special', type: 'version' }, name }; }

timestampField
  = "timestamp" _ name:identifier
  { return { type: { kind: 'special', type: 'timestamp' }, name }; }

complexField
  = type:complexType _ name:identifier
  { return { type, name }; }

complexType
  = category:identifier "." schema:identifier version:versionReference? array:arrayMarker?
  { 
    return { 
      kind: 'complex', 
      category, 
      schemaName: schema, 
      ...(version && { version }),
      isArray: !!array 
    }; 
  }
  / schema:validSchemaName array:arrayMarker?
  { 
    return { 
      kind: 'complex', 
      schemaName: schema, 
      isArray: !!array 
    }; 
  }

validSchemaName
  = first:[A-Z] rest:[a-zA-Z0-9]*
  { return first + rest.join(''); }

versionReference
  = ":" version:versionNumber
  { return version; }

versionNumber
  = major:digits "." minor:digits "." patch:digits
  { return major + "." + minor + "." + patch; }

arrayMarker
  = "[" _ "]"
  { return true; }

defaultValue
  = "=" _ value:(primitiveValue / arrayValue)
  { return value; }

primitiveValue
  = booleanLiteral
  / doubleLiteral  // Must come before intLiteral to handle decimals
  / floatLiteral   // Must come before intLiteral to handle decimals
  / byteLiteral
  / charLiteral
  / longLiteral
  / shortLiteral
  / intLiteral
  / stringLiteral

arrayValue
  = "{" _ elements:arrayElements _ "}"
  { return { type: 'array', elements }; }

arrayElements
  = first:primitiveValue rest:(_ "," _ primitiveValue)*
  { return [first].concat(rest.map(r => r[3])); }
  / ""
  { return []; }

booleanLiteral
  = value:("true" / "false")
  { return { type: 'boolean', value: value === 'true' }; }

byteLiteral
  = sign:"-"? value:digits
  { return { type: 'byte', value: parseInt((sign || '') + value, 10) }; }

charLiteral
  = "'" value:(escapedChar / [^'\\]) "'"
  { return { type: 'char', value }; }

doubleLiteral
  = sign:"-"? whole:digits "." decimal:digits
  { return { type: 'double', value: parseFloat((sign || '') + whole + '.' + decimal) }; }

floatLiteral
  = sign:"-"? whole:digits "." decimal:digits
  { return { type: 'float', value: parseFloat((sign || '') + whole + '.' + decimal) }; }

intLiteral
  = sign:"-"? value:digits
  { return { type: 'int', value: parseInt((sign || '') + value, 10) }; }

longLiteral
  = sign:"-"? value:digits
  { return { type: 'long', value: parseInt((sign || '') + value, 10) }; }

shortLiteral
  = sign:"-"? value:digits
  { return { type: 'short', value: parseInt((sign || '') + value, 10) }; }

stringLiteral
  = '"' value:(escapedChar / [^"\\])* '"'
  { return { type: 'string', value: value.join('') }; }

escapedChar
  = "\\" char:[btnfr"'\\]
  { 
    const escapes = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', "'": "'", '\\': '\\' };
    return escapes[char] || char;
  }
  / "\\" "u" hex1:hexDigit hex2:hexDigit hex3:hexDigit hex4:hexDigit
  { return String.fromCharCode(parseInt(hex1 + hex2 + hex3 + hex4, 16)); }

identifier
  = first:[a-zA-Z] rest:[a-zA-Z0-9]*
  { return first + rest.join(''); }

digits
  = chars:[0-9]+
  { return chars.join(''); }

hexDigit
  = [0-9a-fA-F]

// Whitespace and comments
_
  = (whitespace / comment)*

whitespace
  = [ \t\r\n]

comment
  = "//" [^\r\n]*
  / "/*" (!"*/" .)* "*/"