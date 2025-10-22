#!/usr/bin/env node

/**
 * Create Admin User Script for Kalele Domo Schema Registry
 *
 * This script creates an admin user by making a registration request
 * and then directly updating the user's role in the database.
 *
 * Usage:
 *   node scripts/create-admin-user.js <email> <password> <full-name>
 *
 * Examples:
 *   node scripts/create-admin-user.js admin@example.com SecurePass123! "Admin User"
 *   TENANT_ID=acme node scripts/create-admin-user.js admin@acme.com Pass123! "Acme Admin"
 */

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node scripts/create-admin-user.js <email> <password> <full-name>');
  console.error('Example: node scripts/create-admin-user.js admin@example.com SecurePass123! "Admin User"');
  process.exit(1);
}

const [email, password, fullName] = args;
const tenantId = process.env.TENANT_ID || 'default-tenant';
const registryId = process.env.REGISTRY_ID || 'default-registry';
const apiUrl = process.env.API_URL || 'http://localhost:8789';

console.log('Create Admin User Script');
console.log('========================');
console.log(`Email: ${email}`);
console.log(`Full Name: ${fullName}`);
console.log(`Tenant: ${tenantId}`);
console.log(`Registry: ${registryId}`);
console.log(`API URL: ${apiUrl}`);
console.log('');

/**
 * Register the user through the API
 */
async function registerUser() {
  try {
    console.log('Registering user...');

    const response = await fetch(`${apiUrl}/schema-registry/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      },
      body: JSON.stringify({
        emailAddress: email,
        password: password,
        fullName: fullName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✓ User registered successfully');
    console.log(`  User ID: ${data.user.id}`);

    return data.user;
  } catch (error) {
    // Check if user already exists
    if (error.message.includes('already exists') || error.message.includes('UNIQUE constraint')) {
      console.log('⚠ User already exists, attempting to update role...');
      return { emailAddress: email };
    }

    console.error('✗ Failed to register user');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Update user role to admin
 */
async function updateToAdmin() {
  try {
    console.log('');
    console.log('Updating user role to admin...');

    // We need to use the admin endpoint to update roles
    // For now, we'll use a direct SQL approach via a custom endpoint
    const response = await fetch(`${apiUrl}/schema-registry/api/admin/update-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      },
      body: JSON.stringify({
        email: email,
        roles: ['admin']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      // If endpoint doesn't exist, provide alternative instructions
      if (response.status === 404 || errorText.includes('not found')) {
        console.log('⚠ Admin endpoint not available');
        console.log('');
        console.log('Alternative: Run this SQL command manually:');
        console.log('============================================');
        console.log(`UPDATE users SET roles = '["admin"]' WHERE email_address = '${email}';`);
        console.log('');
        console.log('Or use wrangler CLI to access the Durable Object SQL database');
        return;
      }

      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✓ User role updated to admin');

    return data;
  } catch (error) {
    console.error('⚠ Could not automatically update role to admin');
    console.error('');
    console.error('Manual steps required:');
    console.error('=====================');
    console.error('1. The user has been created with "editor" role');
    console.error('2. To make them admin, you need to update the database directly');
    console.error('');
    console.error('SQL command to run:');
    console.error(`UPDATE users SET roles = '["admin"]' WHERE email_address = '${email}';`);
    console.error('');
    console.error('You can execute this via:');
    console.error('- Wrangler CLI access to the Durable Object');
    console.error('- A database admin tool');
    console.error('- The /admin API endpoint (if implemented)');
  }
}

/**
 * Verify admin access
 */
async function verifyAdminAccess() {
  try {
    console.log('');
    console.log('Verifying admin access...');

    // Try to login
    const loginResponse = await fetch(`${apiUrl}/schema-registry/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      },
      credentials: 'include',
      body: JSON.stringify({
        emailAddress: email,
        password: password
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const roles = loginData.user.roles;

    console.log('✓ Login successful');
    console.log(`  Roles: ${JSON.stringify(roles)}`);

    if (roles.includes('admin')) {
      console.log('✓ User has admin role');
    } else {
      console.log('⚠ User does NOT have admin role yet');
      console.log('  Please follow manual steps above to grant admin role');
    }

    return loginData.user;
  } catch (error) {
    console.error('⚠ Could not verify admin access');
    console.error('Error:', error.message);
  }
}

// Run the script
(async () => {
  try {
    console.log('Make sure the API server is running:');
    console.log('  npx wrangler dev --port 8789');
    console.log('');

    await registerUser();
    await updateToAdmin();
    await verifyAdminAccess();

    console.log('');
    console.log('Admin user creation complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. If role update failed, follow manual steps above');
    console.log('  2. Login with:');
    console.log(`     Email: ${email}`);
    console.log(`     Password: ${password}`);
    console.log('  3. Verify admin access in the application');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('Script failed. Please check the error messages above.');
    process.exit(1);
  }
})();
