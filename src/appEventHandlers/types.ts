import { Dispatch, SetStateAction } from 'react';
import {
  Product,
  Domain,
  Context,
  Schema,
  SchemaVersion,
  SchemaStatus,
  SchemaTypeCategory
} from '../types/schema';
import { FindResult } from '../components/FindModal';
import { StatusFilter } from '../components/FilterModal';
import { RealTimeMessage } from '../hooks/useRealTimeUpdates';
import { EntityType } from '../hooks/useSubscriptionState';

// View mode types
export type ViewMode =
  | 'tree'
  | 'create-product'
  | 'create-domain'
  | 'create-context'
  | 'create-schema'
  | 'create-version'
  | 'edit-product'
  | 'edit-domain'
  | 'edit-context'
  | 'edit-schema'
  | 'edit-version';

export type SelectedItem = {
  type: 'product' | 'domain' | 'context' | 'schema' | 'version';
  id: string;
} | null;

export type PinnedItem =
  | { type: 'product'; item: Product }
  | { type: 'domain'; item: Domain }
  | { type: 'context'; item: Context }
  | null;

// Registry data structure
export interface RegistryData {
  products: Product[];
}

// Tenant information
export interface TenantInfo {
  tenantId: string;
  registryId: string;
  baseUrl: string;
}

