/**
 * Constants for change notification display
 */

export const ENTITY_TYPE_DISPLAY_NAMES: Record<string, string> = {
  product: 'Product',
  domain: 'Domain',
  context: 'Context',
  schema: 'Schema',
  schema_version: 'Version'
};

export const CHANGE_TYPE_DISPLAY_NAMES: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted'
};

/**
 * Defines which fields are displayed for each entity type (in form display order)
 */
export const RELEVANT_FIELDS_BY_ENTITY_TYPE: Record<string, string[]> = {
  product: ['name', 'description'],
  domain: ['name', 'description'],
  context: ['name', 'namespace', 'description'],
  schema: ['name', 'description', 'schemaTypeCategory', 'scope'],
  schema_version: ['semanticVersion', 'description', 'status', 'specification']
};

/**
 * Maximum length for specification preview before truncation
 */
export const SPECIFICATION_PREVIEW_LENGTH = 200;
