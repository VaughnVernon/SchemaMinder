/// <reference types="@cloudflare/workers-types" />

// Re-export all types from the shared schema types
export * from '../src/types/schema';

// Use the API types (with string dates) for the backend
export type {
  ProductAPI as Product,
  DomainAPI as Domain, 
  ContextAPI as Context,
  SchemaAPI as Schema,
  SchemaVersionAPI as SchemaVersion
} from '../src/types/schema';

// Cloudflare Workers environment with bindings
export interface Env {
  SCHEMA_REGISTRY_INSTANCE: DurableObjectNamespace;
  ASSETS: Fetcher;
}