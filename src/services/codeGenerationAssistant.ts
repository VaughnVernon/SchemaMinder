/**
 * Helper functions for code generation integration
 */

import { Context, Product, Schema, SchemaVersion } from '../types/schema';
import { CodeGenerationContext, SchemaWithVersions } from './codegen/types';

/**
 * Build CodeGenerationContext from a Context and its parent hierarchy
 */
export function buildCodeGenerationContext(
  context: Context,
  products: Product[]
): CodeGenerationContext | null {
  // Find the context's parent hierarchy
  let productName = '';
  let domainName = '';
  const schemasWithVersions: SchemaWithVersions[] = [];

  for (const product of products) {
    for (const domain of product.domains || []) {
      const foundContext = domain.contexts?.find(c => c.id === context.id);
      if (foundContext) {
        productName = product.name;
        domainName = domain.name;

        // Collect all schemas and their versions from this context
        if (foundContext.schemas) {
          for (const schema of foundContext.schemas) {
            schemasWithVersions.push({
              schema,
              versions: schema.versions || []
            });
          }
        }
        break;
      }
    }
    if (productName) break;
  }

  if (!productName || !domainName) {
    console.error('Could not find parent hierarchy for context:', context.id);
    return null;
  }

  return {
    productName,
    domainName,
    contextName: context.name,
    contextNamespace: context.namespace,
    schemas: schemasWithVersions
  };
}

/**
 * Format context path for display (like pinned hierarchy)
 */
export function formatContextPath(
  context: Context,
  products: Product[]
): string {
  // Find the context's parent hierarchy
  for (const product of products) {
    for (const domain of product.domains || []) {
      const foundContext = domain.contexts?.find(c => c.id === context.id);
      if (foundContext) {
        return `${product.name} / ${domain.name} / ${context.name}`;
      }
    }
  }

  return context.name;
}

/**
 * Trigger download of generated code
 */
export function downloadGeneratedCode(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
