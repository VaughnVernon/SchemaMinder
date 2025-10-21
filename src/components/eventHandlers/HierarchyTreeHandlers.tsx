import React from 'react';
import { Product, Domain, Context, Schema, SchemaVersion, SchemaTypeCategory } from '../../types/schema';
import { MenuItem } from '../DropdownMenu';
import { ContextMenuItem } from '../ContextMenu';
import { HierarchyFinder } from '../hierarchy/tools/hierarchyFinder';
import { EntityType } from '../../hooks/useSubscriptionState';
import { Pencil, Plus, Pin, Bell, BellOff, Braces } from 'lucide-react';

export interface SubscriptionStateChecker {
  isSubscribed: (typeId: string, type: EntityType) => boolean;
}

// Types for handler functions
export interface HierarchyTreeHandlers {
  onItemSelect?: (type: 'product' | 'domain' | 'context' | 'schema', id: string, item?: any) => void;
  onEditProduct?: (product: Product) => void;
  onEditDomain?: (domain: Domain) => void;
  onEditContext?: (context: Context) => void;
  onEditSchema?: (schema: Schema) => void;
  onEditSchemaVersion?: (schema: Schema, version: SchemaVersion) => void;
  onCreateProduct?: () => void;
  onCreateDomain?: (productId: string) => void;
  onCreateContext?: (domainId: string) => void;
  onCreateSchema?: (contextId: string, category?: SchemaTypeCategory) => void;
  onCreateSchemaVersion?: (schemaId: string, baseVersion?: SchemaVersion) => void;
  onPinProduct?: (product: Product) => void;
  onPinDomain?: (domain: Domain) => void;
  onPinContext?: (context: Context) => void;
  onUnpin?: () => void;
  onSchemaSelect?: (schema: Schema, version: SchemaVersion) => void;
  onSubscribeProduct?: (product: Product) => void;
  onSubscribeDomain?: (domain: Domain) => void;
  onSubscribeContext?: (context: Context) => void;
  onUnsubscribeProduct?: (product: Product) => void;
  onUnsubscribeDomain?: (domain: Domain) => void;
  onUnsubscribeContext?: (context: Context) => void;
  onGenerateCode?: (context: Context) => void;
}

export interface HierarchyTreeState {
  expandedItems: Set<string>;
  contextMenu: { type: string; id: string; x: number; y: number } | null;
}

export interface HierarchyTreeStateHandlers {
  toggleExpanded: (id: string) => void;
  toggleAllDescendants: (id: string, type: string, isExpanded: boolean) => void;
  setContextMenu: (menu: { type: string; id: string; x: number; y: number } | null) => void;
}

// ============================================================================
// ICON CONSTANTS
// ============================================================================

const ICONS = {
  edit: <Pencil size={16} />,
  add: <Plus size={16} />,
  pin: <Pin size={16} />,
  subscribe: <Bell size={16} />,
  unsubscribe: <BellOff size={16} />,
  generate: <Braces size={16} />
};

// ============================================================================
// MENU ITEM CONFIGURATION
// ============================================================================

interface MenuItemConfig {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  getOnClick: (entity: any, handlers: HierarchyTreeHandlers) => () => void;
}

interface SubscriptionMenuConfig {
  entityType: EntityType;
  getOnSubscribe: (entity: any, handlers: HierarchyTreeHandlers) => () => void;
  getOnUnsubscribe: (entity: any, handlers: HierarchyTreeHandlers) => () => void;
}

// Handler lookup maps (extracted to reduce complexity in menu configs)
const EDIT_HANDLERS: Record<string, keyof HierarchyTreeHandlers> = {
  product: 'onEditProduct',
  domain: 'onEditDomain',
  context: 'onEditContext',
  schema: 'onEditSchema'
};

const PIN_HANDLERS: Record<string, keyof HierarchyTreeHandlers> = {
  product: 'onPinProduct',
  domain: 'onPinDomain',
  context: 'onPinContext'
};

// Helper to remove internal _type property
const cleanEntity = (entity: any) => {
  const { _type, ...clean } = entity;
  return clean;
};

// Helper functions for menu actions
const invokeEditHandler = (entity: any, handlers: HierarchyTreeHandlers) => {
  const handlerName = EDIT_HANDLERS[entity._type];
  const handler = handlerName ? handlers[handlerName] : undefined;

  // Special case: schemaVersion edit requires both schema and version
  if (entity._type === 'schemaVersion' && entity.version) {
    const clean = cleanEntity(entity);
    const { version, ...schema } = clean;
    handlers.onEditSchemaVersion?.(schema as Schema, version);
  } else {
    (handler as any)?.(cleanEntity(entity));
  }
};

