/**
 * Date and time formatting service
 */

/**
 * Format a date string to localized string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
