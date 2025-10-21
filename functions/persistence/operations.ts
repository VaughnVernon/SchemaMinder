/**
 * Database operations for Schema Registry
 */

import { SqlStorage } from '@cloudflare/workers-types';
import { Product, Domain, Context, Schema, SchemaVersion } from '../types';

export class DatabaseOperations {
  private sql: SqlStorage;

  constructor(sql: SqlStorage) {
    this.sql = sql;
  }

  private getTimestamp(): string {
    // Return ISO string without milliseconds (remove .SSSZ and add Z)
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  // ================== PRODUCTS ==================

  async getAllProducts(): Promise<Product[]> {
    const results = await this.sql.exec(`
      SELECT p.*, d.id as domain_id, d.name as domain_name, d.description as domain_description,
             c.id as context_id, c.name as context_name, c.namespace as context_namespace, c.description as context_description,
             s.id as schema_id, s.name as schema_name, s.description as schema_description,
             s.schema_type_category, s.scope as schema_scope,
             sv.id as version_id, sv.specification, sv.semantic_version,
             sv.description as version_description, sv.status as version_status,
             sv.created_at as version_created_at, sv.updated_at as version_updated_at
      FROM products p
      LEFT JOIN domains d ON d.product_id = p.id
      LEFT JOIN contexts c ON c.domain_id = d.id
      LEFT JOIN schemas s ON s.context_id = c.id
      LEFT JOIN schema_versions sv ON sv.schema_id = s.id
      ORDER BY p.created_at DESC, d.created_at DESC, c.created_at DESC,
               s.created_at DESC, sv.created_at DESC
    `).toArray();

    return this.buildProductHierarchy(results);
  }

  async getProductById(productId: string): Promise<Product | null> {
    const results = await this.sql.exec(`
      SELECT p.*, d.id as domain_id, d.name as domain_name, d.description as domain_description,
             c.id as context_id, c.name as context_name, c.namespace as context_namespace, c.description as context_description,
             s.id as schema_id, s.name as schema_name, s.description as schema_description,
             s.schema_type_category, s.scope as schema_scope,
             sv.id as version_id, sv.specification, sv.semantic_version,
             sv.description as version_description, sv.status as version_status,
             sv.created_at as version_created_at, sv.updated_at as version_updated_at
      FROM products p
      LEFT JOIN domains d ON d.product_id = p.id
      LEFT JOIN contexts c ON c.domain_id = d.id
      LEFT JOIN schemas s ON s.context_id = c.id
      LEFT JOIN schema_versions sv ON sv.schema_id = s.id
      WHERE p.id = ?
      ORDER BY p.created_at DESC, d.created_at DESC, c.created_at DESC,
               s.created_at DESC, sv.created_at DESC
    `, productId).toArray();

    const products = this.buildProductHierarchy(results);
    return products.length > 0 ? products[0] : null;
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.getProductById(productId);
  }

  async createProduct(id: string, name: string, description: string | null): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `INSERT INTO products (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      id, name, description, timestamp, timestamp
    );
  }

  async updateProduct(productId: string, name: string, description: string | null): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `UPDATE products SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
      name, description, timestamp, productId
    );
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.sql.exec(`DELETE FROM products WHERE id = ?`, productId);
  }

  // ================== DOMAINS ==================

  async getAllDomains(): Promise<Domain[]> {
    const results = await this.sql.exec(`
      SELECT d.*, p.name as product_name
      FROM domains d
      JOIN products p ON d.product_id = p.id
      ORDER BY d.created_at DESC
    `).toArray();

    return results as Domain[];
  }

  async getDomainById(domainId: string): Promise<Domain | null> {
    const results = await this.sql.exec(`
      SELECT d.*, p.name as product_name
      FROM domains d
      JOIN products p ON d.product_id = p.id
      WHERE d.id = ?
    `, domainId).toArray();

    return results.length > 0 ? results[0] as Domain : null;
  }

  async getDomain(domainId: string): Promise<Domain | null> {
    return this.getDomainById(domainId);
  }

  async createDomain(id: string, name: string, description: string | null, productId: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `INSERT INTO domains (id, name, description, product_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id, name, description, productId, timestamp, timestamp
    );
  }

  async updateDomain(domainId: string, name: string, description: string | null): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `UPDATE domains SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
      name, description, timestamp, domainId
    );
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.sql.exec(`DELETE FROM domains WHERE id = ?`, domainId);
  }

  // ================== CONTEXTS ==================

  async getAllContexts(): Promise<Context[]> {
    const results = await this.sql.exec(`
      SELECT c.*, d.name as domain_name, p.name as product_name
      FROM contexts c
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      ORDER BY c.created_at DESC
    `).toArray();

    return results as Context[];
  }

  async getContextById(contextId: string): Promise<Context | null> {
    const results = await this.sql.exec(`
      SELECT c.*, d.name as domain_name, p.name as product_name
      FROM contexts c
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE c.id = ?
    `, contextId).toArray();

    return results.length > 0 ? results[0] as Context : null;
  }

  async getContext(contextId: string): Promise<Context | null> {
    return this.getContextById(contextId);
  }

  async createContext(id: string, name: string, namespace: string | null, description: string | null, domainId: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `INSERT INTO contexts (id, name, namespace, description, domain_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, name, namespace, description, domainId, timestamp, timestamp
    );
  }

  async updateContext(contextId: string, name: string, namespace: string, description: string | null): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `UPDATE contexts SET name = ?, namespace = ?, description = ?, updated_at = ? WHERE id = ?`,
      name, namespace, description, timestamp, contextId
    );
  }

  async deleteContext(contextId: string): Promise<void> {
    await this.sql.exec(`DELETE FROM contexts WHERE id = ?`, contextId);
  }

  // ================== SCHEMAS ==================

  async getAllSchemas(): Promise<Schema[]> {
    const results = await this.sql.exec(`
      SELECT s.*, c.name as context_name, d.name as domain_name, p.name as product_name
      FROM schemas s
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      ORDER BY s.created_at DESC
    `).toArray();

    return results as Schema[];
  }

  async getSchemaById(schemaId: string): Promise<Schema | null> {
    const results = await this.sql.exec(`
      SELECT s.*, c.name as context_name, d.name as domain_name, p.name as product_name
      FROM schemas s
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE s.id = ?
    `, schemaId).toArray();

    return results.length > 0 ? results[0] as Schema : null;
  }

  async getSchema(schemaId: string): Promise<Schema | null> {
    return this.getSchemaById(schemaId);
  }

  async createSchema(id: string, name: string, description: string | null,
                    schemaTypeCategory: string, scope: string, contextId: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `INSERT INTO schemas (id, name, description, schema_type_category, scope, context_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, name, description, schemaTypeCategory, scope, contextId, timestamp, timestamp
    );
  }

  async updateSchema(schemaId: string, name: string, description: string | null,
                    schemaTypeCategory: string, scope: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `UPDATE schemas SET name = ?, description = ?, schema_type_category = ?, scope = ?, updated_at = ? WHERE id = ?`,
      name, description, schemaTypeCategory, scope, timestamp, schemaId
    );
  }

  async deleteSchema(schemaId: string): Promise<void> {
    await this.sql.exec(`DELETE FROM schemas WHERE id = ?`, schemaId);
  }

  // ================== SCHEMA VERSIONS ==================

  async getAllSchemaVersions(): Promise<SchemaVersion[]> {
    const results = await this.sql.exec(`
      SELECT sv.*, s.name as schema_name, c.name as context_name, d.name as domain_name, p.name as product_name
      FROM schema_versions sv
      JOIN schemas s ON sv.schema_id = s.id
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      ORDER BY sv.created_at DESC
    `).toArray();

    return results as SchemaVersion[];
  }

  async getSchemaVersionById(versionId: string): Promise<SchemaVersion | null> {
    const results = await this.sql.exec(`
      SELECT sv.*, s.name as schema_name, c.name as context_name, d.name as domain_name, p.name as product_name
      FROM schema_versions sv
      JOIN schemas s ON sv.schema_id = s.id
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE sv.id = ?
    `, versionId).toArray();

    return results.length > 0 ? results[0] as SchemaVersion : null;
  }

  async createSchemaVersion(id: string, specification: string, semanticVersion: string,
                           description: string | null, status: string, schemaId: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `INSERT INTO schema_versions (id, specification, semantic_version, description, status, schema_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, specification, semanticVersion, description, status, schemaId, timestamp, timestamp
    );
  }

  async updateSchemaVersion(versionId: string, specification: string, semanticVersion: string,
                           description: string | null, status: string): Promise<void> {
    const timestamp = this.getTimestamp();
    await this.sql.exec(
      `UPDATE schema_versions SET specification = ?, semantic_version = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`,
      specification, semanticVersion, description, status, timestamp, versionId
    );
  }

  async deleteSchemaVersion(versionId: string): Promise<void> {
    await this.sql.exec(`DELETE FROM schema_versions WHERE id = ?`, versionId);
  }

  /**
   * Rule 2 Support: Updates multiple schema versions.
   * Durable Objects provide atomicity automatically for operations within a single request.
   */
  async updateMultipleSchemaVersions(updates: Array<{
    versionId: string;
    specification: string;
    semanticVersion: string;
    description: string | null;
    status: string;
  }>): Promise<void> {
    const timestamp = this.getTimestamp();

    // Execute all updates - Durable Objects ensure atomicity within a single request
    for (const update of updates) {
      await this.sql.exec(
        `UPDATE schema_versions
         SET specification = ?, semantic_version = ?, description = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        update.specification,
        update.semanticVersion,
        update.description,
        update.status,
        timestamp,
        update.versionId
      );
    }
  }

  /**
   * Rule 1 & 2 Combined: Updates a schema and optionally all its version specifications.
   * When the schema name changes, this automatically updates all version specifications
   * to use the new schema name while preserving the type name.
   * Durable Objects provide atomicity automatically for operations within a single request.
   */
  async updateSchemaWithVersionSpecifications(
    schemaId: string,
    name: string,
    description: string | null,
    schemaTypeCategory: string,
    scope: string,
    versionUpdates?: Array<{
      versionId: string;
      specification: string;
      semanticVersion: string;
      description: string | null;
      status: string;
    }>
  ): Promise<void> {
    const timestamp = this.getTimestamp();

    // Update the schema - Durable Objects ensure atomicity within a single request
    await this.sql.exec(
      `UPDATE schemas SET name = ?, description = ?, schema_type_category = ?, scope = ?, updated_at = ? WHERE id = ?`,
      name, description, schemaTypeCategory, scope, timestamp, schemaId
    );

    // Update version specifications if provided
    if (versionUpdates && versionUpdates.length > 0) {
      for (const update of versionUpdates) {
        await this.sql.exec(
          `UPDATE schema_versions SET specification = ?, semantic_version = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`,
          update.specification,
          update.semanticVersion,
          update.description,
          update.status,
          timestamp,
          update.versionId
        );
      }
    }
  }

  // ================== REGISTRY STATISTICS ==================

  async getRegistryStatistics(): Promise<{
    products: number;
    domains: number;
    contexts: number;
    schemas: number;
    versions: number;
  }> {
    const productCount = await this.sql.exec(`SELECT COUNT(*) as count FROM products`).toArray();
    const domainCount = await this.sql.exec(`SELECT COUNT(*) as count FROM domains`).toArray();
    const contextCount = await this.sql.exec(`SELECT COUNT(*) as count FROM contexts`).toArray();
    const schemaCount = await this.sql.exec(`SELECT COUNT(*) as count FROM schemas`).toArray();
    const versionCount = await this.sql.exec(`SELECT COUNT(*) as count FROM schema_versions`).toArray();

    return {
      products: Number(productCount[0]?.count || 0),
      domains: Number(domainCount[0]?.count || 0),
      contexts: Number(contextCount[0]?.count || 0),
      schemas: Number(schemaCount[0]?.count || 0),
      versions: Number(versionCount[0]?.count || 0),
    };
  }

  // ================== FIND ==================

  async find(query: string): Promise<any[]> {
    const findTerm = `%${query.toLowerCase()}%`;

    // Find across all entity types
    const results = await this.sql.exec(`
      -- Find products
      SELECT
        'product' as type,
        p.id as entity_id,
        p.name,
        p.description,
        p.id as product_id,
        NULL as domain_id,
        NULL as context_id,
        NULL as schema_id,
        NULL as version_id,
        p.name as product_name,
        NULL as domain_name,
        NULL as context_name,
        NULL as schema_name,
        NULL as semantic_version
      FROM products p
      WHERE LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.description, '')) LIKE ?

      UNION ALL

      -- Find domains
      SELECT
        'domain' as type,
        d.id as entity_id,
        d.name,
        d.description,
        d.product_id,
        d.id as domain_id,
        NULL as context_id,
        NULL as schema_id,
        NULL as version_id,
        p.name as product_name,
        d.name as domain_name,
        NULL as context_name,
        NULL as schema_name,
        NULL as semantic_version
      FROM domains d
      JOIN products p ON d.product_id = p.id
      WHERE LOWER(d.name) LIKE ? OR LOWER(COALESCE(d.description, '')) LIKE ?

      UNION ALL

      -- Find contexts
      SELECT
        'context' as type,
        c.id as entity_id,
        c.name,
        c.description,
        p.id as product_id,
        d.id as domain_id,
        c.id as context_id,
        NULL as schema_id,
        NULL as version_id,
        p.name as product_name,
        d.name as domain_name,
        c.name as context_name,
        NULL as schema_name,
        NULL as semantic_version
      FROM contexts c
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.description, '')) LIKE ?

      UNION ALL

      -- Find schemas
      SELECT
        'schema' as type,
        s.id as entity_id,
        s.name,
        s.description,
        p.id as product_id,
        d.id as domain_id,
        c.id as context_id,
        s.id as schema_id,
        NULL as version_id,
        p.name as product_name,
        d.name as domain_name,
        c.name as context_name,
        s.name as schema_name,
        NULL as semantic_version
      FROM schemas s
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE LOWER(s.name) LIKE ? OR LOWER(COALESCE(s.description, '')) LIKE ?

      UNION ALL

      -- Find schema versions (by semantic version)
      SELECT
        'version' as type,
        sv.id as entity_id,
        ('v' || sv.semantic_version) as name,
        sv.description,
        p.id as product_id,
        d.id as domain_id,
        c.id as context_id,
        s.id as schema_id,
        sv.id as version_id,
        p.name as product_name,
        d.name as domain_name,
        c.name as context_name,
        s.name as schema_name,
        sv.semantic_version
      FROM schema_versions sv
      JOIN schemas s ON sv.schema_id = s.id
      JOIN contexts c ON s.context_id = c.id
      JOIN domains d ON c.domain_id = d.id
      JOIN products p ON d.product_id = p.id
      WHERE LOWER(sv.semantic_version) LIKE ? OR LOWER(COALESCE(sv.description, '')) LIKE ? OR LOWER(COALESCE(sv.specification, '')) LIKE ?

      ORDER BY type, name
      LIMIT 50
    `,
      // Parameters for each LIKE clause
      findTerm, findTerm, // products
      findTerm, findTerm, // domains
      findTerm, findTerm, // contexts
      findTerm, findTerm, // schemas
      findTerm, findTerm, findTerm  // versions (semantic_version, description, specification)
    ).toArray();

    return results;
  }

  // ================== HELPER METHODS ==================

  private buildProductHierarchy(results: any[]): Product[] {
    const productMap = new Map<string, Product>();

    for (const row of results) {
      // Get or create product
      if (!productMap.has(row.id)) {
        productMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          domains: []
        });
      }

      const product = productMap.get(row.id)!;

      // Add domain if exists
      if (row.domain_id) {
        let domain = product.domains.find(d => d.id === row.domain_id);
        if (!domain) {
          domain = {
            id: row.domain_id,
            name: row.domain_name,
            description: row.domain_description,
            productId: row.id,
            contexts: []
          };
          product.domains.push(domain);
        }

        // Add context if exists
        if (row.context_id) {
          let context = domain.contexts.find(c => c.id === row.context_id);
          if (!context) {
            context = {
              id: row.context_id,
              name: row.context_name,
              namespace: row.context_namespace,
              description: row.context_description,
              domainId: row.domain_id,
              schemas: []
            };
            domain.contexts.push(context);
          }

          // Add schema if exists
          if (row.schema_id) {
            let schema = context.schemas.find(s => s.id === row.schema_id);
            if (!schema) {
              schema = {
                id: row.schema_id,
                name: row.schema_name,
                description: row.schema_description,
                schemaTypeCategory: row.schema_type_category,
                scope: row.schema_scope,
                contextId: row.context_id,
                versions: []
              };
              context.schemas.push(schema);
            }

            // Add version if exists
            if (row.version_id) {
              const versionExists = schema.versions.some(v => v.id === row.version_id);
              if (!versionExists) {
                schema.versions.push({
                  id: row.version_id,
                  specification: row.specification,
                  semanticVersion: row.semantic_version,
                  description: row.version_description,
                  status: row.version_status,
                  schemaId: row.schema_id,
                  createdAt: row.version_created_at,
                  updatedAt: row.version_updated_at
                });
              }
            }
          }
        }
      }
    }

    return Array.from(productMap.values());
  }
}