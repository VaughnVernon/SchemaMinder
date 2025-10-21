/**
 * Service for processing TODO comments in schema specifications
 * Extracted from tools.tsx to reduce complexity
 */

const TODO_COMMENT = '  // TODO: for compatibility, make additive-only changes';
const TODO_COMMENT_REGEX = /\s*\/\/\s*TODO:\s*for compatibility,\s*make additive-only changes\s*/g;

/**
 * Remove existing TODO comments from specification
 */
function cleanSpecification(specification: string): string {
  return specification.replace(TODO_COMMENT_REGEX, '');
}

/**
 * Find the index of the last field declaration in the lines array
 */
function findLastFieldIndex(lines: string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('//')) {
      return i;
    }
  }
  return -1;
}

/**
 * Insert TODO comment at the appropriate position
 */
function insertTodoAtIndex(lines: string[], index: number, remainingSpec: string): string {
  const updatedLines = [...lines];
  updatedLines.splice(index + 1, 0, TODO_COMMENT);
  return updatedLines.join('\n') + '\n' + remainingSpec;
}

/**
 * Insert TODO comment before closing brace (fallback)
 */
function insertTodoBeforeClosingBrace(spec: string, braceIndex: number): string {
  return spec.substring(0, braceIndex) + TODO_COMMENT + '\n' + spec.substring(braceIndex);
}

/**
 * Check if specification ends with closing brace
 */
function hasClosingBrace(spec: string): boolean {
  return spec.trim().endsWith('}');
}

/**
 * Get the content before the last closing brace
 */
function splitAtLastBrace(spec: string): { beforeBrace: string; afterBrace: string; braceIndex: number } {
  const braceIndex = spec.lastIndexOf('}');
  return {
    beforeBrace: spec.substring(0, braceIndex),
    afterBrace: spec.substring(braceIndex),
    braceIndex
  };
}

/**
 * Main function to prepare specification with TODO comment for new versions
 * This is the primary export that maintains the original interface
 */
export function prepareSpecificationWithTodo(previousSpecification?: string): string {
  // Handle empty specification
  if (!previousSpecification) {
    return '';
  }

  // Step 1: Clean existing TODO comments
  const cleanedSpec = cleanSpecification(previousSpecification);

  // Step 2: Check if we have a closing brace to work with
  if (!hasClosingBrace(cleanedSpec)) {
    return cleanedSpec;
  }

  // Step 3: Split specification at the last brace
  const { beforeBrace, afterBrace, braceIndex } = splitAtLastBrace(cleanedSpec);
  
  // Step 4: Split into lines for processing
  const lines = beforeBrace.split('\n');
  
  // Step 5: Find the last field declaration
  const lastFieldIndex = findLastFieldIndex(lines);
  
  // Step 6: Insert TODO comment at the appropriate position
  if (lastFieldIndex >= 0) {
    return insertTodoAtIndex(lines, lastFieldIndex, afterBrace);
  } else {
    // Fallback: insert before closing brace
    return insertTodoBeforeClosingBrace(cleanedSpec, braceIndex);
  }
}

// Re-export the constants for backward compatibility
export { TODO_COMMENT, TODO_COMMENT_REGEX };