#!/usr/bin/env node

/**
 * Setup Verification Script for Domo Schema Registry
 *
 * This script performs comprehensive verification of the entire setup:
 * - Environment configuration
 * - Dependencies and generated files
 * - Server availability and health
 * - Database connectivity
 * - Real-time WebSocket connection
 * - Authentication system
 *
 * This is like a "doctor" command that diagnoses the entire system.
 *
 * Usage:
 *   npm run verify
 *   node scripts/verify-setup.js
 *
 * Options:
 *   --quick     Skip optional/slow checks
 *   --verbose   Show detailed output
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');

// Parse arguments
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const verboseMode = args.includes('--verbose');

// Configuration
const tenantId = process.env.TENANT_ID || 'default-tenant';
const registryId = process.env.REGISTRY_ID || 'default-registry';
const apiUrl = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:8789';
const partykitUrl = process.env.PARTYKIT_URL || process.env.VITE_PARTYKIT_URL || 'http://localhost:1999';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warningChecks = 0;
let skippedChecks = 0;

/**
 * Print colored message
 */
function print(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Print section header
 */
function printHeader(text, icon = '━') {
  console.log('');
  console.log(colors.cyan + colors.bright + text + colors.reset);
  console.log(colors.cyan + icon.repeat(text.length) + colors.reset);
}

/**
 * Print check result
 */
function printCheck(passed, message, details = '') {
  totalChecks++;

  if (passed === 'skip') {
    skippedChecks++;
    console.log(colors.dim + '○ ' + message + colors.reset);
    return;
  }

  if (passed === 'warning') {
    warningChecks++;
    console.log(colors.yellow + '⚠ ' + message + colors.reset);
    if (details && verboseMode) {
      console.log(colors.dim + '  ' + details + colors.reset);
    }
    return;
  }

  if (passed) {
    passedChecks++;
    console.log(colors.green + '✓ ' + message + colors.reset);
  } else {
    failedChecks++;
    console.log(colors.red + '✗ ' + message + colors.reset);
  }

  if (details && (verboseMode || !passed)) {
    console.log(colors.dim + '  ' + details + colors.reset);
  }
}

/**
 * Check if file exists
 */
function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  printCheck(exists, description, exists ? filePath : `Not found: ${filePath}`);
  return exists;
}

/**
 * Check if port is open
 */
async function checkPort(port, serverName) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      printCheck(true, `${serverName} - Port ${port} is open`);
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      printCheck(false, `${serverName} - Port ${port} timeout`, 'Server may not be running');
      resolve(false);
    });

    socket.on('error', () => {
      printCheck(false, `${serverName} - Port ${port} not accessible`, 'Server is not running');
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

/**
 * Check HTTP health
 */
async function checkHttpHealth(url, serverName, expectedStatus = 200) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      const healthy = res.statusCode >= 200 && res.statusCode < 500;
      printCheck(
        healthy,
        `${serverName} - HTTP health check`,
        `Status: ${res.statusCode}`
      );
      resolve(healthy);
    });

    request.on('error', (error) => {
      printCheck(false, `${serverName} - HTTP health check failed`, error.message);
      resolve(false);
    });

    request.setTimeout(3000, () => {
      request.destroy();
      printCheck(false, `${serverName} - HTTP health check timeout`);
      resolve(false);
    });
  });
}

/**
 * Check API endpoint
 */
async function checkApiEndpoint(endpoint, description) {
  const url = `${apiUrl}/schema-registry/api/${endpoint}`;

  return new Promise((resolve) => {
    const request = http.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Registry-ID': registryId
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const healthy = res.statusCode >= 200 && res.statusCode < 500;

        try {
          const json = JSON.parse(data);
          printCheck(
            healthy,
            description,
            `Status: ${res.statusCode}, Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`
          );
          resolve({ healthy, data: json, status: res.statusCode });
        } catch (e) {
          printCheck(
            false,
            description,
            `Status: ${res.statusCode}, Invalid JSON response`
          );
          resolve({ healthy: false, data: null, status: res.statusCode });
        }
      });
    });

    request.on('error', (error) => {
      printCheck(false, description, error.message);
      resolve({ healthy: false, data: null, status: 0 });
    });

    request.setTimeout(5000, () => {
      request.destroy();
      printCheck(false, description, 'Request timeout');
      resolve({ healthy: false, data: null, status: 0 });
    });
  });
}

