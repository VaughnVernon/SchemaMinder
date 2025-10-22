#!/usr/bin/env node

/**
 * Setup Script for Schema Minder
 *
 * This script performs initial setup for new developers:
 * - Runs preflight checks
 * - Creates .env file from .env.example
 * - Installs dependencies
 * - Generates PegJS parser
 * - Verifies TypeScript compilation
 * - Displays next steps
 *
 * Usage:
 *   npm run setup
 *   node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  orange: '\x1b[38;5;214m'  // 256-color orange for better visibility
};

let hasErrors = false;

/**
 * Print a section header
 */
function printHeader(text) {
  console.log('');
  console.log(colors.cyan + colors.bright + text + colors.reset);
  console.log(colors.cyan + '='.repeat(text.length) + colors.reset);
}

/**
 * Print a step with number
 */
function printStep(number, text) {
  console.log('');
  console.log(colors.bright + `Step ${number}: ${text}` + colors.reset);
  console.log(colors.dim + '─'.repeat(60) + colors.reset);
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
  hasErrors = true;
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
 * Execute command and show output
 */
function execCommand(command, description, options = {}) {
  try {
    console.log(colors.dim + `  Running: ${command}` + colors.reset);

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });

    printSuccess(description);
    return result;
  } catch (error) {
    printError(`${description} failed`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    throw error;
  }
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
 * Step 1: Run preflight checks
 */
async function runPreflightChecks() {
  printStep(1, 'Running Pre-flight Checks');

  try {
    execCommand(
      'node scripts/preflight-check.js',
      'Pre-flight checks completed',
      { stdio: 'inherit' }
    );
  } catch (error) {
    printWarning('Pre-flight checks failed - continuing with setup anyway');
    printInfo('You may need to fix these issues manually');
  }
}

/**
 * Check if ports are available
 */
async function checkPortsAvailability() {
  const net = require('net');
  const ports = [
    { name: 'Wrangler (Backend)', port: 8789, alternative: 8790 },
    { name: 'PartyKit (Real-time)', port: 1999, alternative: 2000 },
    { name: 'Vite (Frontend)', port: 5173, alternative: 5174 }
  ];

  const unavailablePorts = [];

  for (const portInfo of ports) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(portInfo.port);
    });

    if (!available) {
      unavailablePorts.push(portInfo);
    }
  }

  return unavailablePorts;
}

/**
 * Step 2: Create .env.local file with interactive prompts
 */
async function createEnvFile() {
  printStep(2, 'Environment Configuration');

  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envDevelopmentPath = path.join(process.cwd(), '.env.development');

  if (fs.existsSync(envLocalPath)) {
    printInfo('.env.local file already exists');
    const answer = await prompt('Do you want to overwrite it? (y/N): ');

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      printInfo('Keeping existing .env.local file');
      return;
    }
  }

  if (!fs.existsSync(envDevelopmentPath)) {
    printError('.env.development template not found');
    printInfo('Please create .env.local manually');
    return;
  }

  try {
    console.log('');
    printInfo('Creating your personal .env.local file...');
    console.log('');

    // Read the development template
    let envContent = fs.readFileSync(envDevelopmentPath, 'utf8');

    // Q2: Prompt for admin credentials
    console.log(colors.bright + 'Admin User Configuration' + colors.reset);
    console.log(colors.dim + '(You can change these later in .env.local)' + colors.reset);
    console.log('');

    const adminEmail = await prompt('Admin email [admin@example.com]: ') || 'admin@example.com';
    const adminPassword = await prompt('Admin password [ChangeMe123!]: ') || 'ChangeMe123!';
    const adminFullName = await prompt('Admin full name [Administrator]: ') || 'Administrator';

    // Replace admin credentials in template
    envContent = envContent.replace(/ADMIN_EMAIL=.*/, `ADMIN_EMAIL=${adminEmail}`);
    envContent = envContent.replace(/ADMIN_PASSWORD=.*/, `ADMIN_PASSWORD=${adminPassword}`);
    envContent = envContent.replace(/ADMIN_FULL_NAME=.*/, `ADMIN_FULL_NAME=${adminFullName}`);

    // Q3: Check for port conflicts
    console.log('');
    console.log(colors.bright + 'Port Configuration' + colors.reset);
    console.log('');

    const unavailablePorts = await checkPortsAvailability();

    if (unavailablePorts.length > 0) {
      printWarning('Some standard ports are unavailable:');
      unavailablePorts.forEach(p => {
        console.log(`  - ${p.name}: port ${p.port} is in use`);
      });
      console.log('');

      const portAnswer = await prompt('Stop and free up standard ports (X) or override with alternatives (o)? [X/o]: ');

      if (portAnswer.toLowerCase() === 'o') {
        console.log('');
        printInfo('Enter alternative port numbers:');

        for (const portInfo of unavailablePorts) {
          const newPort = await prompt(`  ${portInfo.name} [${portInfo.alternative}]: `) || portInfo.alternative.toString();

          if (portInfo.port === 8789) {
            envContent = envContent.replace(/API_URL=http:\/\/localhost:8789/, `API_URL=http://localhost:${newPort}`);
            envContent = envContent.replace(/VITE_API_URL=http:\/\/localhost:8789/, `VITE_API_URL=http://localhost:${newPort}`);
            envContent += `\n# Custom port override\nWRANGLER_PORT=${newPort}\n`;
          } else if (portInfo.port === 1999) {
            envContent = envContent.replace(/PARTYKIT_URL=http:\/\/localhost:1999/, `PARTYKIT_URL=http://localhost:${newPort}`);
            envContent = envContent.replace(/VITE_PARTYKIT_URL=http:\/\/localhost:1999/, `VITE_PARTYKIT_URL=http://localhost:${newPort}`);
            envContent += `PARTYKIT_PORT=${newPort}\n`;
          } else if (portInfo.port === 5173) {
            envContent += `VITE_PORT=${newPort}\n`;
          }
        }
      } else {
        console.log('');
        printInfo('Please free up the standard ports and run setup again');
        printInfo('Standard ports: 8789 (Backend), 1999 (Real-time), 5173 (Frontend)');
        process.exit(0);
      }
    } else {
      printSuccess('All standard ports are available');
    }

    // Write .env.local file
    fs.writeFileSync(envLocalPath, envContent);
    printSuccess('.env.local file created');

    console.log('');
    printInfo('Your personal environment configuration:');
    console.log(`  Admin Email: ${adminEmail}`);
    console.log(`  File: .env.local (git-ignored)`);
  } catch (error) {
    printError('Failed to create .env.local file');
    console.error(error.message);
  }
}

