/**
 * Subscription Operations for managing user subscriptions
 */

import { DurableObjectState, SqlStorage } from '@cloudflare/workers-types';

export interface Subscription {
  id: string;
  typeId: string;
  type: 'P' | 'D' | 'C'; // Product, Domain, Context
  createdAt: string;
}

export interface UserSubscription {
  id: string;
  subscriptionId: string;
  userId: string;
  createdAt: string;
}

export interface ChangeTrackerEntry {
  id: string;
  subscriptionId: string;
  type: 'P' | 'D' | 'C';
  changeData: string;
  createdAt: string;
}

export class SubscriptionOperations {
  private ctx: DurableObjectState;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, sql: SqlStorage) {
    this.ctx = ctx;
    this.sql = sql;
  }

  /**
   * Subscribe a user to a Product, Domain, or Context
   */
  async subscribeUser(
    userId: string,
    typeId: string,
    type: 'P' | 'D' | 'C'
  ): Promise<{ success: boolean; error?: string; subscriptionId?: string }> {
    try {
      const timestamp = this.getTimestamp();

      // First, check if subscription exists for this type and typeId
      const subscriptionResults = await this.sql.exec(
        `SELECT id FROM subscriptions WHERE type_id = ? AND type = ?`,
        typeId, type
      ).toArray();

      let subscription = subscriptionResults.length > 0 ? subscriptionResults[0] : null;

      let subscriptionId: string;

      if (!subscription) {
        // Create new subscription entry
        subscriptionId = crypto.randomUUID();
        await this.sql.exec(
          `INSERT INTO subscriptions (id, type_id, type, created_at)
           VALUES (?, ?, ?, ?)`,
          subscriptionId, typeId, type, timestamp
        );
      } else {
        subscriptionId = subscription.id as string;
      }

      // Check if user is already subscribed
      const existingUserResults = await this.sql.exec(
        `SELECT id FROM user_subscriptions WHERE subscription_id = ? AND user_id = ?`,
        subscriptionId, userId
      ).toArray();

      const existingUserSubscription = existingUserResults.length > 0 ? existingUserResults[0] : null;

      if (existingUserSubscription) {
        return { success: false, error: 'User is already subscribed' };
      }

      // Create user subscription
      const userSubscriptionId = crypto.randomUUID();
      await this.sql.exec(
        `INSERT INTO user_subscriptions (id, subscription_id, user_id, created_at)
         VALUES (?, ?, ?, ?)`,
        userSubscriptionId, subscriptionId, userId, timestamp
      );

      return { success: true, subscriptionId };
    } catch (error) {
      console.error('Error subscribing user:', error);
      return { success: false, error: 'Failed to create subscription' };
    }
  }

  /**
   * Unsubscribe a user from a Product, Domain, or Context
   */
  async unsubscribeUser(
    userId: string,
    typeId: string,
    type: 'P' | 'D' | 'C'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the subscription
      const subscriptionResults = await this.sql.exec(
        `SELECT id FROM subscriptions WHERE type_id = ? AND type = ?`,
        typeId, type
      ).toArray();

      const subscription = subscriptionResults.length > 0 ? subscriptionResults[0] : null;

      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // Remove user subscription
      const result = await this.sql.exec(
        `DELETE FROM user_subscriptions WHERE subscription_id = ? AND user_id = ?`,
        subscription.id, userId
      );

      if (result.changes === 0) {
        return { success: false, error: 'User was not subscribed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing user:', error);
      return { success: false, error: 'Failed to remove subscription' };
    }
  }

  /**
   * Check if a user is subscribed to a specific item
   */
  async isUserSubscribed(
    userId: string,
    typeId: string,
    type: 'P' | 'D' | 'C'
  ): Promise<boolean> {
    try {
      const results = await this.sql.exec(
        `SELECT us.id
         FROM user_subscriptions us
         JOIN subscriptions s ON us.subscription_id = s.id
         WHERE s.type_id = ? AND s.type = ? AND us.user_id = ?`,
        typeId, type, userId
      ).toArray();

      return results.length > 0;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const results = await this.sql.exec(
        `SELECT s.id, s.type_id, s.type, s.created_at
         FROM subscriptions s
         JOIN user_subscriptions us ON s.id = us.subscription_id
         WHERE us.user_id = ?
         ORDER BY s.created_at DESC`,
        userId
      ).toArray();

      return results.map(row => ({
        id: row.id as string,
        typeId: row.type_id as string,
        type: row.type as 'P' | 'D' | 'C',
        createdAt: row.created_at as string
      }));
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all users subscribed to a specific item
   */
  async getSubscribedUsers(
    typeId: string,
    type: 'P' | 'D' | 'C'
  ): Promise<string[]> {
    try {
      const results = await this.sql.exec(
        `SELECT us.user_id
         FROM user_subscriptions us
         JOIN subscriptions s ON us.subscription_id = s.id
         WHERE s.type_id = ? AND s.type = ?`,
        typeId, type
      ).toArray();

      return results.map(row => row.user_id as string);
    } catch (error) {
      console.error('Error getting subscribed users:', error);
      return [];
    }
  }

  /**
   * Add a change tracking entry
   */
  async addChangeTracker(
    subscriptionId: string,
    type: 'P' | 'D' | 'C',
    changeData: object
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = this.getTimestamp();
      const changeId = crypto.randomUUID();
      const changeDataJson = JSON.stringify(changeData);

      await this.sql.exec(
        `INSERT INTO change_tracker (id, subscription_id, type, change_data, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        changeId, subscriptionId, type, changeDataJson, timestamp
      );

      return { success: true };
    } catch (error) {
      console.error('Error adding change tracker entry:', error);
      return { success: false, error: 'Failed to add change tracker entry' };
    }
  }

  /**
   * Get change history for a subscription
   */
  async getChangeHistory(
    subscriptionId: string,
    limit: number = 50
  ): Promise<ChangeTrackerEntry[]> {
    try {
      const results = await this.sql.exec(
        `SELECT id, subscription_id, type, change_data, created_at
         FROM change_tracker
         WHERE subscription_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        subscriptionId, limit
      ).toArray();

      return results.map(row => ({
        id: row.id as string,
        subscriptionId: row.subscription_id as string,
        type: row.type as 'P' | 'D' | 'C',
        changeData: row.change_data as string,
        createdAt: row.created_at as string
      }));
    } catch (error) {
      console.error('Error getting change history:', error);
      return [];
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
}