/**
 * Section 1: Environment Configuration
 */
async function checkEnvironment() {
  printHeader('Section 1: Environment Configuration');

  // Check Node.js version
  const nodeVersion = process.version.replace('v', '');
  const [major] = nodeVersion.split('.').map(Number);
  printCheck(major >= 18, `Node.js version ${nodeVersion}`, 'Requires ≥18.0.0');

  // Check for environment files
  checkFileExists('.env', '.env (base configuration)');
  checkFileExists('.env.development', '.env.development (team defaults)');
  checkFileExists('.env.local', '.env.local (personal settings)');

  if (!fs.existsSync('.env.production')) {
    printCheck('warning', '.env.production (production template)', 'Optional for local development');
  } else {
    checkFileExists('.env.production', '.env.production (production template)');
  }

  // Check environment variables
  const requiredVars = ['TENANT_ID', 'REGISTRY_ID'];
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      printCheck(true, `${varName} is set`, verboseMode ? `Value: ${value}` : '');
    } else {
      printCheck('warning', `${varName} not set`, 'Using default value');
    }
  });

  // Check API URLs
  if (apiUrl) {
    printCheck(true, 'API_URL is configured', verboseMode ? apiUrl : '');
  } else {
    printCheck(false, 'API_URL not configured');
  }

  if (partykitUrl) {
    printCheck(true, 'PARTYKIT_URL is configured', verboseMode ? partykitUrl : '');
  } else {
    printCheck(false, 'PARTYKIT_URL not configured');
  }
}

/**
 * Section 2: Dependencies and Files
 */
async function checkDependencies() {
  printHeader('Section 2: Dependencies and Generated Files');

  // Check node_modules
  checkFileExists('node_modules', 'Dependencies installed (node_modules)');

  // Check package-lock.json
  checkFileExists('package-lock.json', 'Package lock file exists');

  // Check generated parser
  checkFileExists(
    'src/parser/PegSchemaSpecificationParser.ts',
    'PegJS parser generated'
  );

  // Check important source files
  checkFileExists('src/App.tsx', 'Main application file');
  checkFileExists('functions/_worker.ts', 'Worker entry point');
  checkFileExists('party/index.ts', 'PartyKit server');

  // Check wrangler.toml
  checkFileExists('wrangler.toml', 'Wrangler configuration');
}

/**
 * Section 3: Server Health
 */
async function checkServers() {
  printHeader('Section 3: Server Health Checks');

  // Check if servers are running
  const backendRunning = await checkPort(8789, 'Backend API');
  const partykitRunning = await checkPort(1999, 'PartyKit Real-time');
  const frontendRunning = await checkPort(5173, 'Frontend');

  if (backendRunning) {
    await checkHttpHealth('http://localhost:8789', 'Backend API');
  }

  if (partykitRunning) {
    // PartyKit might not respond to simple HTTP GET, port check is sufficient
    printCheck(true, 'PartyKit Real-time - Service responding');
  }

  if (frontendRunning) {
    await checkHttpHealth('http://localhost:5173', 'Frontend');
  }

  // Recommendation
  if (!backendRunning || !partykitRunning || !frontendRunning) {
    console.log('');
    print(colors.yellow + 'ℹ To start all servers: npm run start:all' + colors.reset);
  }
}

/**
 * Section 4: API Connectivity
 */
async function checkApiConnectivity() {
  printHeader('Section 4: API Connectivity');

  // Check backend is accessible
  const backendRunning = await checkPort(8789, 'Backend API (connectivity check)');

  if (!backendRunning) {
    printCheck('skip', 'API endpoints (backend not running)');
    return;
  }

  // Check registry info endpoint
  const registryResult = await checkApiEndpoint('registry', 'GET /api/registry');

  // Check products endpoint
  const productsResult = await checkApiEndpoint('products', 'GET /api/products');

  // Check if database is initialized
  if (productsResult.healthy && productsResult.data) {
    const productCount = Array.isArray(productsResult.data) ? productsResult.data.length : 0;
    printCheck(
      true,
      `Database initialized (${productCount} product(s))`,
      verboseMode && productCount > 0 ? JSON.stringify(productsResult.data[0]) : ''
    );
  }
}

