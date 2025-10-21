import { Product, Domain, Context, Schema, SchemaVersion, SchemaRegistry, SCHEMA_TYPE_CATEGORIES } from '../types/schema';

export interface EntityInfo {
  type: string;
  name: string;
  category?: string;
}

export class EntityLookupService {
  private registry: SchemaRegistry;

  constructor(registry: SchemaRegistry) {
    this.registry = registry;
  }

  findProductById(id: string): Product | null {
    return this.registry.products.find(p => p.id === id) || null;
  }

  findDomainById(id: string): Domain | null {
    for (const product of this.registry.products) {
      const domain = product.domains.find(d => d.id === id);
      if (domain) return domain;
    }
    return null;
  }

  findContextById(id: string): Context | null {
    for (const product of this.registry.products) {
      for (const domain of product.domains) {
        const context = domain.contexts.find(c => c.id === id);
        if (context) return context;
      }
    }
    return null;
  }

  findSchemaById(id: string): Schema | null {
    for (const product of this.registry.products) {
      for (const domain of product.domains) {
        for (const context of domain.contexts) {
          const schema = context.schemas.find(s => s.id === id);
          if (schema) return schema;
        }
      }
    }
    return null;
  }

  findSchemaVersionById(id: string): { version: SchemaVersion; schema: Schema } | null {
    for (const product of this.registry.products) {
      for (const domain of product.domains) {
        for (const context of domain.contexts) {
          for (const schema of context.schemas) {
            const version = schema.versions.find(v => v.id === id);
            if (version) return { version, schema };
          }
        }
      }
    }
    return null;
  }

  getEntityInfo(entityType: string, entityId: string): EntityInfo | null {
    switch (entityType) {
      case 'product': {
        const product = this.findProductById(entityId);
        return product ? { type: 'Product', name: product.name } : null;
      }

      case 'domain': {
        const domain = this.findDomainById(entityId);
        return domain ? { type: 'Domain', name: domain.name } : null;
      }

      case 'context': {
        const context = this.findContextById(entityId);
        return context ? { type: 'Context', name: context.name } : null;
      }

      case 'schema': {
        const schema = this.findSchemaById(entityId);
        if (schema) {
          const categoryInfo = Object.values(SCHEMA_TYPE_CATEGORIES).find(
            cat => cat.categoryName === schema.schemaTypeCategory
          );
          return {
            type: categoryInfo?.friendlyName || schema.schemaTypeCategory,
            name: schema.name,
            category: schema.schemaTypeCategory
          };
        }
        return null;
      }

      case 'schema_version': {
        const result = this.findSchemaVersionById(entityId);
        if (result) {
          const { version, schema } = result;
          const categoryInfo = Object.values(SCHEMA_TYPE_CATEGORIES).find(
            cat => cat.categoryName === schema.schemaTypeCategory
          );
          return {
            type: categoryInfo?.friendlyName || schema.schemaTypeCategory,
            name: schema.name,
            category: schema.schemaTypeCategory
          };
        }
        return null;
      }

      default:
        return null;
    }
  }

  getEntityHierarchyPath(entityType: string, entityId: string): string[] {
    const breadcrumbs: string[] = [];

    switch (entityType) {
      case 'product': {
        const product = this.findProductById(entityId);
        if (product) {
          breadcrumbs.push(product.name);
        }
        break;
      }

      case 'domain': {
        const domain = this.findDomainById(entityId);
        if (domain) {
          // Find parent product
          const product = this.findProductById(domain.productId);
          if (product) {
            breadcrumbs.push(product.name);
          }
          breadcrumbs.push(domain.name);
        }
        break;
      }

      case 'context': {
        const context = this.findContextById(entityId);
        if (context) {
          // Find parent domain and product
          const domain = this.findDomainById(context.domainId);
          if (domain) {
            const product = this.findProductById(domain.productId);
            if (product) {
              breadcrumbs.push(product.name);
            }
            breadcrumbs.push(domain.name);
          }
          breadcrumbs.push(context.name);
        }
        break;
      }

      case 'schema': {
        const schema = this.findSchemaById(entityId);
        if (schema) {
          // Find parent context, domain, and product
          const context = this.findContextById(schema.contextId);
          if (context) {
            const domain = this.findDomainById(context.domainId);
            if (domain) {
              const product = this.findProductById(domain.productId);
              if (product) {
                breadcrumbs.push(product.name);
              }
              breadcrumbs.push(domain.name);
            }
            breadcrumbs.push(context.name);
          }
          breadcrumbs.push(schema.name);
        }
        break;
      }

      case 'schema_version': {
        const result = this.findSchemaVersionById(entityId);
        if (result) {
          const { version, schema } = result;
          // Find parent schema, context, domain, and product
          const context = this.findContextById(schema.contextId);
          if (context) {
            const domain = this.findDomainById(context.domainId);
            if (domain) {
              const product = this.findProductById(domain.productId);
              if (product) {
                breadcrumbs.push(product.name);
              }
              breadcrumbs.push(domain.name);
            }
            breadcrumbs.push(context.name);
          }
          breadcrumbs.push(schema.name);
          breadcrumbs.push(version.semanticVersion);
        }
        break;
      }
    }

    return breadcrumbs;
  }
}