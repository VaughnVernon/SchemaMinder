#!/usr/bin/env node

/**
 * Multi-Server Orchestration Script for Schema Minder
 *
 * Starts and monitors all three servers:
 * - Backend API (Wrangler/Cloudflare Worker) on port 8789
 * - Real-time server (PartyKit) on port 1999
 * - Frontend (Vite) on port 5173
 *
 * Features:
 * - Pre-flight port checks before starting
 * - Health checks to verify servers are ready
 * - Graceful shutdown on Ctrl+C
 * - Colored output for each server
 * - Clear status reporting
 *
 * Usage:
 *   npm run start:all
 *   node scripts/start-all.js
 */

const { spawn } = require('child_process');
const net = require('net');
const http = require('http');

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

// Server configuration
const servers = [
  {
    name: 'Backend',
    color: colors.cyan,
    port: 8789,
    command: 'npx',
    args: ['wrangler', 'dev', '--port', '8789'],
    healthCheck: () => checkHttpHealth('http://localhost:8789'),
    readyPattern: /Ready on/i,
    startupTime: 8000  // Backend takes longer to start
  },
  {
    name: 'PartyKit',
    color: colors.magenta,
    port: 1999,
    command: 'npx',
    args: ['partykit', 'dev', '--port', '1999'],
    healthCheck: () => checkPortOpen(1999),
    readyPattern: /Server listening/i,
    startupTime: 5000
  },
  {
    name: 'Frontend',
    color: colors.green,
    port: 5173,
    command: 'npm',
    args: ['run', 'dev'],
    healthCheck: () => checkHttpHealth('http://localhost:5173'),
    readyPattern: /Local:.*5173/i,
    startupTime: 5000
  }
];

let processes = [];
let shutdownInProgress = false;

/**
 * Print colored message
 */
