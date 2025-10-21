import { Product, Domain, Context, Schema } from '../../../types/schema';

export class HierarchyFinder {
  static findProductById(products: Product[], id: string): Product | null {
    return products.find(p => p.id === id) || null;
  }

  static findDomainById(products: Product[], id: string): Domain | null {
    for (const product of products) {
      const domain = product.domains.find(d => d.id === id);
      if (domain) return domain;
    }
    return null;
  }

  static findContextById(products: Product[], id: string): Context | null {
    for (const product of products) {
      for (const domain of product.domains) {
        const context = domain.contexts.find(c => c.id === id);
        if (context) return context;
      }
    }
    return null;
  }

  static findSchemaById(products: Product[], id: string): Schema | null {
    for (const product of products) {
      for (const domain of product.domains) {
        for (const context of domain.contexts) {
          const schema = context.schemas.find(s => s.id === id);
          if (schema) return schema;
        }
      }
    }
    return null;
  }

  static findEntityById(products: Product[], type: string, id: string): any {
    switch (type) {
      case 'product':
        return this.findProductById(products, id);
      case 'domain':
        return this.findDomainById(products, id);
      case 'context':
        return this.findContextById(products, id);
      case 'schema':
        return this.findSchemaById(products, id);
      default:
        return null;
    }
  }

  static findProductByDomainId(products: Product[], domainId: string): Product | null {
    for (const product of products) {
      const domain = product.domains.find(d => d.id === domainId);
      if (domain) return product;
    }
    return null;
  }

  // Alias methods for backward compatibility
  static findDomain = this.findDomainById;
  static findSchema = this.findSchemaById;
}