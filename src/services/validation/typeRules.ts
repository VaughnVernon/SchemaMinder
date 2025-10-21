/**
 * Configuration-driven type validation rules
 * This eliminates conditional logic in favor of data-driven validation
 */

export interface TypeRule {
  acceptedTypes: string[];
  validateValue?: (value: any, fieldRef: string) => string | null;
  description: string;
}

export const TYPE_VALIDATION_RULES: Record<string, TypeRule> = {
  boolean: {
    acceptedTypes: ['boolean'],
    description: 'boolean field requires boolean literal (true or false)'
  },
  
  byte: {
    acceptedTypes: ['byte', 'int'],
    validateValue: (value: number, fieldRef: string) => {
      if (value < 0 || value > 255) {
        return `Field '${fieldRef}': byte value ${value} is out of range (0-255)`;
      }
      return null;
    },
    description: 'byte field requires numeric literal'
  },
  
  char: {
    acceptedTypes: ['char'],
    validateValue: (value: string, fieldRef: string) => {
      if (value.length !== 1) {
        return `Field '${fieldRef}': char literal must be exactly one character`;
      }
      return null;
    },
    description: "char field requires character literal ('c')"
  },
  
  short: {
    acceptedTypes: ['short', 'int'],
    validateValue: (value: number, fieldRef: string) => {
      if (value < -32768 || value > 32767) {
        return `Field '${fieldRef}': short value ${value} is out of range (-32,768 to 32,767)`;
      }
      return null;
    },
    description: 'short field requires numeric literal'
  },
  
  int: {
    acceptedTypes: ['int'],
    validateValue: (value: number, fieldRef: string) => {
      if (value < -2147483648 || value > 2147483647) {
        return `Field '${fieldRef}': int value ${value} is out of range (-2,147,483,648 to 2,147,483,647)`;
      }
      return null;
    },
    description: 'int field requires integer literal'
  },
  
  long: {
    acceptedTypes: ['long', 'int'],
    validateValue: (value: number, fieldRef: string) => {
      if (value < -9223372036854775808 || value > 9223372036854775807) {
        return `Field '${fieldRef}': long value ${value} is out of range (-9,223,372,036,854,775,808 to 9,223,372,036,854,775,807)`;
      }
      return null;
    },
    description: 'long field requires numeric literal'
  },
  
  float: {
    acceptedTypes: ['float', 'double', 'int'],
    validateValue: (value: number, fieldRef: string) => {
      if (Math.abs(value) > 3.4028235E38) {
        return `Field '${fieldRef}': float value ${value} is out of range (-3.4028235E38 to 3.4028235E38)`;
      }
      return null;
    },
    description: 'float field requires numeric literal'
  },
  
  double: {
    acceptedTypes: ['double', 'float', 'int'],
    validateValue: (value: number, fieldRef: string) => {
      if (Math.abs(value) > 1.7976931348623157E308) {
        return `Field '${fieldRef}': double value ${value} is out of range (-1.7976931348623157E+308 to 1.7976931348623157E+308)`;
      }
      return null;
    },
    description: 'double field requires numeric literal'
  },
  
  string: {
    acceptedTypes: ['string'],
    validateValue: (value: string, fieldRef: string) => {
      if (value.length === 0 || value.length > 64) {
        return `Field '${fieldRef}': string must be 1-64 characters, got ${value.length}`;
      }
      return null;
    },
    description: 'string field requires string literal ("text")'
  }
};

/**
 * Rule-based type validator that uses configuration instead of conditionals
 */
export function validateWithRules(primitiveType: string, literal: any, fieldRef: string): string | null {
  const rule = TYPE_VALIDATION_RULES[primitiveType];
  
  if (!rule) {
    return `Field '${fieldRef}': Unknown primitive type '${primitiveType}'`;
  }
  
  // Check if literal type is accepted
  if (!rule.acceptedTypes.includes(literal.type)) {
    return `Field '${fieldRef}': ${rule.description}, got ${literal.type}`;
  }
  
  // Apply custom value validation if provided
  if (rule.validateValue) {
    return rule.validateValue(literal.value, fieldRef);
  }
  
  return null;
}