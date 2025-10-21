import { useMemo } from 'react';
import {
  AppEventHandlerDependencies,
  FormSubmissionHandlers,
  FormEditHandlers,
  NavigationHandlers,
  ModalHandlers,
  UtilityFunctions,
  createFormSubmissionHandlers,
  createFormEditHandlers,
  createNavigationHandlers,
  createModalHandlers,
  createUtilityFunctions,
  createSubscriptionHandlers
} from '../appEventHandlers';
import { SubscriptionHandlers } from '../appEventHandlers/subscriptionHandlers';

/**
 * Combined interface for all app event handlers
 * This provides a single interface that App.tsx can consume
 */
export interface AppEventHandlers extends
  FormSubmissionHandlers,
  FormEditHandlers,
  NavigationHandlers,
  ModalHandlers,
  UtilityFunctions,
  SubscriptionHandlers {}

/**
 * Custom hook that creates and combines all app event handlers
 * 
 * This hook serves as the main integration point between App.tsx and the
 * extracted event handler modules. It takes all the necessary dependencies
 * and returns a unified interface containing all handler functions.
 * 
 * The hook uses useMemo to ensure handlers are only recreated when
 * dependencies change, preventing unnecessary re-renders.
 * 
 * @param deps - All dependencies needed by the various handler groups
 * @returns Combined object containing all event handlers and utility functions
 */
export const useAppEventHandlers = (deps: AppEventHandlerDependencies): AppEventHandlers => {
  return useMemo(() => {
    // Create all handler groups
    const formSubmissionHandlers = createFormSubmissionHandlers(deps);
    const formEditHandlers = createFormEditHandlers(deps);
    const navigationHandlers = createNavigationHandlers(deps);
    const modalHandlers = createModalHandlers(deps);
    const utilityFunctions = createUtilityFunctions(deps);
    const subscriptionHandlers = createSubscriptionHandlers(deps);

    // Combine all handlers into a single interface
    return {
      // Form submission handlers
      ...formSubmissionHandlers,
      
      // Form edit handlers  
      ...formEditHandlers,
      
      // Navigation handlers
      ...navigationHandlers,
      
      // Modal handlers
      ...modalHandlers,

      // Utility functions
      ...utilityFunctions,

      // Subscription handlers
      ...subscriptionHandlers
    };
  }, [
    // Dependencies that should trigger handler recreation
    deps.registry,
    deps.hierarchyState,
    deps.editingProduct,
    deps.editingDomain,
    deps.editingContext,
    deps.editingSchema,
    deps.editingVersion,
    deps.currentProductId,
    deps.currentDomainId,
    deps.currentContextId,
    deps.statusFilter,
    
    // Registry operations
    deps.addProduct,
    deps.addDomain,
    deps.addContext,
    deps.addSchema,
    deps.addSchemaVersion,
    deps.updateProduct,
    deps.updateDomain,
    deps.updateContext,
    deps.updateSchema,
    deps.updateSchemaVersion,
    
    // State setters
    deps.setViewMode,
    deps.setCurrentProductId,
    deps.setCurrentDomainId,
    deps.setCurrentContextId,
    deps.setCurrentProductName,
    deps.setCurrentDomainName,
    deps.setEditingProduct,
    deps.setEditingDomain,
    deps.setEditingContext,
    deps.setEditingSchema,
    deps.setEditingVersion,
    deps.setSelectedSchema,
    deps.setStatusFilter,
    
    // Hierarchy actions
    deps.hierarchyActions,
    
    // Real-time messaging
    deps.sendMessage,

    // Subscription state
    deps.subscriptionState,

  ]);
};