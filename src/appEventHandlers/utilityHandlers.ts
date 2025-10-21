import {
  AppEventHandlerDependencies,
  UtilityFunctions,
  CreateUtilityFunctions
} from './types';

/**
 * Creates utility helper functions
 * These functions help find selected items based on hierarchy state
 */
export const createUtilityFunctions: CreateUtilityFunctions = (deps) => {
  const {
    registry,
    hierarchyState
  } = deps;

  const findSelectedProduct: UtilityFunctions['findSelectedProduct'] = () => {
    if (hierarchyState.selectedItem?.type === 'product') {
      return registry.products.find(p => p.id === hierarchyState.selectedItem!.id) || null;
    }
    return null;
  };

  const findSelectedDomain: UtilityFunctions['findSelectedDomain'] = () => {
    if (hierarchyState.selectedItem?.type === 'domain') {
      return registry.products
        .flatMap(p => p.domains)
        .find(d => d.id === hierarchyState.selectedItem!.id) || null;
    }
    return null;
  };

  const findSelectedContext: UtilityFunctions['findSelectedContext'] = () => {
    if (hierarchyState.selectedItem?.type === 'context') {
      return registry.products
        .flatMap(p => p.domains)
        .flatMap(d => d.contexts)
        .find(c => c.id === hierarchyState.selectedItem!.id) || null;
    }
    return null;
  };

  const findSelectedSchema: UtilityFunctions['findSelectedSchema'] = () => {
    if (hierarchyState.selectedItem?.type === 'schema') {
      return registry.products
        .flatMap(p => p.domains)
        .flatMap(d => d.contexts)
        .flatMap(c => c.schemas)
        .find(s => s.id === hierarchyState.selectedItem!.id) || null;
    }
    return null;
  };

  return {
    findSelectedProduct,
    findSelectedDomain,
    findSelectedContext,
    findSelectedSchema
  };
};