const invokePinHandler = (entity: any, handlers: HierarchyTreeHandlers) => {
  const handlerName = PIN_HANDLERS[entity._type];
  const handler = handlerName ? handlers[handlerName] : undefined;
  (handler as any)?.(cleanEntity(entity));
};

// Generic menu configurations
const EDIT_MENU: MenuItemConfig = {
  icon: ICONS.edit,
  label: 'Edit',
  tooltip: 'Edit',
  getOnClick: (entity, handlers) => () => invokeEditHandler(entity, handlers)
};

const PIN_MENU: MenuItemConfig = {
  icon: ICONS.pin,
  label: 'Pin',
  tooltip: 'Pin',
  getOnClick: (entity, handlers) => () => invokePinHandler(entity, handlers)
};

// Helper functions for "New" menu actions
const invokeCreateDomain = (entity: any, handlers: HierarchyTreeHandlers) => {
  handlers.onCreateDomain?.(entity.id);
};

const invokeCreateContext = (entity: any, handlers: HierarchyTreeHandlers) => {
  handlers.onCreateContext?.(entity.id);
};

const invokeCreateSchema = (entity: any, handlers: HierarchyTreeHandlers) => {
  // Only pass category if it exists (for category menus)
  if (entity.category !== undefined) {
    handlers.onCreateSchema?.(entity.id, entity.category);
  } else {
    handlers.onCreateSchema?.(entity.id);
  }
};

const invokeCreateVersion = (entity: any, handlers: HierarchyTreeHandlers) => {
  // Both schema and schemaVersion contexts pass the whole schema object
  // This matches the original behavior even though the type says schemaId: string
  if (entity._type === 'schemaVersion' && entity.version) {
    const { version, _type, ...schema } = entity;
    (handlers.onCreateSchemaVersion as any)?.(schema);
  } else if (entity._type === 'schema') {
    (handlers.onCreateSchemaVersion as any)?.(cleanEntity(entity));
  } else {
    handlers.onCreateSchemaVersion?.(entity.id);
  }
};

const invokeGenerateCode = (entity: any, handlers: HierarchyTreeHandlers) => {
  handlers.onGenerateCode?.(entity);
};

// Entity-specific "New" menu items
const NEW_DOMAIN_MENU: MenuItemConfig = {
  icon: ICONS.add,
  label: 'New Domain',
  tooltip: 'New Domain',
  getOnClick: (entity, handlers) => () => invokeCreateDomain(entity, handlers)
};

const NEW_CONTEXT_MENU: MenuItemConfig = {
  icon: ICONS.add,
  label: 'New Context',
  tooltip: 'New Context',
  getOnClick: (entity, handlers) => () => invokeCreateContext(entity, handlers)
};

const NEW_SCHEMA_MENU: MenuItemConfig = {
  icon: ICONS.add,
  label: 'New Schema',
  tooltip: 'New Schema',
  getOnClick: (entity, handlers) => () => invokeCreateSchema(entity, handlers)
};

const NEW_VERSION_MENU: MenuItemConfig = {
  icon: ICONS.add,
  label: 'New Version',
  tooltip: 'New Version',
  getOnClick: (entity, handlers) => () => invokeCreateVersion(entity, handlers)
};

const GENERATE_CODE_MENU: MenuItemConfig = {
  icon: ICONS.generate,
  label: 'Generate',
  tooltip: 'Generate source code',
  getOnClick: (entity, handlers) => () => invokeGenerateCode(entity, handlers)
};

// Subscription configuration by entity type
const SUBSCRIPTION_ENTITY_TYPES: Record<string, EntityType> = {
  product: 'P',
  domain: 'D',
  context: 'C'
};

const SUBSCRIBE_HANDLERS: Record<string, keyof HierarchyTreeHandlers> = {
  product: 'onSubscribeProduct',
  domain: 'onSubscribeDomain',
  context: 'onSubscribeContext'
};

const UNSUBSCRIBE_HANDLERS: Record<string, keyof HierarchyTreeHandlers> = {
  product: 'onUnsubscribeProduct',
  domain: 'onUnsubscribeDomain',
  context: 'onUnsubscribeContext'
};

