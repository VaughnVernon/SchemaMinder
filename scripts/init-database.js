#!/usr/bin/env node

/**
 * Database Initialization Script for Kalele Domo Schema Registry
 *
 * This script initializes the database schema by making a request to the
 * Durable Object. The schema is automatically initialized on first access,
 * but this script provides an explicit way to trigger initialization.
 *
 * Usage:
 *   node scripts/init-database.js [tenant-id] [registry-id]
 *
 * Examples:
 *   node scripts/init-database.js
 *   node scripts/init-database.js my-tenant my-registry
 *   TENANT_ID=acme REGISTRY_ID=prod node scripts/init-database.js
 */

const args = process.argv.slice(2);
const tenantId = args[0] || process.env.TENANT_ID || 'default-tenant';
const registryId = args[1] || process.env.REGISTRY_ID || 'default-registry';
const apiUrl = process.env.API_URL || 'http://localhost:8789';

console.log('Database Initialization Script');
console.log('==============================');
console.log(`Tenant: ${tenantId}`);
console.log(`Registry: ${registryId}`);
console.log(`API URL: ${apiUrl}`);
console.log('');

/**
 * Initialize the database by making a request to the API
 * This triggers Durable Object creation and schema initialization
 */
async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');

    // Make a request to the API info endpoint
    // This will create the Durable Object if it doesn't exist
    // and initialize the schema
    const response = await fetch(`${apiUrl}/schema-registry/api/registry`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log('✓ Database initialized successfully');
    console.log('');
    console.log('Registry Information:');
    console.log('--------------------');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('✗ Failed to initialize database');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Make sure the API server is running:');
    console.error('  npx wrangler dev --port 8789');
    throw error;
  }
}

/**
 * Verify database initialization by fetching products
 */
async function verifyDatabase() {
  try {
    console.log('');
    console.log('Verifying database...');

    const response = await fetch(`${apiUrl}/schema-registry/api/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const products = await response.json();

    console.log('✓ Database verified successfully');
    console.log(`  Found ${products.length} product(s)`);

    return products;
  } catch (error) {
    console.error('✗ Failed to verify database');
    console.error('Error:', error.message);
    throw error;
  }
}

// Run the script
(async () => {
  try {
    await initializeDatabase();
    await verifyDatabase();

    console.log('');
    console.log('Database initialization complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the frontend: npm run dev');
    console.log('  2. Open http://localhost:5173');
    console.log('  3. Create your first product');

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();
