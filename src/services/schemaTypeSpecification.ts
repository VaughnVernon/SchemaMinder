import { SchemaTypeCategory, SCHEMA_TYPE_CATEGORIES, Schema, SchemaVersion } from '../types/schema';
import { SemanticVersion } from './semanticVersion';

/**
 * Service for managing schema type specification formatting and parsing.
 * This will be extended to support specification parsing and validation.
 */

/**
 * Validates a semantic version string.
 * Returns true if the version follows semantic versioning format (e.g., "1.0.0", "2.1.3").
 * Supports formats: MAJOR.MINOR.PATCH with optional pre-release (-alpha, -beta, -rc.1) and metadata (+build123)
 */
export function isValidSemanticVersion(version: string): boolean {
  if (!version || typeof version !== 'string') {
    return false;
  }
  
  // Semantic versioning regex pattern
  // Matches: MAJOR.MINOR.PATCH with optional pre-release and build metadata
  // Examples: 1.0.0, 2.1.3, 1.0.0-alpha, 1.0.0-beta.1, 1.0.0+build123, 1.0.0-rc.1+build456
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  
  return semverRegex.test(version);
}

/**
 * Gets an error message for an invalid semantic version.
 */
export function getSemanticVersionError(version: string): string | null {
  if (!version) {
    return 'Semantic version is required';
  }
  
  if (!isValidSemanticVersion(version)) {
    return 'Version must follow semantic versioning format (e.g., 1.0.0, 2.1.3)';
  }
  
  return null;
}

interface CategoryConfig {
  categoryName: string;
  friendlyName: string;
  typeName: string;
}

/**
 * Generates a new specification template for a schema.
 * Used when creating a new schema with no existing specification.
 */
export function generateSpecificationTemplate(
  categoryConfig: CategoryConfig,
  schemaName: string
): string {
  return `${categoryConfig.typeName} ${schemaName.trim()} {
  // TODO: details here
}`;
}

/**
 * Updates an existing specification by replacing the typeName and/or schemaName tokens.
 * Preserves all formatting including linebreaks and structure.
 */
export function updateExistingSpecification(
  existingSpecification: string,
  categoryConfig: CategoryConfig,
  schemaName: string
): string {
  // Get all valid typeNames for validation
  const validTypeNames = Object.values(SCHEMA_TYPE_CATEGORIES).map(cat => cat.typeName);
  
  // Parse the specification more carefully to preserve formatting
  // Match pattern: [typeName] [schemaName] { ... }
  const specMatch = existingSpecification.match(/^(\S+)(\s+)(\S+)(\s*\{[\s\S]*\})?$/);
  
  if (specMatch) {
    const [, firstToken, spaceBetween, secondToken, restOfSpec] = specMatch;
    let updatedFirstToken = firstToken;
    let updatedSecondToken = secondToken;
    
    // Update first token if it's a valid typeName
    if (validTypeNames.includes(firstToken)) {
      updatedFirstToken = categoryConfig.typeName;
    }
    
    // Update second token with the current name (if name is not empty)
    if (schemaName.trim()) {
      updatedSecondToken = schemaName.trim();
    }
    
    // Reconstruct the specification preserving the rest including all formatting
    // If there's no brace structure, add one only if we have a valid schema name
    if (!restOfSpec && schemaName.trim()) {
      return `${updatedFirstToken} ${updatedSecondToken} {
  // TODO: details here
}`;
    }
    return `${updatedFirstToken}${spaceBetween}${updatedSecondToken}${restOfSpec || ''}`;
  } 
  
  // Handle case where there's no opening brace yet
  if (!existingSpecification.includes('{')) {
    const tokens = existingSpecification.trim().split(/\s+/);
    
    // Only process if we have 1-2 tokens (valid partial spec format)
    if (tokens.length >= 1 && tokens.length <= 2 && existingSpecification.trim()) {
      // Update first token if valid
      if (validTypeNames.includes(tokens[0])) {
        tokens[0] = categoryConfig.typeName;
      }
      // Update second token if it exists and name is set
      if (tokens.length >= 2 && schemaName.trim()) {
        tokens[1] = schemaName.trim();
      } else if (tokens.length === 1 && schemaName.trim()) {
        // Add the name as second token
        tokens.push(schemaName.trim());
      }
      
      // Add the brace structure if both tokens exist
      if (tokens.length >= 2) {
        return `${tokens[0]} ${tokens[1]} {
  // TODO: details here
}`;
      } else {
        return tokens.join(' ');
      }
    }
  }
  
  // If we can't parse it, return as-is
  return existingSpecification;
}

/**
 * Main function to format a specification based on category and schema name.
 * Automatically chooses between generating new or updating existing specification.
 */