// Entity-specific menu configurations
const ENTITY_MENUS: Record<string, MenuItemConfig[]> = {
  product: [EDIT_MENU, NEW_DOMAIN_MENU, PIN_MENU],
  domain: [EDIT_MENU, NEW_CONTEXT_MENU, PIN_MENU],
  context: [EDIT_MENU, NEW_SCHEMA_MENU, GENERATE_CODE_MENU, PIN_MENU],
  schema: [EDIT_MENU, NEW_VERSION_MENU],
  schemaVersion: [EDIT_MENU, NEW_VERSION_MENU],
  category: [NEW_SCHEMA_MENU]
};

// ============================================================================
// GENERIC MENU BUILDERS
// ============================================================================

const createSubscriptionMenuItem = (
  entity: any,
  handlers: HierarchyTreeHandlers,
  subscriptionState?: SubscriptionStateChecker
): MenuItem | null => {
  const entityType = SUBSCRIPTION_ENTITY_TYPES[entity._type];
  if (!entityType) return null;

  const isSubscribed = subscriptionState?.isSubscribed(entity.id, entityType) || false;

  const handlerName = isSubscribed
    ? UNSUBSCRIBE_HANDLERS[entity._type]
    : SUBSCRIBE_HANDLERS[entity._type];

  const handler = handlerName ? handlers[handlerName] : undefined;
  if (!handler) return null;

  return {
    icon: isSubscribed ? ICONS.unsubscribe : ICONS.subscribe,
    label: isSubscribed ? 'Unsubscribe' : 'Subscribe',
    tooltip: `${isSubscribed ? 'Unsubscribe from' : 'Subscribe to'} changes`,
    onClick: () => (handler as any)?.(cleanEntity(entity))
  };
};

const createMenuItemFromConfig = (
  config: MenuItemConfig,
  entity: any,
  handlers: HierarchyTreeHandlers
): MenuItem => ({
  icon: config.icon,
  label: config.label,
  tooltip: config.tooltip,
  onClick: config.getOnClick(entity, handlers)
});

const buildMenuItems = (
  entity: any,
  handlers: HierarchyTreeHandlers,
  subscriptionState?: SubscriptionStateChecker
): MenuItem[] => {
  const configs = ENTITY_MENUS[entity._type] || [];
  const items: MenuItem[] = [];

  for (const config of configs) {
    items.push(createMenuItemFromConfig(config, entity, handlers));
  }

  const subscriptionItem = createSubscriptionMenuItem(entity, handlers, subscriptionState);
  if (subscriptionItem) {
    items.push(subscriptionItem);
  }

  return items;
};

// ============================================================================
// PUBLIC MENU ITEM BUILDERS (maintain API compatibility)
// ============================================================================

export const createProductMenuItems = (
  product: Product,
  handlers: HierarchyTreeHandlers,
  subscriptionState?: SubscriptionStateChecker
): MenuItem[] => buildMenuItems({ ...product, _type: 'product' }, handlers, subscriptionState);

export const createDomainMenuItems = (
  domain: Domain,
  handlers: HierarchyTreeHandlers,
  subscriptionState?: SubscriptionStateChecker
): MenuItem[] => buildMenuItems({ ...domain, _type: 'domain' }, handlers, subscriptionState);

export const createContextMenuItems = (
  context: Context,
  handlers: HierarchyTreeHandlers,
  subscriptionState?: SubscriptionStateChecker
): MenuItem[] => buildMenuItems({ ...context, _type: 'context' }, handlers, subscriptionState);

export const createSchemaMenuItems = (
  schema: Schema,
  handlers: HierarchyTreeHandlers
): MenuItem[] => buildMenuItems({ ...schema, _type: 'schema' }, handlers);

export const createSchemaVersionMenuItems = (
  schema: Schema,
  version: SchemaVersion,
  handlers: HierarchyTreeHandlers
): MenuItem[] => buildMenuItems({ ...schema, version, _type: 'schemaVersion' }, handlers);

export const createCategoryMenuItems = (
  contextId: string,
  category: SchemaTypeCategory,
  handlers: HierarchyTreeHandlers
): MenuItem[] => buildMenuItems({ id: contextId, category, _type: 'category' }, handlers);

// ============================================================================
// CLICK HANDLER CONFIGURATION
// ============================================================================

interface ClickConfig {
  selectType: 'product' | 'domain' | 'context' | 'schema';
  supportsShiftExpand: boolean;
}

