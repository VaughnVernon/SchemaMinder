import { Product } from '../types/schema';

/**
 * Sorts registry data alphabetically at all levels:
 * - Products by name
 * - Domains by name within each product
 * - Contexts by name within each domain  
 * - Schemas by name within each context
 * 
 * Uses case-insensitive sorting and creates copies to avoid mutating original data.
 */
export const sortRegistryData = (products: Product[]): Product[] => {
  return products
    .map(product => ({
      ...product,
      domains: product.domains
        .map(domain => ({
          ...domain,
          contexts: domain.contexts
            .map(context => ({
              ...context,
              schemas: context.schemas
                .slice() // Create a copy to avoid mutating original array
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
            }))
            .slice() // Create a copy to avoid mutating original array
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        }))
        .slice() // Create a copy to avoid mutating original array
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }))
    .slice() // Create a copy to avoid mutating original array
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};