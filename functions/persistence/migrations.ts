/**
 * Database migrations for Schema Registry
 */

import { DurableObjectState, SqlStorage } from '@cloudflare/workers-types';
// Define constraints locally to avoid circular dependency
const SCHEMA_TYPE_CATEGORY_VALUES = ['Commands', 'Data', 'Documents', 'Envelopes', 'Events', 'Queries'];
const SCHEMA_SCOPE_VALUES = ['Public', 'Private'];
const SCHEMA_STATUS_VALUES = ['Draft', 'Published', 'Deprecated', 'Removed'];

export class DatabaseMigrations {
  private ctx: DurableObjectState;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, sql: SqlStorage) {
    this.ctx = ctx;
    this.sql = sql;
  }

  /**
   * Initialize the database schema for new databases
   */
  async initializeSchema(): Promise<void> {
    // Build constraint strings dynamically
    const categoryConstraint = SCHEMA_TYPE_CATEGORY_VALUES.map(v => `'${v}'`).join(', ');
    const scopeConstraint = SCHEMA_SCOPE_VALUES.map(v => `'${v}'`).join(', ');
    const statusConstraint = SCHEMA_STATUS_VALUES.map(v => `'${v}'`).join(', ');

    // Create all tables first
    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        product_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        namespace TEXT,
        description TEXT,
        domain_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS schemas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        schema_type_category TEXT NOT NULL CHECK (schema_type_category IN (${categoryConstraint})),
        scope TEXT NOT NULL CHECK (scope IN (${scopeConstraint})) DEFAULT 'Public',
        context_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id TEXT PRIMARY KEY,
        specification TEXT NOT NULL,
        semantic_version TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK (status IN (${statusConstraint})) DEFAULT 'Draft',
        schema_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE CASCADE
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email_address TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        roles TEXT NOT NULL DEFAULT '["editor"]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        remember_me INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('P', 'D', 'C')),
        created_at TEXT NOT NULL,
        UNIQUE(type_id, type)
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(subscription_id, user_id)
      );
    `);

    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS change_tracker (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('P', 'D', 'C')),
        change_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
      );
    `);

    // Create all indexes separately
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_domains_product_id ON domains(product_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_contexts_domain_id ON contexts(domain_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_schemas_context_id ON schemas(context_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_schema_versions_schema_id ON schema_versions(schema_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email_address);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_type_id ON subscriptions(type_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON subscriptions(type);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_change_tracker_subscription_id ON change_tracker(subscription_id);`);
    await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_change_tracker_type ON change_tracker(type);`);
  }

  /**
   * Initialize sample data for new databases
   */
  async initializeSampleData(): Promise<void> {
    try {
      const timestamp = this.getTimestamp();

      // Create "My Product"
      const productId = crypto.randomUUID();
      await this.sql.exec(
        `INSERT INTO products (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        productId, 'My Product', null, timestamp, timestamp
      );

      // Create "My Domain" under "My Product"
      const domainId = crypto.randomUUID();
      await this.sql.exec(
        `INSERT INTO domains (id, name, description, product_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        domainId, 'My Domain', null, productId, timestamp, timestamp
      );

      // Create "My Context" under "My Domain"
      const contextId = crypto.randomUUID();
      await this.sql.exec(
        `INSERT INTO contexts (id, name, namespace, description, domain_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        contextId, 'My Context', null, null, domainId, timestamp, timestamp
      );

      console.log('Initialized with default hierarchy: My Product � My Domain � My Context');
    } catch (error) {
      console.error('Sample data initialization error:', error);
      // Don't throw - sample data is optional
    }
  }

  /**
   * Run all migrations
   */
  async runMigrations(): Promise<void> {
    try {
      // Migration 1: Add namespace column to contexts table if it doesn't exist
      const contextsTableResult = await this.sql.exec(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='contexts'
      `).toArray();

      if (contextsTableResult && contextsTableResult.length > 0 && contextsTableResult[0].sql) {
        const contextsSql = String(contextsTableResult[0].sql);

        // Check if 'namespace' column already exists
        if (!contextsSql.includes('namespace')) {
          console.log('Running migration: Adding namespace column to contexts table');

          await this.sql.exec(`ALTER TABLE contexts ADD COLUMN namespace TEXT;`);

          console.log('Migration completed: Added namespace column to contexts table');
        }
      }

      // Migration 2: Check if we need to update the schema_type_category constraint to include 'Queries'
      const result = await this.sql.exec(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='schemas'
      `).toArray();

      if (result && result.length > 0 && result[0].sql) {
        const schemaSql = String(result[0].sql);

        // Check if 'Queries' is already in the constraint
        if (!schemaSql.includes("'Queries'")) {
          console.log('Running migration: Adding Queries category to schema constraint');

          // SQLite doesn't support ALTER COLUMN with CHECK constraints directly
          // We need to recreate the table with the new constraint

          // Build the new constraint with all current categories
          const categoryConstraint = SCHEMA_TYPE_CATEGORY_VALUES.map(v => `'${v}'`).join(', ');
          const scopeConstraint = SCHEMA_SCOPE_VALUES.map(v => `'${v}'`).join(', ');

          // Use Durable Object's transaction API
          await this.ctx.storage.transaction(async () => {
            // First, backup schema_versions data since they have FK to schemas
            const versionBackup = await this.sql.exec(`SELECT * FROM schema_versions`).toArray();

            // Create new table with updated constraint
            await this.sql.exec(`
              CREATE TABLE schemas_new (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                schema_type_category TEXT NOT NULL CHECK (schema_type_category IN (${categoryConstraint})),
                scope TEXT NOT NULL CHECK (scope IN (${scopeConstraint})) DEFAULT 'Public',
                context_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
              )
            `);

            // Copy data from old table
            await this.sql.exec(`INSERT INTO schemas_new SELECT * FROM schemas`);

            // Drop old table (this will cascade delete schema_versions)
            await this.sql.exec(`DROP TABLE schemas`);

            // Rename new table
            await this.sql.exec(`ALTER TABLE schemas_new RENAME TO schemas`);

            // Recreate index
            await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_schemas_context_id ON schemas(context_id)`);

            // Recreate schema_versions table (it was dropped due to cascade)
            await this.sql.exec(`
              CREATE TABLE IF NOT EXISTS schema_versions (
                id TEXT PRIMARY KEY,
                specification TEXT NOT NULL,
                semantic_version TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL CHECK (status IN (${SCHEMA_STATUS_VALUES.map(v => `'${v}'`).join(', ')})) DEFAULT 'Draft',
                schema_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE CASCADE
              )
            `);

            // Recreate index for schema_versions
            await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_schema_versions_schema_id ON schema_versions(schema_id)`);

            // Restore schema_versions data
            for (const version of versionBackup) {
              await this.sql.exec(`
                INSERT INTO schema_versions (id, specification, semantic_version, description, status, schema_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, version.id, version.specification, version.semantic_version, version.description, version.status, version.schema_id, version.created_at, version.updated_at);
            }

            console.log(`Migration completed: Added Queries category to schema constraint and restored ${versionBackup.length} schema versions`);
          });
        }
      }

      // Migration 3: Add users and sessions tables if they don't exist
      const usersTableResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='users'
      `).toArray();

      if (usersTableResult.length === 0) {
        console.log('Running migration: Adding users table');

        await this.sql.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email_address TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            roles TEXT NOT NULL DEFAULT '["editor"]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email_address);
        `);

        console.log('Migration completed: Added users table');
      }

      const sessionsTableResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='sessions'
      `).toArray();

      if (sessionsTableResult.length === 0) {
        console.log('Running migration: Adding sessions table');

        await this.sql.exec(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            remember_me INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
          CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        `);

        console.log('Migration completed: Added sessions table');
      }

      // Migration 4: Add roles column to existing users table if it doesn't exist
      const usersTableColumnsResult = await this.sql.exec(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='users'
      `).toArray();

      if (usersTableColumnsResult.length > 0) {
        const usersSql = String(usersTableColumnsResult[0].sql);

        if (!usersSql.includes('roles')) {
          console.log('Running migration: Adding roles column to users table');

          try {
            await this.sql.exec(`ALTER TABLE users ADD COLUMN roles TEXT NOT NULL DEFAULT '["editor"]';`);

            // Update existing users to have editor role
            await this.sql.exec(`UPDATE users SET roles = '["editor"]' WHERE roles IS NULL OR roles = '';`);

            // Ensure me@somebody.me has admin role specifically
            await this.sql.exec(`UPDATE users SET roles = '["admin"]' WHERE email_address = 'me@somebody.me';`);

            console.log('Migration completed: Added roles column to users table');
          } catch (error) {
            console.error('Failed to add roles column:', error);
          }
        }
      }

      // Migration 5: Add subscription tables if they don't exist
      const subscriptionsTableResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='subscriptions'
      `).toArray();

      if (subscriptionsTableResult.length === 0) {
        console.log('Running migration: Adding subscription tables');

        // Create tables first
        await this.sql.exec(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            type_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('P', 'D', 'C')),
            created_at TEXT NOT NULL,
            UNIQUE(type_id, type)
          );
        `);

        await this.sql.exec(`
          CREATE TABLE IF NOT EXISTS user_subscriptions (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(subscription_id, user_id)
          );
        `);

        await this.sql.exec(`
          CREATE TABLE IF NOT EXISTS change_tracker (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('P', 'D', 'C')),
            change_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
          );
        `);

        // Create indexes separately
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_type_id ON subscriptions(type_id);`);
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON subscriptions(type);`);
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);`);
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);`);
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_change_tracker_subscription_id ON change_tracker(subscription_id);`);
        await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_change_tracker_type ON change_tracker(type);`);

        console.log('Migration completed: Added subscription tables');
      }

      // Migration 6: Global Change Tracking System (fixed version)
      // Check if change tracking tables already exist
      const changeTrackingTableResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='global_change_tracker'
      `).toArray();

      if (changeTrackingTableResult.length === 0) {
        console.log('Running migration: Adding global change tracking system');
      } else {
        console.log('Migration: Global change tracking system already exists, skipping');
      }

      // Only run the migration if the table doesn't exist
      if (changeTrackingTableResult.length === 0) {

      // Create tables separately to avoid SQL parsing issues
      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS global_change_tracker (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'domain', 'context', 'schema', 'schema_version')),
          entity_id TEXT NOT NULL,
          entity_name TEXT,
          change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
          change_data TEXT NOT NULL,
          changed_by_user_id TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        );
      `);

      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS user_change_views (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          change_id TEXT NOT NULL,
          viewed_at TEXT NOT NULL,
          UNIQUE(user_id, change_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (change_id) REFERENCES global_change_tracker(id) ON DELETE CASCADE
        );
      `);

      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS user_notification_preferences (
          user_id TEXT PRIMARY KEY,
          retention_days INTEGER DEFAULT 30,
          show_breaking_changes_only INTEGER DEFAULT 0 CHECK (show_breaking_changes_only IN (0, 1)),
          email_digest_frequency TEXT DEFAULT 'weekly' CHECK (email_digest_frequency IN ('never', 'daily', 'weekly')),
          real_time_notifications INTEGER DEFAULT 1 CHECK (real_time_notifications IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Create indexes separately
      await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_entity_type_created ON global_change_tracker(entity_type, created_at);`);
      await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_entity_id_created ON global_change_tracker(entity_id, created_at);`);
      await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_changed_by ON global_change_tracker(changed_by_user_id);`);
      await this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_user_views ON user_change_views(user_id, viewed_at);`);

        console.log('Migration completed: Added global change tracking system');
      } // End of conditional migration check
    } catch (error) {
      console.error('Migration error:', error);
      // Don't throw - migrations should not break the app
    } finally {
      // Migration complete
    }
  }

  /**
   * Check if database needs initialization
   */
  async needsInitialization(): Promise<boolean> {
    const tables = await this.sql.exec(
      `SELECT name FROM sqlite_master WHERE type='table'`
    ).toArray();

    // We now expect at least 7 tables: products, domains, contexts, schemas, schema_versions, users, sessions
    return tables.length < 5; // Keep threshold at 5 to detect truly new databases
  }

  private getTimestamp(): string {
    // Return ISO string without milliseconds (remove .SSSZ and add Z)
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
}