function print(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Print server-prefixed message
 */
function printServer(serverName, message, color) {
  const prefix = `[${serverName.padEnd(10)}]`;
  console.log(color + prefix + colors.reset + ' ' + message);
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
 * Check if a port is open (server is listening)
 */
function checkPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

/**
 * Check if HTTP server is responding
 */
function checkHttpHealth(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.setTimeout(2000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for server to be healthy
 */
async function waitForHealth(server, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await server.healthCheck();
    if (healthy) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Pre-flight checks
 */
async function preFlightChecks() {
  print('\n' + colors.bright + 'Multi-Server Startup - Pre-flight Checks' + colors.reset);
  print(colors.dim + '━'.repeat(60) + colors.reset + '\n');

  let allAvailable = true;

  for (const server of servers) {
    const available = await isPortAvailable(server.port);

    if (available) {
      printServer(server.name, `Port ${server.port} available`, colors.green + '✓' + colors.reset);
    } else {
      printServer(server.name, `Port ${server.port} IN USE`, colors.red + '✗' + colors.reset);
      allAvailable = false;
    }
  }

  if (!allAvailable) {
    print('\n' + colors.red + 'Error: Some ports are already in use' + colors.reset);
    print(colors.yellow + 'Please free up the ports or update your .env.local with alternative ports' + colors.reset);
    print(colors.dim + 'See: docs/GETTING_STARTED.md#port-conflicts' + colors.reset + '\n');
    process.exit(1);
  }

  print('');
}

/**
 * Start a single server
 */
function startServer(server) {
  return new Promise((resolve, reject) => {
    printServer(server.name, 'Starting...', server.color);

    const proc = spawn(server.command, server.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    proc.serverName = server.name;
    proc.serverColor = server.color;
    processes.push(proc);

    let outputBuffer = '';
    let ready = false;

    // Handle stdout
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      outputBuffer += text;

      // Print output with server prefix
      text.split('\n').forEach(line => {
        if (line.trim()) {
          printServer(server.name, line, colors.dim);
        }
      });

      // Check if server is ready based on output pattern
      if (!ready && server.readyPattern && server.readyPattern.test(outputBuffer)) {
        ready = true;
        printServer(server.name, 'Output detected - checking health...', colors.yellow);
      }
    });

    // Handle stderr
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      text.split('\n').forEach(line => {
        if (line.trim()) {
          printServer(server.name, line, colors.dim);
        }
      });
    });

    // Handle process exit
    proc.on('exit', (code) => {
      if (!shutdownInProgress) {
        printServer(server.name, `Exited with code ${code}`, colors.red);
        if (!ready) {
          reject(new Error(`${server.name} failed to start`));
        }
      }
    });

    // Wait for startup time, then check health
    setTimeout(async () => {
      printServer(server.name, 'Checking health...', colors.yellow);

      const healthy = await waitForHealth(server, 30);

      if (healthy) {
        printServer(server.name, `Ready on port ${server.port}`, colors.green + '✓' + colors.reset);
        resolve();
      } else {
        printServer(server.name, 'Failed to become healthy', colors.red + '✗' + colors.reset);
        reject(new Error(`${server.name} health check failed`));
      }
    }, server.startupTime);
  });
}

/**
 * Start all servers
 */
async function startAllServers() {
  print(colors.bright + 'Starting all servers...' + colors.reset);
  print(colors.dim + '━'.repeat(60) + colors.reset + '\n');

  try {
    // Start all servers in parallel
    await Promise.all(servers.map(server => startServer(server)));

    print('\n' + colors.dim + '━'.repeat(60) + colors.reset);
    print(colors.green + colors.bright + '✓ All servers are ready!' + colors.reset + '\n');
    print(colors.bright + 'Application URLs:' + colors.reset);
    print(colors.cyan + '  Frontend:  ' + colors.reset + 'http://localhost:5173');
    print(colors.cyan + '  Backend:   ' + colors.reset + 'http://localhost:8789');
    print(colors.cyan + '  Real-time: ' + colors.reset + 'http://localhost:1999');
    print('');
    print(colors.dim + 'Press Ctrl+C to stop all servers' + colors.reset);
    print(colors.dim + '━'.repeat(60) + colors.reset + '\n');

  } catch (error) {
    print('\n' + colors.red + '✗ Server startup failed: ' + error.message + colors.reset);
    print(colors.yellow + 'Shutting down all servers...' + colors.reset + '\n');
    await shutdown();
    process.exit(1);
  }
}

/**
 * Shutdown all servers gracefully
 */
async function shutdown() {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  print('\n' + colors.yellow + 'Shutting down all servers...' + colors.reset + '\n');

  for (const proc of processes) {
    if (proc && !proc.killed) {
      printServer(proc.serverName, 'Stopping...', proc.serverColor);

      // Try graceful shutdown first
      proc.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  // Wait a bit for processes to exit
  await new Promise(resolve => setTimeout(resolve, 2000));

  print(colors.green + '✓ All servers stopped' + colors.reset + '\n');
}

/**
 * Handle Ctrl+C and other termination signals
 */
function setupSignalHandlers() {
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    print('\n' + colors.red + 'Uncaught error: ' + error.message + colors.reset);
    await shutdown();
    process.exit(1);
  });
}

/**
 * Main execution
 */
async function main() {
  print('\n' + colors.bright + colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  print(colors.bright + colors.cyan + '║                                                            ║' + colors.reset);
  print(colors.bright + colors.cyan + '║         Schema Minder - Multi-Server Start          ║' + colors.reset);
  print(colors.bright + colors.cyan + '║                                                            ║' + colors.reset);
  print(colors.bright + colors.cyan + '╚════════════════════════════════════════════════════════════╝' + colors.reset);

  setupSignalHandlers();

  await preFlightChecks();
  await startAllServers();

  // Keep process alive
  await new Promise(() => {});
}

// Run
main().catch(async (error) => {
  print('\n' + colors.red + 'Fatal error: ' + error.message + colors.reset);
  await shutdown();
  process.exit(1);
});