const CLICK_CONFIGS: Record<string, ClickConfig> = {
  product: { selectType: 'product', supportsShiftExpand: true },
  domain: { selectType: 'domain', supportsShiftExpand: true },
  context: { selectType: 'context', supportsShiftExpand: true },
  schema: { selectType: 'schema', supportsShiftExpand: false }
};

const createGenericClickHandler = (
  entity: any,
  config: ClickConfig,
  handlers: HierarchyTreeHandlers,
  stateHandlers: HierarchyTreeStateHandlers,
  isExpanded?: boolean
) => {
  return (e: React.MouseEvent) => {
    handlers.onItemSelect?.(config.selectType, entity.id);

    if (e.defaultPrevented) return;

    const shouldExpandAll = config.supportsShiftExpand && e.shiftKey && isExpanded !== undefined;

    if (shouldExpandAll) {
      stateHandlers.toggleAllDescendants(entity.id, entity._type, isExpanded);
    } else {
      stateHandlers.toggleExpanded(entity.id);
    }
  };
};

// ============================================================================
// PUBLIC CLICK HANDLERS (maintain API compatibility)
// ============================================================================

export const createProductClickHandler = (
  product: Product,
  handlers: HierarchyTreeHandlers,
  stateHandlers: HierarchyTreeStateHandlers,
  isExpanded: boolean
) => createGenericClickHandler(
  { ...product, _type: 'product' },
  CLICK_CONFIGS.product,
  handlers,
  stateHandlers,
  isExpanded
);

export const createDomainClickHandler = (
  domain: Domain,
  handlers: HierarchyTreeHandlers,
  stateHandlers: HierarchyTreeStateHandlers,
  isExpanded: boolean
) => createGenericClickHandler(
  { ...domain, _type: 'domain' },
  CLICK_CONFIGS.domain,
  handlers,
  stateHandlers,
  isExpanded
);

export const createContextClickHandler = (
  context: Context,
  handlers: HierarchyTreeHandlers,
  stateHandlers: HierarchyTreeStateHandlers,
  isExpanded: boolean
) => createGenericClickHandler(
  { ...context, _type: 'context' },
  CLICK_CONFIGS.context,
  handlers,
  stateHandlers,
  isExpanded
);

export const createSchemaClickHandler = (
  schema: Schema,
  handlers: HierarchyTreeHandlers,
  stateHandlers: HierarchyTreeStateHandlers
) => createGenericClickHandler(
  { ...schema, _type: 'schema' },
  CLICK_CONFIGS.schema,
  handlers,
  stateHandlers
);

export const createSchemaVersionClickHandler = (
  schema: Schema,
  version: SchemaVersion,
  handlers: HierarchyTreeHandlers
) => {
  return (e: React.MouseEvent) => {
    e.stopPropagation();
    handlers.onSchemaSelect?.(schema, version);
  };
};

// ============================================================================
// CONTEXT MENU HANDLER
// ============================================================================

export const createContextMenuHandler = (
  setContextMenu: HierarchyTreeStateHandlers['setContextMenu']
) => {
  return (e: React.MouseEvent, type: string, id: string) => {
    e.preventDefault();
    setContextMenu({
      type,
      id,
      x: e.clientX,
      y: e.clientY
    });
  };
};

// ============================================================================
// RIGHT-CLICK CONTEXT MENU
// ============================================================================

const FINDER_MAP: Record<string, (products: Product[], id: string) => any> = {
  product: HierarchyFinder.findProductById,
  domain: HierarchyFinder.findDomainById,
  context: HierarchyFinder.findContextById,
  schema: HierarchyFinder.findSchemaById
};

// Helper functions for context menu actions
const invokeContextMenuEdit = (entity: any, handlers: HierarchyTreeHandlers, type: string) => {
  const handlerName = EDIT_HANDLERS[type];
  const handler = handlerName ? handlers[handlerName] : undefined;
  // entity from finder doesn't have _type, so we can pass it directly
  (handler as any)?.(entity);
};

export const createRightClickContextMenuItems = (
  contextMenu: { type: string; id: string } | null,
  products: Product[],
  handlers: HierarchyTreeHandlers
): ContextMenuItem[] => {
  if (!contextMenu) return [];

  const { type, id } = contextMenu;
  const finder = FINDER_MAP[type];

  if (!finder) return [];

  const entity = finder(products, id);
  if (!entity) return [];

  return [{ label: 'Edit', onClick: () => invokeContextMenuEdit(entity, handlers, type) }];
};
