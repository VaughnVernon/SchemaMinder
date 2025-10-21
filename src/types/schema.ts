// Shared constants for string literals
export const SCHEMA_SCOPES = {
  Public: 'Public',
  Private: 'Private'
} as const;

export const SCHEMA_STATUSES = {
  Draft: 'Draft',
  Published: 'Published',
  Deprecated: 'Deprecated',
  Removed: 'Removed'
} as const;

export const SCHEMA_TYPE_CATEGORIES = {
  Commands: { categoryName: 'Commands', friendlyName: 'Command', typeName: 'command' },
  Data: { categoryName: 'Data', friendlyName: 'Data', typeName: 'data' },
  Documents: { categoryName: 'Documents', friendlyName: 'Document', typeName: 'document' },
  Envelopes: { categoryName: 'Envelopes', friendlyName: 'Envelope', typeName: 'envelope' },
  Events: { categoryName: 'Events', friendlyName: 'Event', typeName: 'event' },
  Queries: { categoryName: 'Queries', friendlyName: 'Query', typeName: 'query' }
} as const;

// Enums for frontend components
export enum SchemaScope {
  Public = 'Public',
  Private = 'Private',
}

export enum SchemaStatus {
  Draft = 'Draft',
  Published = 'Published',
  Deprecated = 'Deprecated',
  Removed = 'Removed'
}

export enum SchemaTypeCategory {
  Commands = 'Commands',
  Data = 'Data',
  Documents = 'Documents',
  Envelopes = 'Envelopes',
  Events = 'Events',
  Queries = 'Queries'
}

// Type aliases for the constants (for backend)
export type SchemaScopeType = typeof SCHEMA_SCOPES[keyof typeof SCHEMA_SCOPES];
export type SchemaStatusType = typeof SCHEMA_STATUSES[keyof typeof SCHEMA_STATUSES];
export type SchemaTypeCategoryType = typeof SCHEMA_TYPE_CATEGORIES[keyof typeof SCHEMA_TYPE_CATEGORIES]['categoryName'];

// Base interfaces (shared structure)
interface BaseTimestamped {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend/API types (using string dates for JSON serialization)
export interface SchemaVersionAPI extends Omit<BaseTimestamped, 'name'> {
  specification: string;
  semanticVersion: string;
  status: SchemaStatusType;
}

export interface SchemaAPI extends BaseTimestamped {
  schemaTypeCategory: SchemaTypeCategoryType;
  scope: SchemaScopeType;
  contextId: string;
  versions: SchemaVersionAPI[];
}

export interface ContextAPI extends BaseTimestamped {
  namespace?: string;
  domainId: string;
  schemas: SchemaAPI[];
}

export interface DomainAPI extends BaseTimestamped {
  productId: string;
  contexts: ContextAPI[];
}

export interface ProductAPI extends BaseTimestamped {
  domains: DomainAPI[];
}

// Frontend types (using Date objects for easier manipulation)
export interface SchemaVersion extends Omit<SchemaVersionAPI, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface Schema extends Omit<SchemaAPI, 'createdAt' | 'updatedAt' | 'versions'> {
  versions: SchemaVersion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Context extends Omit<ContextAPI, 'createdAt' | 'updatedAt' | 'schemas'> {
  schemas: Schema[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Domain extends Omit<DomainAPI, 'createdAt' | 'updatedAt' | 'contexts'> {
  contexts: Context[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Product extends Omit<ProductAPI, 'createdAt' | 'updatedAt' | 'domains'> {
  domains: Domain[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaRegistry {
  products: Product[];
}

// Backend-specific types (only available in Cloudflare Workers context)
export interface Env {
  SCHEMA_REGISTRY_INSTANCE: any; // DurableObjectNamespace not available in frontend
}

export interface RegistryInfo {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Utility functions for type conversion
export const convertToFrontendDate = (dateString: string): Date => new Date(dateString);
export const convertToAPIDate = (date: Date): string => date.toISOString();

// Type guards
export const isValidSchemaScope = (scope: string): scope is SchemaScope => {
  return Object.values(SCHEMA_SCOPES).includes(scope as SchemaScope);
};

export const isValidSchemaStatus = (status: string): status is SchemaStatus => {
  return Object.values(SCHEMA_STATUSES).includes(status as SchemaStatus);
};

export const isValidSchemaTypeCategory = (category: string): category is SchemaTypeCategory => {
  return Object.values(SCHEMA_TYPE_CATEGORIES).some(cat => cat.categoryName === category);
};