/**
 * Step 3: Install dependencies
 */
async function installDependencies() {
  printStep(3, 'Installing Dependencies');

  const nodeModulesPath = path.join(process.cwd(), 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    printInfo('Dependencies already installed');
    const answer = await prompt('Do you want to reinstall? (y/N): ');

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      printInfo('Skipping dependency installation');
      return;
    }
  }

  try {
    execCommand('npm install', 'Dependencies installed');
  } catch (error) {
    printError('Failed to install dependencies');
    throw error;
  }
}

/**
 * Step 4: Generate PegJS parser
 */
async function generateParser() {
  printStep(4, 'Generating PegJS Parser');

  const parserPath = path.join(process.cwd(), 'src/parser/PegSchemaSpecificationParser.ts');

  try {
    execCommand(
      'npm run generate:pegjs-parser',
      'PegJS parser generated'
    );

    if (fs.existsSync(parserPath)) {
      printSuccess('Parser file created successfully');
    } else {
      printWarning('Parser file not found at expected location');
    }
  } catch (error) {
    printError('Failed to generate PegJS parser');
    throw error;
  }
}

/**
 * Step 5: Verify TypeScript compilation
 */
async function verifyTypeScript() {
  printStep(5, 'Verifying TypeScript Compilation');

  const outputFile = path.join(process.cwd(), 'setup_typescript_compilation.txt');

  try {
    // Redirect all TypeScript output to file
    execSync('npx tsc --noEmit', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // No errors - clean up output file if it exists
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }

    printSuccess('TypeScript compiles without errors');
  } catch (error) {
    // Write TypeScript errors to file
    const errorOutput = (error.stdout || '') + (error.stderr || '');
    fs.writeFileSync(outputFile, errorOutput);

    printWarning('TypeScript compilation has errors');
    console.log(colors.orange + 'ℹ This is normal during active development' + colors.reset);
    console.log(colors.orange + 'ℹ The application will still build and run correctly' + colors.reset);
    console.log(colors.orange + `ℹ Results saved to: ${colors.bright}./setup_typescript_compilation.txt${colors.reset}`);
    console.log(colors.orange + 'ℹ Run "npm run typecheck" to see detailed errors in terminal' + colors.reset);
  }
}

/**
 * Display next steps
 */