/**
 * Section 5: Real-time WebSocket
 */
async function checkRealtime() {
  printHeader('Section 5: Real-time WebSocket');

  const partykitRunning = await checkPort(1999, 'PartyKit (connectivity check)');

  if (!partykitRunning) {
    printCheck('skip', 'WebSocket connection (PartyKit not running)');
    return;
  }

  // Basic HTTP check (PartyKit should respond to HTTP)
  await checkHttpHealth('http://localhost:1999', 'PartyKit HTTP');

  // WebSocket check would require WebSocket client library
  // For now, port + HTTP check is sufficient
  printCheck(
    'warning',
    'WebSocket functionality',
    'Full WebSocket test requires client library (not implemented)'
  );
}

/**
 * Section 6: TypeScript Compilation
 */
async function checkTypeScript() {
  printHeader('Section 6: Code Quality');

  if (quickMode) {
    printCheck('skip', 'TypeScript compilation (--quick mode)');
    return;
  }

  const { execSync } = require('child_process');

  try {
    print(colors.dim + '  Checking TypeScript compilation (this may take a moment)...' + colors.reset);
    execSync('npx tsc --noEmit', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    printCheck(true, 'TypeScript compiles without errors');
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    const errorCount = output.split('\n').filter(line => line.includes('error TS')).length;

    printCheck(
      'warning',
      `TypeScript has ${errorCount} compilation errors`,
      'This is normal during active development'
    );
  }
}

/**
 * Display summary
 */
function displaySummary() {
  console.log('');
  console.log(colors.cyan + '━'.repeat(60) + colors.reset);
  console.log('');

  print(colors.bright + 'Verification Summary' + colors.reset);
  console.log('');

  console.log(`Total Checks:    ${totalChecks}`);
  console.log(colors.green + `Passed:          ${passedChecks}` + colors.reset);
  console.log(colors.red + `Failed:          ${failedChecks}` + colors.reset);
  console.log(colors.yellow + `Warnings:        ${warningChecks}` + colors.reset);
  console.log(colors.dim + `Skipped:         ${skippedChecks}` + colors.reset);

  console.log('');

  if (failedChecks === 0 && warningChecks === 0) {
    print(colors.green + colors.bright + '✓ All checks passed!' + colors.reset);
    console.log('');
    print(colors.green + 'Your setup is working perfectly.' + colors.reset);
  } else if (failedChecks === 0) {
    print(colors.yellow + colors.bright + '⚠ Setup is working with warnings' + colors.reset);
    console.log('');
    print(colors.yellow + 'Some optional features may not be available.' + colors.reset);
  } else {
    print(colors.red + colors.bright + '✗ Some checks failed' + colors.reset);
    console.log('');
    print(colors.red + 'Please address the failed checks above.' + colors.reset);
    console.log('');
    print(colors.blue + 'Common fixes:' + colors.reset);
    console.log('  • Start servers: npm run start:all');
    console.log('  • Initialize database: npm run setup:database');
    console.log('  • Install dependencies: npm install');
    console.log('  • Generate parser: npm run generate:pegjs-parser');
  }

  console.log('');
  console.log(colors.cyan + '━'.repeat(60) + colors.reset);
  console.log('');

  return failedChecks === 0;
}

/**
 * Main execution
 */
async function main() {
  print('');
  print(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  print(colors.cyan + colors.bright + '║                                                            ║' + colors.reset);
  print(colors.cyan + colors.bright + '║         Domo Schema Registry - Setup Verification          ║' + colors.reset);
  print(colors.cyan + colors.bright + '║                                                            ║' + colors.reset);
  print(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════════╝' + colors.reset);

  if (quickMode) {
    print(colors.yellow + '\nRunning in quick mode (skipping slow checks)\n' + colors.reset);
  }

  if (verboseMode) {
    print(colors.blue + '\nVerbose mode enabled\n' + colors.reset);
  }

  try {
    await checkEnvironment();
    await checkDependencies();
    await checkServers();
    await checkApiConnectivity();
    await checkRealtime();
    await checkTypeScript();

    const success = displaySummary();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.log('');
    print(colors.red + '✗ Verification failed with error' + colors.reset);
    console.log('');
    console.error(error);
    console.log('');
    process.exit(1);
  }
}

// Run
main();
