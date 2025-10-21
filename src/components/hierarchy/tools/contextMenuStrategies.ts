import { Product, Schema, SchemaVersion, SchemaTypeCategory } from '../../../types/schema';
import { HierarchyTreeHandlers, SubscriptionStateChecker } from '../../eventHandlers/HierarchyTreeHandlers';
import { ContextMenuItem } from '../../ContextMenu';
import { HierarchyFinder } from './hierarchyFinder';

export interface ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers,
    subscriptionState?: SubscriptionStateChecker
  ): ContextMenuItem[];
}

export class ProductContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers,
    subscriptionState?: SubscriptionStateChecker
  ): ContextMenuItem[] {
    const product = HierarchyFinder.findProductById(products, id);
    if (!product) return [];

    const isSubscribed = subscriptionState?.isSubscribed(product.id, 'P') || false;

    return [
      { label: 'Edit', icon: 'Pencil', onClick: () => handlers.onEditProduct?.(product) },
      { label: 'New Domain', icon: 'Plus', onClick: () => handlers.onCreateDomain?.(product.id) },
      { label: 'Pin', icon: 'Pin', onClick: () => handlers.onPinProduct?.(product) },
      {
        label: isSubscribed ? 'Unsubscribe' : 'Subscribe',
        icon: isSubscribed ? 'BellOff' : 'Bell',
        onClick: () => isSubscribed
          ? handlers.onUnsubscribeProduct?.(product)
          : handlers.onSubscribeProduct?.(product)
      }
    ];
  }
}

export class DomainContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers,
    subscriptionState?: SubscriptionStateChecker
  ): ContextMenuItem[] {
    const domain = HierarchyFinder.findDomainById(products, id);
    if (!domain) return [];

    const isSubscribed = subscriptionState?.isSubscribed(domain.id, 'D') || false;

    return [
      { label: 'Edit', icon: 'Pencil', onClick: () => handlers.onEditDomain?.(domain) },
      { label: 'New Context', icon: 'Plus', onClick: () => handlers.onCreateContext?.(domain.id) },
      { label: 'Pin', icon: 'Pin', onClick: () => handlers.onPinDomain?.(domain) },
      {
        label: isSubscribed ? 'Unsubscribe' : 'Subscribe',
        icon: isSubscribed ? 'BellOff' : 'Bell',
        onClick: () => isSubscribed
          ? handlers.onUnsubscribeDomain?.(domain)
          : handlers.onSubscribeDomain?.(domain)
      }
    ];
  }
}

export class ContextContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers,
    subscriptionState?: SubscriptionStateChecker
  ): ContextMenuItem[] {
    const context = HierarchyFinder.findContextById(products, id);
    if (!context) return [];

    const isSubscribed = subscriptionState?.isSubscribed(context.id, 'C') || false;

    return [
      { label: 'Edit', icon: 'Pencil', onClick: () => handlers.onEditContext?.(context) },
      { label: 'New Schema', icon: 'Plus', onClick: () => handlers.onCreateSchema?.(context.id) },
      { label: 'Generate', icon: 'Braces', onClick: () => handlers.onGenerateCode?.(context) },
      { label: 'Pin', icon: 'Pin', onClick: () => handlers.onPinContext?.(context) },
      {
        label: isSubscribed ? 'Unsubscribe' : 'Subscribe',
        icon: isSubscribed ? 'BellOff' : 'Bell',
        onClick: () => isSubscribed
          ? handlers.onUnsubscribeContext?.(context)
          : handlers.onSubscribeContext?.(context)
      }
    ];
  }
}

export class SchemaContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers
  ): ContextMenuItem[] {
    const schema = HierarchyFinder.findSchemaById(products, id);
    if (!schema) return [];

    return [
      { label: 'Edit', icon: 'Pencil', onClick: () => handlers.onEditSchema?.(schema) },
      { label: 'New Version', icon: 'Plus', onClick: () => handlers.onCreateSchemaVersion?.(schema) }
    ];
  }
}

export class SchemaVersionContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers
  ): ContextMenuItem[] {
    // Parse the id to extract schema and version
    const parts = id.split(':');
    if (parts.length !== 2) return [];

    const schemaId = parts[0];
    const versionId = parts[1];

    const schema = HierarchyFinder.findSchemaById(products, schemaId);
    if (!schema) return [];

    const version = schema.versions?.find(v => v.id === versionId);
    if (!version) return [];

    return [
      { label: 'Edit', icon: 'Pencil', onClick: () => handlers.onEditSchemaVersion?.(schema, version) },
      { label: 'New Version', icon: 'Plus', onClick: () => handlers.onCreateSchemaVersion?.(schema, version) }
    ];
  }
}

export class SchemaCategoryContextMenuStrategy implements ContextMenuStrategy {
  createMenuItems(
    id: string,
    products: Product[],
    handlers: HierarchyTreeHandlers
  ): ContextMenuItem[] {
    // Parse the id to extract contextId and category
    // Format: contextId-category
    const lastDashIndex = id.lastIndexOf('-');
    if (lastDashIndex === -1) return [];

    const contextId = id.substring(0, lastDashIndex);
    const category = id.substring(lastDashIndex + 1) as SchemaTypeCategory;

    return [
      { label: 'New Schema', icon: 'Plus', onClick: () => handlers.onCreateSchema?.(contextId, category) }
    ];
  }
}

export class ContextMenuStrategyManager {
  private static strategies: Record<string, ContextMenuStrategy> = {
    'product': new ProductContextMenuStrategy(),
    'domain': new DomainContextMenuStrategy(),
    'context': new ContextContextMenuStrategy(),
    'category': new SchemaCategoryContextMenuStrategy(),
    'schema': new SchemaContextMenuStrategy(),
    'version': new SchemaVersionContextMenuStrategy()
  };

  static createContextMenuItems(
    contextMenu: { type: string; id: string } | null,
    products: Product[],
    handlers: HierarchyTreeHandlers,
    subscriptionState?: SubscriptionStateChecker
  ): ContextMenuItem[] {
    if (!contextMenu) return [];

    const strategy = this.strategies[contextMenu.type];
    return strategy ? strategy.createMenuItems(contextMenu.id, products, handlers, subscriptionState) : [];
  }
}
