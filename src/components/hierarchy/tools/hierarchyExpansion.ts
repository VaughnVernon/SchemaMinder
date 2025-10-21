import { Product, Domain, Context, Schema } from '../../../types/schema';

export class HierarchyExpansionManager {
  /**
   * Toggle expand/collapse all descendants from a given node
   */
  static toggleAllDescendants(
    startId: string,
    type: 'product' | 'domain' | 'context' | 'category',
    isCurrentlyExpanded: boolean,
    products: Product[],
    expandedItems: Set<string>
  ): Set<string> {
    const newExpanded = new Set(expandedItems);
    
    // Find the item and collect its descendant IDs
    switch (type) {
      case 'product':
        return this.toggleProductDescendants(startId, isCurrentlyExpanded, products, newExpanded);
      case 'domain':
        return this.toggleDomainDescendants(startId, isCurrentlyExpanded, products, newExpanded);
      case 'context':
        return this.toggleContextDescendants(startId, isCurrentlyExpanded, products, newExpanded);
      case 'category':
        return this.toggleCategoryDescendants(startId, isCurrentlyExpanded, products, newExpanded);
      default:
        return newExpanded;
    }
  }

  private static toggleProductDescendants(
    productId: string,
    isCurrentlyExpanded: boolean,
    products: Product[],
    newExpanded: Set<string>
  ): Set<string> {
    const product = products.find(p => p.id === productId);
    if (!product) return newExpanded;

    this.toggleItem(product.id, isCurrentlyExpanded, newExpanded);
    
    product.domains?.forEach(domain => {
      this.toggleItem(domain.id, isCurrentlyExpanded, newExpanded);
      this.processDomainDescendants(domain, isCurrentlyExpanded, newExpanded);
    });
    
    return newExpanded;
  }

  private static toggleDomainDescendants(
    domainId: string,
    isCurrentlyExpanded: boolean,
    products: Product[],
    newExpanded: Set<string>
  ): Set<string> {
    for (const product of products) {
      const domain = product.domains?.find(d => d.id === domainId);
      if (domain) {
        this.toggleItem(domain.id, isCurrentlyExpanded, newExpanded);
        this.processDomainDescendants(domain, isCurrentlyExpanded, newExpanded);
        break;
      }
    }
    return newExpanded;
  }

  private static toggleContextDescendants(
    contextId: string,
    isCurrentlyExpanded: boolean,
    products: Product[],
    newExpanded: Set<string>
  ): Set<string> {
    for (const product of products) {
      for (const domain of product.domains || []) {
        const context = domain.contexts?.find(c => c.id === contextId);
        if (context) {
          this.toggleItem(context.id, isCurrentlyExpanded, newExpanded);
          this.processContextDescendants(context, isCurrentlyExpanded, newExpanded);
          return newExpanded;
        }
      }
    }
    return newExpanded;
  }

  private static toggleCategoryDescendants(
    categoryId: string,
    isCurrentlyExpanded: boolean,
    products: Product[],
    newExpanded: Set<string>
  ): Set<string> {
    // Category ID format is: {contextId}-{categoryName}
    const lastDashIndex = categoryId.lastIndexOf('-');
    const contextId = categoryId.substring(0, lastDashIndex);
    const categoryName = categoryId.substring(lastDashIndex + 1);
    
    for (const product of products) {
      for (const domain of product.domains || []) {
        const context = domain.contexts?.find(c => c.id === contextId);
        if (context) {
          const schemas = context.schemas?.filter(s => s.schemaTypeCategory === categoryName) || [];
          this.toggleItem(categoryId, isCurrentlyExpanded, newExpanded);
          schemas.forEach(schema => {
            this.toggleItem(schema.id, isCurrentlyExpanded, newExpanded);
          });
          return newExpanded;
        }
      }
    }
    return newExpanded;
  }

  private static processDomainDescendants(
    domain: Domain,
    isCurrentlyExpanded: boolean,
    newExpanded: Set<string>
  ): void {
    domain.contexts?.forEach(context => {
      this.toggleItem(context.id, isCurrentlyExpanded, newExpanded);
      this.processContextDescendants(context, isCurrentlyExpanded, newExpanded);
    });
  }

  private static processContextDescendants(
    context: Context,
    isCurrentlyExpanded: boolean,
    newExpanded: Set<string>
  ): void {
    // Handle category IDs
    const categories = new Set(context.schemas?.map(s => s.schemaTypeCategory) || []);
    categories.forEach(cat => {
      const catId = `${context.id}-${cat}`;
      this.toggleItem(catId, isCurrentlyExpanded, newExpanded);
    });
    
    // Handle schema IDs
    context.schemas?.forEach(schema => {
      this.toggleItem(schema.id, isCurrentlyExpanded, newExpanded);
    });
  }

  private static toggleItem(id: string, isCurrentlyExpanded: boolean, newExpanded: Set<string>): void {
    if (isCurrentlyExpanded) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
  }
}