export function formatSpecification(
  existingSpecification: string,
  category: SchemaTypeCategory,
  schemaName: string
): string {
  const categoryConfig = SCHEMA_TYPE_CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid schema type category: ${category}`);
  }
  
  // If specification is empty and name is set, generate template
  if (schemaName.trim() && !existingSpecification.trim()) {
    return generateSpecificationTemplate(categoryConfig, schemaName);
  }
  
  // If specification exists (and is not just whitespace), update it
  if (existingSpecification.trim()) {
    return updateExistingSpecification(existingSpecification, categoryConfig, schemaName);
  }
  
  // Default case - if name is empty, return empty string; otherwise return original
  if (!schemaName.trim()) {
    return '';
  }
  
  return existingSpecification;
}

/**
 * Gets the current version string from a schema.
 * If baseVersion is provided, returns that version.
 * Otherwise returns the latest version.
 */
export function getCurrentVersionString(schema: Schema | null, baseVersion?: SchemaVersion | null): string {
  if (!schema || !schema.versions || schema.versions.length === 0) return '0.0.0';
  
  // If a base version is provided, use it
  if (baseVersion) {
    return baseVersion.semanticVersion;
  }
  
  // Otherwise, get the latest version
  const sortedVersions = [...schema.versions].sort((a, b) => {
    const versionA = SemanticVersion.parse(a.semanticVersion);
    const versionB = SemanticVersion.parse(b.semanticVersion);
    if (!versionA || !versionB) return 0;
    return SemanticVersion.compare(versionA, versionB);
  });
  
  // Return the latest (highest) version
  return sortedVersions[sortedVersions.length - 1].semanticVersion;
}

/**
 * Suggests the next semantic version.
 * If baseVersion is provided, increments within the same major version.
 * Otherwise uses the latest version.
 */
export function getSuggestedNextVersion(schema: Schema | null, baseVersion?: SchemaVersion | null): string {
  if (!schema || !schema.versions || schema.versions.length === 0) return '0.1.0';
  
  // If a base version is provided, work from that
  const currentVersion = baseVersion 
    ? baseVersion.semanticVersion 
    : getCurrentVersionString(schema);
  
  const versionParts = currentVersion.split('.');
  if (versionParts.length !== 3) return '0.1.0';
  
  const major = parseInt(versionParts[0]) || 0;
  
  // Find the highest minor version within the same major version
  const sameMajorVersions = schema.versions.filter(v => {
    const parts = v.semanticVersion.split('.');
    return parts.length === 3 && parseInt(parts[0]) === major;
  });
  
  // Get the highest minor version in this major version line
  let highestMinor = 0;
  sameMajorVersions.forEach(v => {
    const parts = v.semanticVersion.split('.');
    const minor = parseInt(parts[1]) || 0;
    if (minor > highestMinor) {
      highestMinor = minor;
    }
  });
  
  // Suggest the next minor version in this major version line
  return `${major}.${highestMinor + 1}.0`;
}

/**
 * Gets the specification from a version.
 * If baseVersion is provided, returns its specification.
 * Otherwise returns the latest version's specification.
 */
export function getPreviousSpecification(schema: Schema | null, baseVersion?: SchemaVersion | null): string | undefined {
  if (!schema || !schema.versions || schema.versions.length === 0) return undefined;
  
  // If a base version is provided, use its specification
  if (baseVersion) {
    return baseVersion.specification;
  }
  
  // Otherwise, get the latest version's specification
  const sortedVersions = [...schema.versions].sort((a, b) => {
    const versionA = SemanticVersion.parse(a.semanticVersion);
    const versionB = SemanticVersion.parse(b.semanticVersion);
    if (!versionA || !versionB) return 0;
    return SemanticVersion.compare(versionA, versionB);
  });
  
  // Return the specification from the latest (highest) version
  const latestVersion = sortedVersions[sortedVersions.length - 1];
  return latestVersion.specification;
}

/**
 * Rule 1: Checks if a schema has any versions with status other than Draft.
 * When true, the schema name should be read-only in SchemaForm.tsx.
 */
export function hasNonDraftVersions(schema: Schema | null): boolean {
  if (!schema || !schema.versions || schema.versions.length === 0) {
    return false;
  }
  
  return schema.versions.some(version => version.status !== 'Draft');
}

/**
 * Rule 2: Updates all schema version specifications with a new schema name.
 * This maintains the existing typeName but replaces the schemaName part.
 * Returns an array of updated schema versions.
 */
export function updateAllVersionSpecifications(
  schema: Schema,
  newSchemaName: string
): SchemaVersion[] {
  if (!schema || !schema.versions || schema.versions.length === 0) {
    return [];
  }

  const categoryConfig = SCHEMA_TYPE_CATEGORIES[schema.schemaTypeCategory];
  if (!categoryConfig) {
    throw new Error(`Invalid schema type category: ${schema.schemaTypeCategory}`);
  }

  return schema.versions.map(version => ({
    ...version,
    specification: updateExistingSpecification(
      version.specification,
      categoryConfig,
      newSchemaName
    )
  }));
}