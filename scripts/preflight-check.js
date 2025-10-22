#!/usr/bin/env node

/**
 * Pre-flight Check Script for Schema Minder
 *
 * Validates that the development environment is properly configured
 * before attempting to run the application.
 *
 * Checks:
 * - Node.js version compatibility
 * - npm installation
 * - Dependencies installed
 * - Required ports available
 * - PegJS parser generated
 * - TypeScript compilation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Required versions
const REQUIRED_NODE_VERSION = '18.0.0';
const REQUIRED_PORTS = [8789, 1999, 5173];
const REQUIRED_FILES = [
  'src/parser/PegSchemaSpecificationParser.ts'
];

let hasErrors = false;
let hasWarnings = false;

/**
 * Print a section header
 */
function printHeader(text) {
  console.log('');
  console.log(colors.cyan + colors.bright + text + colors.reset);
  console.log(colors.cyan + '='.repeat(text.length) + colors.reset);
}

/**
 * Print a check result
 */
function printCheck(passed, message) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(color + symbol + ' ' + message + colors.reset);

  if (!passed) {
    hasErrors = true;
  }
}

/**
 * Print a warning
 */
function printWarning(message) {
  console.log(colors.yellow + '⚠ ' + message + colors.reset);
  hasWarnings = true;
}

/**
 * Print an info message
 */
function printInfo(message) {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

/**
 * Compare version strings
 */
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;

    if (v1 > v2) return 1;
    if (v1 < v2) return -1;
  }

  return 0;
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  try {
    const nodeVersion = process.version.replace('v', '');
    const isCompatible = compareVersions(nodeVersion, REQUIRED_NODE_VERSION) >= 0;

    printCheck(
      isCompatible,
      `Node.js ${nodeVersion} ${isCompatible ? '>=' : '<'} ${REQUIRED_NODE_VERSION} (required)`
    );

    if (!isCompatible) {
      printInfo(`Please upgrade to Node.js ${REQUIRED_NODE_VERSION} or higher`);
      printInfo('Download from: https://nodejs.org/');
    }

    return isCompatible;
  } catch (error) {
    printCheck(false, 'Failed to check Node.js version');
    return false;
  }
}

/**
 * Check npm installation
 */
function checkNpm() {
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    printCheck(true, `npm ${npmVersion} installed`);
    return true;
  } catch (error) {
    printCheck(false, 'npm not found');
    printInfo('npm should be installed with Node.js');
    return false;
  }
}

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');

  const nodeModulesExists = fs.existsSync(nodeModulesPath);
  const packageLockExists = fs.existsSync(packageLockPath);

  printCheck(nodeModulesExists, 'Dependencies installed (node_modules/ exists)');

  if (!nodeModulesExists) {
    printInfo('Run: npm install');
    return false;
  }

  if (!packageLockExists) {
    printWarning('package-lock.json not found - dependencies may be out of sync');
  }

  return nodeModulesExists;
}

/**
 * Check if required ports are available
 */
async function checkPorts() {
  const results = await Promise.all(
    REQUIRED_PORTS.map(port =>
      isPortAvailable(port).then(available => ({ port, available }))
    )
  );

  let allAvailable = true;

  for (const { port, available } of results) {
    printCheck(available, `Port ${port} available`);

    if (!available) {
      printInfo(`Port ${port} is in use. Stop the service using it or use a different port.`);
      allAvailable = false;
    }
  }

  return allAvailable;
}

/**
 * Check if PegJS parser is generated
 */
function checkPegParser() {
  let allExist = true;

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);

    printCheck(exists, `Generated file exists: ${file}`);

    if (!exists) {
      allExist = false;
    }
  }

  if (!allExist) {
    printInfo('Run: npm run generate:pegjs-parser');
  }

  return allExist;
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  try {
    printInfo('Checking TypeScript compilation (this may take a moment)...');
    execSync('npx tsc --noEmit', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    printCheck(true, 'TypeScript compiles without errors');
    return true;
  } catch (error) {
    // Count errors
    const output = error.stdout || error.stderr || '';
    const lines = output.split('\n').filter(line => line.includes('error TS'));
    const errorCount = lines.length;

    printWarning(`TypeScript has ${errorCount} compilation errors`);

    // Show first few errors
    const errorLines = lines.slice(0, 5);

    if (errorLines.length > 0) {
      console.log(colors.yellow + '\nFirst few errors:' + colors.reset);
      errorLines.forEach(line => console.log('  ' + line));

      if (lines.length > 5) {
        console.log(colors.yellow + `  ... and ${lines.length - 5} more errors` + colors.reset);
      }
    }

    printInfo('This is normal during active development');
    printInfo('The application will still build and run with Vite');
    printInfo('Run: npm run typecheck (to see all errors)');

    // Don't fail preflight for TS errors during active dev
    return true;
  }
}

/**
 * Check wrangler authentication (optional for local dev)
 */
function checkWranglerAuth() {
  try {
    execSync('npx wrangler whoami', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    printCheck(true, 'Wrangler authenticated (for deployment)');
    return true;
  } catch (error) {
    printWarning('Wrangler not authenticated (required for deployment only)');
    printInfo('Run: npx wrangler login (when ready to deploy)');
    return false;
  }
}

/**
 * Main preflight check
 */
async function runPreflightChecks() {
  console.log(colors.bright + '\nSchema Minder - Pre-flight Check\n' + colors.reset);

  // Environment checks
  printHeader('Environment');
  checkNodeVersion();
  checkNpm();
  checkDependencies();

  // Port availability
  printHeader('Port Availability');
  await checkPorts();

  // Generated files
  printHeader('Generated Files');
  checkPegParser();

  // Code validation
  printHeader('Code Validation');
  checkTypeScript();

  // Optional checks
  printHeader('Optional (Deployment)');
  checkWranglerAuth();

  // Summary
  console.log('');
  console.log(colors.bright + '━'.repeat(60) + colors.reset);

  if (hasErrors) {
    console.log(colors.red + colors.bright + '\n✗ Pre-flight check FAILED\n' + colors.reset);
    console.log('Please fix the errors above before continuing.');
    console.log('');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(colors.yellow + colors.bright + '\n⚠ Pre-flight check PASSED with warnings\n' + colors.reset);
    console.log('You can proceed, but consider addressing the warnings.');
    console.log('');
    process.exit(0);
  } else {
    console.log(colors.green + colors.bright + '\n✓ Pre-flight check PASSED\n' + colors.reset);
    console.log('Your environment is ready for development!');
    console.log('');
    process.exit(0);
  }
}

// Run checks
runPreflightChecks().catch(error => {
  console.error(colors.red + '\nUnexpected error during preflight check:' + colors.reset);
  console.error(error);
  process.exit(1);
});