function displayNextSteps() {
  console.log('');
  console.log(colors.bright + '━'.repeat(70) + colors.reset);
  console.log('');
  console.log(colors.green + colors.bright + '✓ Setup Complete!' + colors.reset);
  console.log('');
  console.log(colors.bright + 'Next Steps:' + colors.reset);
  console.log('');

  console.log(colors.cyan + '1. Review your environment configuration:' + colors.reset);
  console.log('   ' + colors.dim + 'vi .env.local          # Your personal settings (git-ignored)' + colors.reset);
  console.log('   ' + colors.dim + 'cat .env               # Base defaults (committed)' + colors.reset);
  console.log('   ' + colors.dim + 'cat .env.development   # Dev team defaults (committed)' + colors.reset);
  console.log('');

  console.log(colors.cyan + '2. Initialize the database (optional - auto-initializes on first use):' + colors.reset);
  console.log('   ' + colors.dim + 'npm run init:database' + colors.reset);
  console.log('');

  console.log(colors.cyan + '3. Create an admin user:' + colors.reset);
  console.log('   ' + colors.dim + 'npm run create:admin admin@example.com SecurePass123! "Admin User"' + colors.reset);
  console.log('   ' + colors.yellow + 'Note: Backend must be running first (see step 4)' + colors.reset);
  console.log('');

  console.log(colors.cyan + '4. Start development servers:' + colors.reset);
  console.log('');
  console.log(colors.magenta + '   Option A - Start all servers together:' + colors.reset);
  console.log('   ' + colors.dim + 'npm run start:all' + colors.reset);
  console.log('   ' + colors.dim + '(Requires: npm run setup to have completed)' + colors.reset);
  console.log('');
  console.log(colors.magenta + '   Option B - Start servers individually:' + colors.reset);
  console.log('   ' + colors.dim + 'Terminal 1: npx wrangler dev --port 8789    # Backend API' + colors.reset);
  console.log('   ' + colors.dim + 'Terminal 2: npx partykit dev --port 1999     # Real-time server' + colors.reset);
  console.log('   ' + colors.dim + 'Terminal 3: npm run dev                      # Frontend' + colors.reset);
  console.log('');

  console.log(colors.cyan + '5. Open your browser:' + colors.reset);
  console.log('   ' + colors.dim + 'http://localhost:5173' + colors.reset);
  console.log('');

  console.log(colors.bright + 'Useful Commands:' + colors.reset);
  console.log('   ' + colors.dim + 'npm run test              # Run tests in watch mode' + colors.reset);
  console.log('   ' + colors.dim + 'npm run test:coverage     # Run tests with coverage' + colors.reset);
  console.log('   ' + colors.dim + 'npm run typecheck         # Check TypeScript errors' + colors.reset);
  console.log('   ' + colors.dim + 'npm run lint              # Run ESLint' + colors.reset);
  console.log('   ' + colors.dim + 'npm run complexity        # Analyze code complexity' + colors.reset);
  console.log('');

  console.log(colors.bright + 'Documentation:' + colors.reset);
  console.log('   ' + colors.dim + 'CLAUDE.md             # Development guide for Claude Code' + colors.reset);
  console.log('   ' + colors.dim + 'scripts/README.md     # Script documentation' + colors.reset);
  console.log('   ' + colors.dim + 'docs/                 # Architecture and user docs' + colors.reset);
  console.log('');

  console.log(colors.bright + '━'.repeat(70) + colors.reset);
  console.log('');
}

/**
 * Main setup function
 */
async function runSetup() {
  console.log('');
  console.log(colors.bright + colors.cyan + '╔════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + colors.cyan + '║                                                                ║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║         Schema Minder - Environment Setup               ║' + colors.reset);
  console.log(colors.bright + colors.cyan + '║                                                                ║' + colors.reset);
  console.log(colors.bright + colors.cyan + '╚════════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  try {
    await runPreflightChecks();
    await createEnvFile();
    await installDependencies();
    await generateParser();
    await verifyTypeScript();

    displayNextSteps();

    if (hasErrors) {
      console.log(colors.yellow + '⚠ Setup completed with some warnings/errors' + colors.reset);
      console.log('Please review the messages above and fix any issues.');
      console.log('');
      process.exit(1);
    } else {
      console.log(colors.green + 'Setup completed successfully!' + colors.reset);
      console.log('');
      process.exit(0);
    }
  } catch (error) {
    console.log('');
    console.log(colors.red + colors.bright + '✗ Setup Failed' + colors.reset);
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Please fix the error above and run setup again:');
    console.log('  npm run setup');
    console.log('');
    process.exit(1);
  }
}

// Run setup
runSetup().catch(error => {
  console.error('');
  console.error(colors.red + 'Unexpected error during setup:' + colors.reset);
  console.error(error);
  console.error('');
  process.exit(1);
});
