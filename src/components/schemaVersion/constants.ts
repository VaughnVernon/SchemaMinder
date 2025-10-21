import { SchemaStatus, SchemaTypeCategory } from '../../types/schema';
import React from 'react';
import { CircleAlert, Binary, FileText, Mail, Zap, CircleHelp } from 'lucide-react';

/**
 * Constants and messages for SchemaVersionForm
 */

// Status-based messages for form restrictions
export const STATUS_MESSAGES = {
  [SchemaStatus.Published]: {
    icon: '✅',
    title: 'Published Version:',
    message: 'Only description can change and status can be marked Deprecated.'
  },
  [SchemaStatus.Deprecated]: {
    icon: '⚠️',
    title: 'Deprecated Version:',
    message: 'Only description can change and status can be marked Removed.'
  },
  [SchemaStatus.Removed]: {
    icon: '🚫',
    title: 'Removed Version:',
    message: 'This version is read-only and cannot be modified.'
  }
} as const;

// Field names for editability checks
export const FIELD_NAMES = {
  SEMANTIC_VERSION: 'semanticVersion',
  DESCRIPTION: 'description',
  STATUS: 'status',
  SPECIFICATION: 'specification'
} as const;

// Validation error messages
export const VALIDATION_MESSAGES = {
  REMOVED_VERSION_ERROR: 'This version is read-only and cannot be modified.',
  FIX_ERRORS_MESSAGE: 'Please fix all specification and compatibility errors before submitting.',
  VALIDATION_HEADER: 'Form Validation Issues:',
  DEPRECATED_PREFIX: '*DEPRECATED*: '
} as const;

// Modal titles and messages
export const MODAL_CONFIG = {
  ERROR_TITLE: 'Validation Errors',
  STATUS_CONFIRMATION_TITLE: (status: SchemaStatus) => `Set ${status} Status`,
  STATUS_CONFIRMATION_MESSAGE: (status: SchemaStatus) => `Are you sure you want to set the status to ${status}?`,
  COMPATIBILITY_WARNING_TITLE: 'Schema Changes Detected',
  COMPATIBILITY_WARNING_MESSAGE: 'The following changes were detected in your schema:',
  CONFIRM_BUTTON_TEXT: 'Yes',
  CANCEL_BUTTON_TEXT: 'No',
  CREATE_ANYWAY_TEXT: 'Create Anyway',
  OK_TEXT: 'OK',
  CANCEL_TEXT: 'Cancel'
} as const;

// Form labels and placeholders
export const FORM_LABELS = {
  SEMANTIC_VERSION: 'Semantic Version:',
  SEMANTIC_VERSION_PLACEHOLDER: 'e.g., 1.1.0, 2.0.0',
  DESCRIPTION: 'Description:',
  DESCRIPTION_PLACEHOLDER: 'Enter optional version description',
  STATUS: 'Status:',
  SPECIFICATION: 'Specification:',
  SPECIFICATION_PLACEHOLDER: 'Enter your schema specification here...'
} as const;

// Notice styles
export const NOTICE_STYLES = {
  backgroundColor: '#ffffe1',
  border: '1px solid #f2f2d7',
  borderRadius: '4px',
  padding: '8px 12px',
  marginBottom: '16px',
  fontSize: '14px'
} as const;

// Schema category icon mapping (replaces switch statement)
export const CATEGORY_ICONS: Record<SchemaTypeCategory, React.ReactElement> = {
  [SchemaTypeCategory.Commands]: React.createElement(CircleAlert, { size: 20 }),
  [SchemaTypeCategory.Data]: React.createElement(Binary, { size: 20 }),
  [SchemaTypeCategory.Documents]: React.createElement(FileText, { size: 20 }),
  [SchemaTypeCategory.Envelopes]: React.createElement(Mail, { size: 20 }),
  [SchemaTypeCategory.Events]: React.createElement(Zap, { size: 20 }),
  [SchemaTypeCategory.Queries]: React.createElement(CircleHelp, { size: 20 })
} as const;

// Field editability rules for each status in edit mode
export const STATUS_FIELD_EDITABILITY: Record<SchemaStatus, Set<string>> = {
  [SchemaStatus.Draft]: new Set(['semanticVersion', 'description', 'status', 'specification']),
  [SchemaStatus.Published]: new Set(['description', 'status']),
  [SchemaStatus.Deprecated]: new Set(['description', 'status']),
  [SchemaStatus.Removed]: new Set([]) // No fields are editable
} as const;

// Allowed status transitions for each status in edit mode
export const STATUS_TRANSITIONS: Record<SchemaStatus, SchemaStatus[]> = {
  [SchemaStatus.Draft]: Object.values(SchemaStatus), // Can transition to any status
  [SchemaStatus.Published]: [SchemaStatus.Published, SchemaStatus.Deprecated],
  [SchemaStatus.Deprecated]: [SchemaStatus.Deprecated, SchemaStatus.Removed],
  [SchemaStatus.Removed]: [SchemaStatus.Removed] // Cannot transition anywhere
} as const;