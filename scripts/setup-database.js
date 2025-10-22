#!/usr/bin/env node

/**
 * Database Setup Script for Schema Minder
 *
 * This script provides a comprehensive database setup process:
 * 1. Checks if backend server is running
 * 2. Initializes the database schema (triggers Durable Object creation)
 * 3. Verifies database is accessible
 * 4. Creates admin user interactively or from environment variables
 * 5. Verifies admin user can login
 *
 * Usage:
 *   npm run setup:database
 *   node scripts/setup-database.js
 *
 * Non-interactive mode (for CI/CD):
 *   node scripts/setup-database.js --non-interactive \
 *     --admin-email=admin@example.com \
 *     --admin-password=SecurePass123! \
 *     --admin-name="Administrator"
 *
 * Environment Variables:
 *   TENANT_ID       - Tenant identifier (default: default-tenant)
 *   REGISTRY_ID     - Registry identifier (default: default-registry)
 *   API_URL         - API endpoint (default: http://localhost:8789)
 *   ADMIN_EMAIL     - Admin email (used if --non-interactive)
 *   ADMIN_PASSWORD  - Admin password (used if --non-interactive)
 *   ADMIN_FULL_NAME - Admin full name (used if --non-interactive)
 */

const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const nonInteractive = args.includes('--non-interactive');
const adminEmail = args.find(a => a.startsWith('--admin-email='))?.split('=')[1] || process.env.ADMIN_EMAIL;
const adminPassword = args.find(a => a.startsWith('--admin-password='))?.split('=')[1] || process.env.ADMIN_PASSWORD;
const adminName = args.find(a => a.startsWith('--admin-name='))?.split('=')[1] || process.env.ADMIN_FULL_NAME;

// Configuration
const tenantId = process.env.TENANT_ID || 'default-tenant';
const registryId = process.env.REGISTRY_ID || 'default-registry';
const apiUrl = process.env.API_URL || 'http://localhost:8789';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Print colored message
 */
