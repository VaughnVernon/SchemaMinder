/**
 * Change tracking operations for the global change tracking system
 */

import { SqlStorage } from '@cloudflare/workers-types';

export interface ChangeRecord {
  id: string;
  entityType: 'product' | 'domain' | 'context' | 'schema' | 'schema_version';
  entityId: string;
  entityName?: string;
  changeType: 'created' | 'updated' | 'deleted';
  changeData: any; // JSON data with before/after values
  changedByUserId?: string;
  createdAt: string;
}

export interface UserChangeView {
  id: string;
  userId: string;
  changeId: string;
  viewedAt: string;
}

export interface ChangesSummary {
  products: { new: number; updated: number; deleted: number };
  domains: { new: number; updated: number; deleted: number };
  contexts: { new: number; updated: number; deleted: number };
  schemas: { new: number; updated: number; deleted: number };
  schema_versions: { new: number; updated: number; deleted: number };
  totalChanges: number;
}

export interface DetailedChange extends ChangeRecord {
  changedByUserName?: string;
  changedByUserEmail?: string;
  isBreakingChange?: boolean;
}

export class ChangeTrackingOperations {
  private sql: SqlStorage;

  constructor(sql: SqlStorage) {
    this.sql = sql;
  }

  /**
   * Record a change in the global change tracker
   */
  async recordChange(
    entityType: ChangeRecord['entityType'],
    entityId: string,
    entityName: string,
    changeType: ChangeRecord['changeType'],
    changeData: any,
    changedByUserId?: string
  ): Promise<{ success: boolean; error?: string; changeId?: string }> {
    try {
      // First check if the table exists with more robust error handling
      let tableExists = false;
      try {
        const tableCheckResult = await this.sql.exec(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='global_change_tracker'
        `).toArray();
        tableExists = tableCheckResult.length > 0;
      } catch (tableCheckError) {
        console.log('Change tracking: Error checking table existence, assuming table does not exist:', tableCheckError);
        return { success: false, error: 'Change tracking table check failed' };
      }

      if (!tableExists) {
        console.log('Change tracking: global_change_tracker table does not exist, skipping change recording');
        return { success: false, error: 'Change tracking table not initialized' };
      }

      const changeId = crypto.randomUUID();
      const timestamp = this.getTimestamp();

      await this.sql.exec(
        `INSERT INTO global_change_tracker
         (id, entity_type, entity_id, entity_name, change_type, change_data, changed_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        changeId,
        entityType,
        entityId,
        entityName,
        changeType,
        JSON.stringify(changeData),
        changedByUserId || null,
        timestamp
      );

      // Clean up old records based on retention policy (default 30 days)
      await this.cleanupOldChanges();

      return { success: true, changeId };
    } catch (error) {
      console.error('Error recording change:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get changes summary for a user (only unseen changes)
   */
  async getChangesSummaryForUser(userId: string): Promise<{
    success: boolean;
    summary?: ChangesSummary;
    error?: string;
  }> {
    try {
      // First check if the tables exist
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('global_change_tracker', 'user_notification_preferences', 'user_change_views')
      `).toArray();

      const existingTables = tableCheckResult.map((row: any) => row.name);

      if (!existingTables.includes('global_change_tracker')) {
        console.log('Change tracking: global_change_tracker table does not exist, returning empty summary');
        const emptySummary: ChangesSummary = {
          products: { new: 0, updated: 0, deleted: 0 },
          domains: { new: 0, updated: 0, deleted: 0 },
          contexts: { new: 0, updated: 0, deleted: 0 },
          schemas: { new: 0, updated: 0, deleted: 0 },
          schema_versions: { new: 0, updated: 0, deleted: 0 },
          totalChanges: 0
        };
        return { success: true, summary: emptySummary };
      }

      // Get user's retention preference (default 30 days)
      let retentionDays = 30;
      if (existingTables.includes('user_notification_preferences')) {
        const preferencesResults = await this.sql.exec(
          `SELECT retention_days FROM user_notification_preferences WHERE user_id = ?`,
          userId
        ).toArray();

        if (preferencesResults.length > 0) {
          retentionDays = (preferencesResults[0] as any).retention_days || 30;
        }
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

      // Get subscription-filtered changes within retention period
      let changesQuery: string;
      let queryParams: any[];

      // Check if subscription tables exist
      const subscriptionTablesCheck = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('subscriptions', 'user_subscriptions')
      `).toArray();

      const hasSubscriptions = subscriptionTablesCheck.length === 2;

      if (!hasSubscriptions) {
        // If no subscription system, show all changes (legacy behavior)
        if (existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT entity_type, change_type, COUNT(*) as count
            FROM global_change_tracker gct
            WHERE gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            GROUP BY entity_type, change_type
          `;
          queryParams = [cutoffTimestamp, userId];
        } else {
          changesQuery = `
            SELECT entity_type, change_type, COUNT(*) as count
            FROM global_change_tracker gct
            WHERE gct.created_at >= ?
            GROUP BY entity_type, change_type
          `;
          queryParams = [cutoffTimestamp];
        }
      } else {
        // Subscription-filtered query with hierarchy inheritance
        const baseSubscriptionFilter = `
          -- Direct subscriptions: user subscribed to the exact entity that changed
          (gct.entity_type = 'product' AND s.type = 'P' AND s.type_id = gct.entity_id) OR
          (gct.entity_type = 'domain' AND s.type = 'D' AND s.type_id = gct.entity_id) OR
          (gct.entity_type = 'context' AND s.type = 'C' AND s.type_id = gct.entity_id) OR

          -- Inheritance: show child entity changes if subscribed to parent
          -- Domain changes: show if subscribed to parent product
          (gct.entity_type = 'domain' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d WHERE d.id = gct.entity_id
          )) OR

          -- Context changes: show if subscribed to parent domain or product
          (gct.entity_type = 'context' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c WHERE c.id = gct.entity_id
          )) OR
          (gct.entity_type = 'context' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            WHERE c.id = gct.entity_id
          )) OR

          -- Schema changes: show if subscribed to parent context, domain, or product
          (gct.entity_type = 'schema' AND s.type = 'C' AND s.type_id IN (
            SELECT sc.context_id FROM schemas sc WHERE sc.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c
            JOIN schemas sc ON sc.context_id = c.id
            WHERE sc.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            JOIN schemas sc ON sc.context_id = c.id
            WHERE sc.id = gct.entity_id
          )) OR

          -- Schema version changes: show if subscribed to parent schema's context, domain, or product
          (gct.entity_type = 'schema_version' AND s.type = 'C' AND s.type_id IN (
            SELECT sc.context_id FROM schemas sc
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema_version' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c
            JOIN schemas sc ON sc.context_id = c.id
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema_version' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            JOIN schemas sc ON sc.context_id = c.id
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          ))
        `;

        if (existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT gct.entity_type, gct.change_type, COUNT(DISTINCT gct.id) as count
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            WHERE us.user_id = ?
              AND gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            GROUP BY gct.entity_type, gct.change_type
          `;
          queryParams = [userId, cutoffTimestamp, userId];
        } else {
          changesQuery = `
            SELECT gct.entity_type, gct.change_type, COUNT(DISTINCT gct.id) as count
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            WHERE us.user_id = ?
              AND gct.created_at >= ?
            GROUP BY gct.entity_type, gct.change_type
          `;
          queryParams = [userId, cutoffTimestamp];
        }
      }

      const changesResults = await this.sql.exec(changesQuery, ...queryParams).toArray();

      const summary: ChangesSummary = {
        products: { new: 0, updated: 0, deleted: 0 },
        domains: { new: 0, updated: 0, deleted: 0 },
        contexts: { new: 0, updated: 0, deleted: 0 },
        schemas: { new: 0, updated: 0, deleted: 0 },
        schema_versions: { new: 0, updated: 0, deleted: 0 },
        totalChanges: 0
      };

      changesResults.forEach((row: any) => {
        const entityType = row.entity_type;
        const changeType = row.change_type;
        const count = row.count;

        // Map singular entity types to plural keys in summary
        const entityTypeMap: { [key: string]: keyof ChangesSummary } = {
          'product': 'products',
          'domain': 'domains',
          'context': 'contexts',
          'schema': 'schemas',
          'schema_version': 'schema_versions'
        };

        const summaryKey = entityTypeMap[entityType];
        if (summaryKey && summary[summaryKey]) {
          const entitySummary = summary[summaryKey] as any;
          if (changeType === 'created') entitySummary.new += count;
          else if (changeType === 'updated') entitySummary.updated += count;
          else if (changeType === 'deleted') entitySummary.deleted += count;

          summary.totalChanges += count;
        }
      });

      return { success: true, summary };
    } catch (error) {
      console.error('Error getting changes summary:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get detailed changes for a specific entity type
   */
  async getDetailedChangesForEntity(
    userId: string,
    entityType: ChangeRecord['entityType']
  ): Promise<{
    success: boolean;
    changes?: DetailedChange[];
    error?: string;
  }> {
    try {
      // First check if the tables exist
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('global_change_tracker', 'user_notification_preferences', 'user_change_views', 'users')
      `).toArray();

      const existingTables = tableCheckResult.map((row: any) => row.name);

      if (!existingTables.includes('global_change_tracker')) {
        console.log('Change tracking: global_change_tracker table does not exist, returning empty changes');
        return { success: true, changes: [] };
      }

      // Get user's retention preference
      let retentionDays = 30;
      if (existingTables.includes('user_notification_preferences')) {
        const preferencesResults = await this.sql.exec(
          `SELECT retention_days FROM user_notification_preferences WHERE user_id = ?`,
          userId
        ).toArray();

        if (preferencesResults.length > 0) {
          retentionDays = (preferencesResults[0] as any).retention_days || 30;
        }
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

      // Check if subscription tables exist
      const subscriptionTablesCheck = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('subscriptions', 'user_subscriptions')
      `).toArray();

      const hasSubscriptions = subscriptionTablesCheck.length === 2;
      let changesQuery: string;
      let queryParams: any[];

      if (!hasSubscriptions) {
        // Legacy behavior without subscription filtering
        if (existingTables.includes('users') && existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              u.full_name as changed_by_user_name,
              u.email_address as changed_by_user_email
            FROM global_change_tracker gct
            LEFT JOIN users u ON gct.changed_by_user_id = u.id
            WHERE gct.entity_type = ?
              AND gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            ORDER BY gct.created_at DESC
          `;
          queryParams = [entityType, cutoffTimestamp, userId];
        } else if (existingTables.includes('users')) {
          changesQuery = `
            SELECT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              u.full_name as changed_by_user_name,
              u.email_address as changed_by_user_email
            FROM global_change_tracker gct
            LEFT JOIN users u ON gct.changed_by_user_id = u.id
            WHERE gct.entity_type = ?
              AND gct.created_at >= ?
            ORDER BY gct.created_at DESC
          `;
          queryParams = [entityType, cutoffTimestamp];
        } else if (existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              NULL as changed_by_user_name,
              NULL as changed_by_user_email
            FROM global_change_tracker gct
            WHERE gct.entity_type = ?
              AND gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            ORDER BY gct.created_at DESC
          `;
          queryParams = [entityType, cutoffTimestamp, userId];
        } else {
          changesQuery = `
            SELECT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              NULL as changed_by_user_name,
              NULL as changed_by_user_email
            FROM global_change_tracker gct
            WHERE gct.entity_type = ?
              AND gct.created_at >= ?
            ORDER BY gct.created_at DESC
          `;
          queryParams = [entityType, cutoffTimestamp];
        }
      } else {
        // Subscription-filtered queries with hierarchy inheritance
        const baseSubscriptionFilter = `
          -- Direct subscriptions: user subscribed to the exact entity that changed
          (gct.entity_type = 'product' AND s.type = 'P' AND s.type_id = gct.entity_id) OR
          (gct.entity_type = 'domain' AND s.type = 'D' AND s.type_id = gct.entity_id) OR
          (gct.entity_type = 'context' AND s.type = 'C' AND s.type_id = gct.entity_id) OR

          -- Inheritance: show child entity changes if subscribed to parent
          -- Domain changes: show if subscribed to parent product
          (gct.entity_type = 'domain' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d WHERE d.id = gct.entity_id
          )) OR

          -- Context changes: show if subscribed to parent domain or product
          (gct.entity_type = 'context' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c WHERE c.id = gct.entity_id
          )) OR
          (gct.entity_type = 'context' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            WHERE c.id = gct.entity_id
          )) OR

          -- Schema changes: show if subscribed to parent context, domain, or product
          (gct.entity_type = 'schema' AND s.type = 'C' AND s.type_id IN (
            SELECT sc.context_id FROM schemas sc WHERE sc.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c
            JOIN schemas sc ON sc.context_id = c.id
            WHERE sc.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            JOIN schemas sc ON sc.context_id = c.id
            WHERE sc.id = gct.entity_id
          )) OR

          -- Schema version changes: show if subscribed to parent schema's context, domain, or product
          (gct.entity_type = 'schema_version' AND s.type = 'C' AND s.type_id IN (
            SELECT sc.context_id FROM schemas sc
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema_version' AND s.type = 'D' AND s.type_id IN (
            SELECT c.domain_id FROM contexts c
            JOIN schemas sc ON sc.context_id = c.id
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          )) OR
          (gct.entity_type = 'schema_version' AND s.type = 'P' AND s.type_id IN (
            SELECT d.product_id FROM domains d
            JOIN contexts c ON c.domain_id = d.id
            JOIN schemas sc ON sc.context_id = c.id
            JOIN schema_versions sv ON sv.schema_id = sc.id
            WHERE sv.id = gct.entity_id
          ))
        `;

        if (existingTables.includes('users') && existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT DISTINCT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              u.full_name as changed_by_user_name,
              u.email_address as changed_by_user_email
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            LEFT JOIN users u ON gct.changed_by_user_id = u.id
            WHERE us.user_id = ?
              AND gct.entity_type = ?
              AND gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            ORDER BY gct.created_at DESC
          `;
          queryParams = [userId, entityType, cutoffTimestamp, userId];
        } else if (existingTables.includes('users')) {
          changesQuery = `
            SELECT DISTINCT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              u.full_name as changed_by_user_name,
              u.email_address as changed_by_user_email
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            LEFT JOIN users u ON gct.changed_by_user_id = u.id
            WHERE us.user_id = ?
              AND gct.entity_type = ?
              AND gct.created_at >= ?
            ORDER BY gct.created_at DESC
          `;
          queryParams = [userId, entityType, cutoffTimestamp];
        } else if (existingTables.includes('user_change_views')) {
          changesQuery = `
            SELECT DISTINCT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              NULL as changed_by_user_name,
              NULL as changed_by_user_email
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            WHERE us.user_id = ?
              AND gct.entity_type = ?
              AND gct.created_at >= ?
              AND gct.id NOT IN (
                SELECT change_id FROM user_change_views WHERE user_id = ?
              )
            ORDER BY gct.created_at DESC
          `;
          queryParams = [userId, entityType, cutoffTimestamp, userId];
        } else {
          changesQuery = `
            SELECT DISTINCT
              gct.id,
              gct.entity_type,
              gct.entity_id,
              gct.entity_name,
              gct.change_type,
              gct.change_data,
              gct.changed_by_user_id,
              gct.created_at,
              NULL as changed_by_user_name,
              NULL as changed_by_user_email
            FROM global_change_tracker gct
            JOIN subscriptions s ON (${baseSubscriptionFilter})
            JOIN user_subscriptions us ON s.id = us.subscription_id
            WHERE us.user_id = ?
              AND gct.entity_type = ?
              AND gct.created_at >= ?
            ORDER BY gct.created_at DESC
          `;
          queryParams = [userId, entityType, cutoffTimestamp];
        }
      }

      const changesResults = await this.sql.exec(changesQuery, ...queryParams).toArray();

      const changes: DetailedChange[] = changesResults.map((row: any) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        changeType: row.change_type,
        changeData: JSON.parse(row.change_data),
        changedByUserId: row.changed_by_user_id,
        createdAt: row.created_at,
        changedByUserName: row.changed_by_user_name,
        changedByUserEmail: row.changed_by_user_email,
        isBreakingChange: this.detectBreakingChange(row.entity_type, JSON.parse(row.change_data))
      }));

      return { success: true, changes };
    } catch (error) {
      console.error('Error getting detailed changes:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Mark changes as seen by a user
   */
  async markChangesAsSeen(
    userId: string,
    changeIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if the user_change_views table exists
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_change_views'
      `).toArray();

      if (tableCheckResult.length === 0) {
        console.log('Change tracking: user_change_views table does not exist, cannot mark changes as seen');
        return { success: false, error: 'User change views table not initialized' };
      }

      const timestamp = this.getTimestamp();

      for (const changeId of changeIds) {
        // Use INSERT OR IGNORE to avoid duplicates
        await this.sql.exec(
          `INSERT OR IGNORE INTO user_change_views (id, user_id, change_id, viewed_at)
           VALUES (?, ?, ?, ?)`,
          crypto.randomUUID(),
          userId,
          changeId,
          timestamp
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking changes as seen:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Clean up old change records based on retention policies
   */
  private async cleanupOldChanges(): Promise<void> {
    try {
      // First check if tables exist
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('global_change_tracker', 'user_notification_preferences')
      `).toArray();

      const existingTables = tableCheckResult.map((row: any) => row.name);

      if (!existingTables.includes('global_change_tracker')) {
        console.log('Change tracking: global_change_tracker table does not exist, skipping cleanup');
        return;
      }

      // Get the shortest retention period from all users (to be safe)
      let retentionDays = 30; // Default
      if (existingTables.includes('user_notification_preferences')) {
        const shortestRetentionResults = await this.sql.exec(
          `SELECT MIN(retention_days) as min_retention FROM user_notification_preferences`
        ).toArray();

        if (shortestRetentionResults.length > 0 && shortestRetentionResults[0]) {
          retentionDays = Math.max((shortestRetentionResults[0] as any).min_retention || 30, 30);
        }
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

      // Delete old change records (this will cascade delete user_change_views)
      await this.sql.exec(
        `DELETE FROM global_change_tracker WHERE created_at < ?`,
        cutoffTimestamp
      );
    } catch (error) {
      console.error('Error cleaning up old changes:', error);
      // Don't throw - cleanup failures shouldn't break the app
    }
  }

  /**
   * Detect if a change is potentially breaking
   */
  private detectBreakingChange(entityType: string, changeData: any): boolean {
    if (entityType === 'schema' || entityType === 'schema_version') {
      // Look for breaking changes in schemas
      if (changeData.before && changeData.after) {
        // Field removals
        if (changeData.removedFields && changeData.removedFields.length > 0) {
          return true;
        }

        // Required field additions
        if (changeData.addedRequiredFields && changeData.addedRequiredFields.length > 0) {
          return true;
        }

        // Type changes
        if (changeData.changedFieldTypes && changeData.changedFieldTypes.length > 0) {
          return true;
        }

        // Major version bump
        if (entityType === 'schema_version' && changeData.after.semanticVersion) {
          const before = changeData.before.semanticVersion || '0.0.0';
          const after = changeData.after.semanticVersion;
          const beforeMajor = parseInt(before.split('.')[0]);
          const afterMajor = parseInt(after.split('.')[0]);
          if (afterMajor > beforeMajor) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
}