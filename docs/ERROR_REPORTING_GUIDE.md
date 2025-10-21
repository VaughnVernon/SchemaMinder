# Error Reporting Guide for Schema Specification Validation

## How Error Reporting Works

The ANTLR 4 parser provides comprehensive error reporting with precise location information for schema specifications.

### Error Structure

```typescript
interface ParseError {
  message: string;           // Human-readable error description
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  severity: 'error' | 'warning';
}
```

## Types of Errors Detected

### 1. **Syntax Errors**
- Missing closing braces
- Invalid tokens
- Malformed array literals
- Missing required elements

**Example:**
```
command CreateUser {
  string name
  // Missing closing brace
```
**Error:** `Line 3: missing '}' at '<EOF>'`

### 2. **Type Errors**
- Unknown primitive types
- Invalid field types
- Unrecognized keywords

**Example:**
```
command CreateUser {
  invalidtype username
}
```
**Error:** `Line 2: no viable alternative at input 'invalidtype'`

### 3. **Structural Errors**
- Invalid type categories (not command/data/event/etc.)
- Malformed field declarations

**Example:**
```
invalidcategory MySchema {
  string field
}
```
**Error:** `Line 1: mismatched input 'invalidcategory' expecting {command, data, document, envelope, event}`

### 4. **Default Value Errors**
- Type mismatches in default values
- Invalid array syntax

**Example:**
```
command CreateUser {
  string name = 123  // Number assigned to string
}
```
**Error:** `Line 2: expecting STRING_LITERAL`

## Visual Error Display in Forms

### Real-time Validation
The `SpecificationValidator` component provides:

1. **Live validation** as you type (500ms debounce)
2. **Color-coded status indicators**:
   - 🟢 Green border & checkmark for valid specifications
   - 🔴 Red border & error icon for invalid specifications
   - 🟡 Yellow warnings for non-critical issues

3. **Detailed error messages** with line/column information
4. **Parsed structure preview** for valid specifications

### Integration in SchemaForm

```tsx
<SpecificationValidator
  specification={specification}
  onValidationChange={setIsSpecificationValid}
  showSuccessMessage={true}
/>
```

### Features:

1. **Prevents form submission** when specification has errors
2. **Shows error count** in summary
3. **Lists all errors** with line numbers
4. **Displays parsed structure** when valid

## Example Error Scenarios

### Scenario 1: Missing Required Fields
```
event UserCreated {
  // Empty specification
}
```
**Display:** ❌ 1 error - "Specification must contain at least one field"

### Scenario 2: Invalid Version Reference
```
command ProcessOrder {
  data.OrderInfo:invalid.version orderData
}
```
**Display:** ❌ Line 2: Invalid version format, expected semantic version (e.g., 1.2.3)

### Scenario 3: Multiple Errors
```
command BadCommand {
  string[] names = { "one", "two"  // Missing closing brace
  invalidtype field
  boolean flag = "true"  // String instead of boolean
```
**Display:** 
- ❌ 3 errors
- Line 2: Missing '}' in array literal
- Line 3: Unknown type 'invalidtype'
- Line 4: Type mismatch - expected boolean literal

## User Experience Benefits

1. **Immediate Feedback**: Users see errors as they type
2. **Precise Location**: Exact line and column for each error
3. **Clear Messages**: Human-readable error descriptions
4. **Prevention**: Cannot submit invalid specifications
5. **Learning Aid**: Shows valid structure when correct

## CSS Classes for Styling

```css
.validation-error      /* Red border on textarea */
.validation-success    /* Green border on textarea */
.error-item           /* Individual error message */
.error-item.warning   /* Warning styling */
.parsed-structure     /* Valid specification preview */
```

## Customization Options

The validator component accepts props for customization:

```typescript
interface SpecificationValidatorProps {
  specification: string;
  onValidationChange?: (isValid: boolean) => void;
  showSuccessMessage?: boolean;  // Show green success indicator
  className?: string;             // Additional CSS classes
}
```

## Future Enhancements

1. **Syntax highlighting** in textarea
2. **Auto-completion** for types and keywords
3. **Quick fixes** for common errors
4. **Error recovery suggestions**
5. **Import validation** for referenced schemas