function print(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Print success message
 */
function printSuccess(message) {
  console.log(colors.green + '✓ ' + message + colors.reset);
}

/**
 * Print error message
 */
function printError(message) {
  console.log(colors.red + '✗ ' + message + colors.reset);
}

/**
 * Print warning message
 */
function printWarning(message) {
  console.log(colors.yellow + '⚠ ' + message + colors.reset);
}

/**
 * Print info message
 */
function printInfo(message) {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

/**
 * Print section header
 */
function printHeader(text) {
  console.log('');
  console.log(colors.cyan + colors.bright + text + colors.reset);
  console.log(colors.cyan + '='.repeat(text.length) + colors.reset);
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Step 1: Check if backend server is running
 */
async function checkBackendServer() {
  printHeader('Step 1: Backend Server Check');

  try {
    const response = await fetch(`${apiUrl}/schema-registry/api/registry`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      }
    });

    if (response.ok) {
      printSuccess('Backend server is running');
      return true;
    } else {
      printError(`Backend server returned HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    printError('Backend server is not accessible');
    console.log('');
    printInfo('Please start the backend server first:');
    console.log('  ' + colors.dim + 'npx wrangler dev --port 8789' + colors.reset);
    console.log('');
    printInfo('Or start all servers:');
    console.log('  ' + colors.dim + 'npm run start:all' + colors.reset);
    return false;
  }
}

/**
 * Step 2: Initialize database schema
 */
async function initializeDatabase() {
  printHeader('Step 2: Database Initialization');

  try {
    printInfo('Initializing database schema...');

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

    printSuccess('Database schema initialized');
    console.log('');
    console.log('Registry Information:');
    console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);

    return data;
  } catch (error) {
    printError('Failed to initialize database');
    console.log('');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 3: Verify database is accessible
 */
async function verifyDatabase() {
  printHeader('Step 3: Database Verification');

  try {
    printInfo('Verifying database tables...');

    const response = await fetch(`${apiUrl}/schema-registry/api/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const products = await response.json();

    printSuccess('Database is accessible');
    printInfo(`Found ${products.length} product(s) in registry`);

    return products;
  } catch (error) {
    printError('Database verification failed');
    console.log('');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 4: Get admin user credentials
 */
async function getAdminCredentials() {
  printHeader('Step 4: Admin User Setup');

  let email, password, fullName;

  if (nonInteractive) {
    email = adminEmail;
    password = adminPassword;
    fullName = adminName;

    if (!email || !password || !fullName) {
      printError('Non-interactive mode requires admin credentials');
      console.log('');
      printInfo('Provide via command line:');
      console.log('  --admin-email=admin@example.com');
      console.log('  --admin-password=SecurePass123!');
      console.log('  --admin-name="Administrator"');
      console.log('');
      printInfo('Or via environment variables:');
      console.log('  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME');
      throw new Error('Missing admin credentials');
    }

    printInfo('Using credentials from command line/environment');
  } else {
    console.log('');
    printInfo('Please provide admin user credentials:');
    console.log('');

    email = await prompt('Admin email: ');
    if (!email) {
      throw new Error('Admin email is required');
    }

    password = await prompt('Admin password: ');
    if (!password) {
      throw new Error('Admin password is required');
    }

    fullName = await prompt('Admin full name: ');
    if (!fullName) {
      throw new Error('Admin full name is required');
    }
  }

  console.log('');
  printInfo(`Creating admin user: ${email}`);

  return { email, password, fullName };
}

/**
 * Step 5: Register admin user
 */
async function registerAdminUser(email, password, fullName) {
  printHeader('Step 5: Admin User Registration');

  try {
    printInfo('Registering admin user...');

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
      const errorData = await response.json().catch(() => ({}));

      // Check if user already exists
      if (errorData.error?.includes('already exists') || errorData.error?.includes('UNIQUE constraint')) {
        printWarning('User already exists');
        printInfo('Attempting to verify existing user...');
        return { alreadyExists: true };
      }

      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    printSuccess('Admin user registered successfully');
    printInfo(`User ID: ${data.user.id}`);

    return { user: data.user, alreadyExists: false };
  } catch (error) {
    printError('Failed to register admin user');
    console.log('');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 6: Update user role to admin
 */
async function updateToAdmin(email) {
  printHeader('Step 6: Admin Role Assignment');

  try {
    printInfo('Updating user role to admin...');

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

      // If endpoint doesn't exist, provide manual instructions
      if (response.status === 404 || errorText.includes('not found')) {
        printWarning('Admin role endpoint not available');
        console.log('');
        printInfo('Manual SQL update required:');
        console.log(colors.yellow + '━'.repeat(60) + colors.reset);
        console.log(`UPDATE users SET roles = '["admin"]' WHERE email_address = '${email}';`);
        console.log(colors.yellow + '━'.repeat(60) + colors.reset);
        console.log('');
        printInfo('This endpoint will be implemented in Phase 8');
        return { manual: true };
      }

      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    printSuccess('User role updated to admin');

    return { manual: false };
  } catch (error) {
    printWarning('Could not automatically update role to admin');
    console.log('');
    printInfo('Manual SQL update required:');
    console.log(colors.yellow + '━'.repeat(60) + colors.reset);
    console.log(`UPDATE users SET roles = '["admin"]' WHERE email_address = '${email}';`);
    console.log(colors.yellow + '━'.repeat(60) + colors.reset);
    console.log('');
    return { manual: true };
  }
}

/**
 * Step 7: Verify admin login
 */
async function verifyAdminLogin(email, password) {
  printHeader('Step 7: Admin Login Verification');

  try {
    printInfo('Verifying admin can login...');

    const response = await fetch(`${apiUrl}/schema-registry/api/auth/login`, {
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

    if (!response.ok) {
      throw new Error(`Login failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const roles = data.user.roles;

    printSuccess('Login successful');
    printInfo(`User roles: ${JSON.stringify(roles)}`);

    if (roles.includes('admin')) {
      printSuccess('User has admin role');
      return { hasAdmin: true };
    } else {
      printWarning('User does NOT have admin role yet');
      printInfo('Please complete the manual SQL update above');
      return { hasAdmin: false };
    }
  } catch (error) {
    printWarning('Could not verify admin login');
    console.log('');
    console.error('Error:', error.message);
    return { hasAdmin: false };
  }
}

/**
 * Display summary
 */
function displaySummary(email, hasAdminRole, manualUpdateRequired) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset);
  console.log('');

  if (hasAdminRole && !manualUpdateRequired) {
    print(colors.green + colors.bright + '✓ Database Setup Complete!' + colors.reset);
    console.log('');
    printInfo('Your admin user is ready:');
    console.log(`  Email: ${email}`);
    console.log('');
    printInfo('You can now login to the application');
  } else if (manualUpdateRequired) {
    print(colors.yellow + colors.bright + '⚠ Database Setup Partially Complete' + colors.reset);
    console.log('');
    printInfo('User created, but manual SQL update required for admin role');
    console.log('');
    printInfo('Next steps:');
    console.log('  1. Run the SQL command shown above');
    console.log('  2. Verify admin access by logging in');
  } else {
    print(colors.green + colors.bright + '✓ Database Setup Complete!' + colors.reset);
    console.log('');
    printInfo('Database initialized and user created');
  }

  console.log('');
  print(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset);
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  print('');
  print(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  print(colors.cyan + colors.bright + '║                                                            ║' + colors.reset);
  print(colors.cyan + colors.bright + '║         Schema Minder - Database Setup              ║' + colors.reset);
  print(colors.cyan + colors.bright + '║                                                            ║' + colors.reset);
  print(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════════╝' + colors.reset);
  print('');
  printInfo(`Tenant: ${tenantId}`);
  printInfo(`Registry: ${registryId}`);
  printInfo(`API URL: ${apiUrl}`);

  try {
    // Step 1: Check backend
    const backendRunning = await checkBackendServer();
    if (!backendRunning) {
      process.exit(1);
    }

    // Step 2: Initialize database
    await initializeDatabase();

    // Step 3: Verify database
    await verifyDatabase();

    // Step 4: Get admin credentials
    const { email, password, fullName } = await getAdminCredentials();

    // Step 5: Register admin user
    const { alreadyExists } = await registerAdminUser(email, password, fullName);

    // Step 6: Update to admin role
    const { manual: manualUpdateRequired } = await updateToAdmin(email);

    // Step 7: Verify admin login
    const { hasAdmin } = await verifyAdminLogin(email, password);

    // Display summary
    displaySummary(email, hasAdmin, manualUpdateRequired);

    process.exit(hasAdmin ? 0 : 1);
  } catch (error) {
    console.log('');
    printError('Database setup failed');
    console.log('');
    console.error('Error:', error.message);
    console.log('');
    process.exit(1);
  }
}

// Run
main();
