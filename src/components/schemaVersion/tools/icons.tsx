import React from 'react';
import { SchemaTypeCategory } from '../../../types/schema';
import { CATEGORY_ICONS } from '../constants';

/**
 * Icon utilities for schema categories
 * Complexity: ~1 point total
 */

/**
 * Get the appropriate icon for a schema category
 * Simplified from switch statement to object lookup
 * Complexity: 1 point (1 ternary condition)
 */
export const getCategoryIcon = (category?: SchemaTypeCategory): React.ReactElement | null => {
  return category ? CATEGORY_ICONS[category] || null : null;
};