// Dependencies for all event handlers
export interface AppEventHandlerDependencies {
  // Registry operations from useSchemaRegistry hook
  registry: RegistryData;
  sortedRegistry: RegistryData;
  tenantInfo: TenantInfo;
  addProduct: (name: string, description?: string) => Promise<string>;
  addDomain: (productId: string, name: string, description?: string) => Promise<string>;
  addContext: (domainId: string, name: string, namespace?: string, description?: string) => Promise<string>;
  addSchema: (contextId: string, schema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  addSchemaVersion: (schemaId: string, version: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt' | 'schemaId'>) => Promise<string>;
  updateProduct: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  updateDomain: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  updateContext: (id: string, updates: { name?: string; namespace?: string; description?: string }) => Promise<void>;
  updateSchema: (id: string, updates: any) => Promise<void>;
  updateSchemaVersion: (schemaId: string, versionId: string, updates: { description?: string; status?: SchemaStatus }) => Promise<void>;
  reload: () => void;

  // Real-time messaging
  sendMessage: (message: RealTimeMessage) => void;
  isConnected: boolean;

  // View state
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;

  // Selected/Current items state
  selectedSchema: Schema | null;
  setSelectedSchema: Dispatch<SetStateAction<Schema | null>>;
  selectedVersion: SchemaVersion | null;
  setSelectedVersion: Dispatch<SetStateAction<SchemaVersion | null>>;
  currentContextId: string;
  setCurrentContextId: Dispatch<SetStateAction<string>>;
  currentProductId: string;
  setCurrentProductId: Dispatch<SetStateAction<string>>;
  currentDomainId: string;
  setCurrentDomainId: Dispatch<SetStateAction<string>>;
  currentProductName: string;
  setCurrentProductName: Dispatch<SetStateAction<string>>;
  currentDomainName: string;
  setCurrentDomainName: Dispatch<SetStateAction<string>>;
  preselectedCategory: SchemaTypeCategory | undefined;
  setPreselectedCategory: Dispatch<SetStateAction<SchemaTypeCategory | undefined>>;

  // Editing state
  editingProduct: Product | null;
  setEditingProduct: Dispatch<SetStateAction<Product | null>>;
  editingDomain: Domain | null;
  setEditingDomain: Dispatch<SetStateAction<Domain | null>>;
  editingContext: Context | null;
  setEditingContext: Dispatch<SetStateAction<Context | null>>;
  editingSchema: Schema | null;
  setEditingSchema: Dispatch<SetStateAction<Schema | null>>;
  editingVersion: SchemaVersion | null;
  setEditingVersion: Dispatch<SetStateAction<SchemaVersion | null>>;

  // Find modal state
  isFindOpen: boolean;
  setIsFindOpen: Dispatch<SetStateAction<boolean>>;
  findQuery: string;
  setFindQuery: Dispatch<SetStateAction<string>>;
  findResults: FindResult[];
  setFindResults: Dispatch<SetStateAction<FindResult[]>>;

  // Filter state
  isFilterOpen: boolean;
  setIsFilterOpen: Dispatch<SetStateAction<boolean>>;
  filterMousePosition: { x: number; y: number } | undefined;
  setFilterMousePosition: Dispatch<SetStateAction<{ x: number; y: number } | undefined>>;
  statusFilter: StatusFilter;
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;

  // Modal functions
  showFindModal: () => void;
  showFilterModal: (mousePosition: { x: number; y: number }) => void;
  showMessageModal: (title: string, message: string, type?: 'info' | 'warning' | 'error') => void;

  // Toast notification functions
  showToastSuccess: (title: string, message: string, duration?: number) => void;
  showToastError: (title: string, message: string, duration?: number) => void;

  // Subscription state
  subscriptionState: {
    isSubscribed: (typeId: string, type: EntityType) => boolean;
    subscribe: (typeId: string, type: EntityType) => Promise<void>;
    unsubscribe: (typeId: string, type: EntityType) => Promise<void>;
  };

  // Change notifications
  refreshChangeNotifications: () => void;

  // Hierarchy tree state and actions
  hierarchyState: {
    expandedItems: Set<string>;
    selectedItem: SelectedItem | undefined;
    pinnedItem: PinnedItem;
  };
  hierarchyActions: {
    setExpandedItems: Dispatch<SetStateAction<Set<string>>>;
    setSelectedItem: (item: SelectedItem) => void;
    setPinnedItem: (item: PinnedItem) => void;
  };
  hierarchyStateHandlers: any; // We'll refine this type later if needed
  hierarchyCallbacks: any; // We'll refine this type later if needed
}

// Handler function signatures for form submissions
export interface FormSubmissionHandlers {
  handleProductSubmit: (data: { name: string; description?: string }) => Promise<void>;
  handleDomainSubmit: (data: { name: string; description?: string }) => Promise<void>;
  handleContextSubmit: (data: { name: string; namespace?: string; description?: string }) => Promise<void>;
  handleSchemaSubmit: (schema: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleVersionSubmit: (version: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// Handler function signatures for form edits
export interface FormEditHandlers {
  handleProductEditSubmit: (updates: { name: string; description?: string }) => Promise<void>;
  handleDomainEditSubmit: (updates: { name: string; description?: string }) => Promise<void>;
  handleContextEditSubmit: (updates: { name: string; namespace?: string; description?: string }) => Promise<void>;
  handleSchemaEditSubmit: (schemaData: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  handleSchemaVersionEditSubmit: (updates: { description?: string; status: SchemaStatus }) => Promise<void>;
}

// Handler function signatures for navigation
export interface NavigationHandlers {
  handleSchemaSelect: (schema: Schema, version: SchemaVersion) => void;
  handleCreateDomain: (productId: string) => void;
  handleCreateContext: (domainId: string) => void;
  handleCreateSchema: (contextId: string, category?: SchemaTypeCategory) => void;
  handleCreateSchemaVersion: (schema: Schema) => void;
  handleEditProduct: (product: Product) => void;
  handleEditDomain: (domain: Domain) => void;
  handleEditContext: (context: Context) => void;
  handleEditSchema: (schema: Schema) => void;
}

// Handler function signatures for modals
export interface ModalHandlers {
  handleFindQuery: (query: string) => Promise<FindResult[]>;
  handleFindSelect: (result: FindResult) => void;
  handleFilterApply: (filter: StatusFilter) => void;
}

// Utility functions
export interface UtilityFunctions {
  findSelectedProduct: () => Product | null;
  findSelectedDomain: () => Domain | null;
  findSelectedContext: () => Context | null;
  findSelectedSchema: () => Schema | null;
}

// Complete set of all app event handlers
export interface AppEventHandlers extends
  FormSubmissionHandlers,
  FormEditHandlers,
  NavigationHandlers,
  ModalHandlers,
  UtilityFunctions {
  // Additional handler groups can be added here
}

// Type for handler factory functions
export type HandlerFactory<T> = (deps: AppEventHandlerDependencies) => T;

// Export convenience types for individual handler creation
export type CreateFormSubmissionHandlers = HandlerFactory<FormSubmissionHandlers>;
export type CreateFormEditHandlers = HandlerFactory<FormEditHandlers>;
export type CreateNavigationHandlers = HandlerFactory<NavigationHandlers>;
export type CreateModalHandlers = HandlerFactory<ModalHandlers>;
export type CreateUtilityFunctions = HandlerFactory<UtilityFunctions>;