/**
 * Service for transforming and formatting change notification data
 */

import { SchemaRegistry } from '../types/schema';
import { EntityLookupService } from './entityLookup';
import {
  ENTITY_TYPE_DISPLAY_NAMES,
  CHANGE_TYPE_DISPLAY_NAMES,
  RELEVANT_FIELDS_BY_ENTITY_TYPE,
  SPECIFICATION_PREVIEW_LENGTH
} from '../components/header/changeNotificationConstants';

export class ChangeNotificationService {
  private lookupService: EntityLookupService;

  constructor(registry: SchemaRegistry) {
    this.lookupService = new EntityLookupService(registry);
  }

  /**
   * Format change type for display
   */
  formatChangeType(entityType: string, changeType: string): string {
    const entityName = ENTITY_TYPE_DISPLAY_NAMES[entityType] || entityType;
    const changeTypeName = CHANGE_TYPE_DISPLAY_NAMES[changeType] || changeType;
    return `${entityName} ${changeTypeName}`;
  }

  /**
   * Get entity type and name information
   */
  getEntityInfo(change: any): { type: string; name: string } {
    // Try to get entity info from registry first
    const entityInfo = this.lookupService.getEntityInfo(change.entityType, change.entityId);

    if (entityInfo) {
      return {
        type: entityInfo.type,
        name: entityInfo.name
      };
    }

    // Fallback to change data if entity not found in registry
    const changeData = change.changeData || {};
    const entityName = change.entityName || changeData.name || changeData.after?.name || changeData.before?.name;
    const entityTypeFriendly = ENTITY_TYPE_DISPLAY_NAMES[change.entityType] || change.entityType;

    return {
      type: entityTypeFriendly,
      name: entityName || change.entityId
    };
  }

  /**
   * Get entity hierarchy path as breadcrumb string
   */
  getEntityPath(change: any): string {
    // Try to get complete hierarchy path from registry first
    const hierarchyPath = this.lookupService.getEntityHierarchyPath(change.entityType, change.entityId);

    if (hierarchyPath.length > 0) {
      return hierarchyPath.join(' > ');
    }

    // Fallback to extracting from change data
    return this.extractPathFromChangeData(change);
  }

  /**
   * Extract hierarchy path from change data (fallback)
   */
  private extractPathFromChangeData(change: any): string {
    const changeData = change.changeData || {};
    const entityName = change.entityName || changeData.name || changeData.after?.name || changeData.before?.name;
    const breadcrumbParts = [];

    // Use data from the 'before' state which typically has more complete hierarchy info
    const beforeData = changeData.before || {};

    const productName = beforeData.product_name || changeData.product_name || changeData.after?.product_name;
    const domainName = beforeData.domain_name || changeData.domain_name || changeData.after?.domain_name;
    const contextName = beforeData.context_name || changeData.context_name || changeData.after?.context_name;
    const schemaName = beforeData.schema_name || changeData.schema_name || changeData.after?.schema_name;
    const versionNumber = beforeData.semanticVersion || changeData.semanticVersion || changeData.after?.semanticVersion;

    if (productName) breadcrumbParts.push(productName);
    if (domainName) breadcrumbParts.push(domainName);
    if (contextName) breadcrumbParts.push(contextName);
    if (schemaName) breadcrumbParts.push(schemaName);

    if (change.entityType === 'schema_version' && versionNumber) {
      breadcrumbParts.push(versionNumber);
    } else if (change.entityType !== 'schema_version') {
      breadcrumbParts.push(entityName || change.entityId);
    }

    return breadcrumbParts.length > 0 ? breadcrumbParts.join(' > ') : `${change.entityType}: ${entityName || change.entityId}`;
  }

  /**
   * Get field value, handling both camelCase and snake_case
   */
  getFieldValue(data: any, field: string): any {
    if (field === 'semanticVersion') {
      return data.semanticVersion || data.semantic_version;
    }
    return data[field];
  }

  /**
   * Format field value for display
   */
  formatValue(key: string, value: any): any {
    if (key === 'specification' && typeof value === 'string' && value.length > SPECIFICATION_PREVIEW_LENGTH) {
      return value.substring(0, SPECIFICATION_PREVIEW_LENGTH) + (value.length > SPECIFICATION_PREVIEW_LENGTH ? '...' : '');
    }
    return value;
  }

  /**
   * Get relevant fields that changed for an entity type
   */
  getRelevantFields(entityType: string): string[] {
    return RELEVANT_FIELDS_BY_ENTITY_TYPE[entityType] || ['specification', 'status'];
  }

  /**
   * Extract changed fields from before/after data
   */
  extractChangedFields(before: any, after: any, fieldsToCheck: string[]): {
    beforeData: Record<string, any>;
    afterData: Record<string, any>;
  } {
    const beforeData: Record<string, any> = {};
    const afterData: Record<string, any> = {};

    fieldsToCheck.forEach(field => {
      const beforeValue = this.getFieldValue(before, field);
      const afterValue = this.getFieldValue(after, field);

      // Only include field if values are different
      if (beforeValue !== afterValue) {
        if (before && beforeValue !== undefined) {
          beforeData[field] = beforeValue;
        }
        if (after && afterValue !== undefined) {
          afterData[field] = afterValue;
        }
      }
    });

    return { beforeData, afterData };
  }
}
