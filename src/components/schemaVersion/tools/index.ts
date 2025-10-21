/**
 * Re-exports all utilities from focused files
 * This approach maintains the same public interface while improving organization
 */

// Validation utilities
export { validateFormReadiness } from './validation';
export type { ValidationResult } from './validation';

// Icon utilities  
export { getCategoryIcon } from './icons';

// Status-based business rules
export { isFieldEditableByStatus, getAllowedStatusTransitions } from './statusRules';

// Formatting and data utilities
export { 
  buildVersionData, 
  formatCompatibilityError, 
  getFormTitle, 
  getSubmitButtonText 
} from './formatting';

// Re-export from external service (maintaining backward compatibility)
export { prepareSpecificationWithTodo } from '../../../services/specificationTodoProcessor';